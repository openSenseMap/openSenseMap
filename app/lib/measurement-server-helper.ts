import { desc, eq, inArray, or, type SQL, sql } from 'drizzle-orm'
import {
	deviceToLocation,
	type LastMeasurement,
	location,
	type Measurement,
	measurement,
	sensor,
} from '~/db/schema'
import { type DatabaseTransaction } from '~/db.server'
import { type MeasurementTiming } from '~/lib/measurement-timing.server'
import invariant from 'tiny-invariant'

export interface MeasurementWithLocation {
	sensor_id: string
	value: number
	createdAt?: Date
	location?: Location | null
}

export type Location = {
	lng: number
	lat: number
	height?: number
}

export type LocationWithId = Location & { id: bigint }

export type DeviceLocationUpdate = {
	location: Location
	time: Date
}

export type MinimalDevice = {
	id: string
	sensors: Array<{
		id: string
	}>
}

/**
 * Extracts location updates from measurements (with explicit locations)
 * @param measurements The measurements with potential location udpates
 * @returns The found location updates, sorted oldest first
 */
export function getLocationUpdates(
	measurements: MeasurementWithLocation[],
): DeviceLocationUpdate[] {
	return (
		measurements
			.filter((measurement) => measurement.location)
			.map((measurement) => {
				return {
					location: measurement.location as Location,
					time: new Date(measurement.createdAt || Date.now()),
				}
			})
			// Sort device location updates by time (oldest first) to process in order
			.sort((a, b) => a.time.getTime() - b.time.getTime())
	)
}

/**
 * Makes sure all locations for the location updates are in the database
 * @param locationUpdates The location updates from `getLocationUpdates`
 * @returns A map of the IDs of the locations for the location updates
 */
export async function findOrCreateLocations(
	locationUpdates: DeviceLocationUpdate[],
	tx: DatabaseTransaction,
): Promise<LocationWithId[]> {
	const newLocations = locationUpdates.map((update) => update.location)

	let foundLocations: LocationWithId[] = []

	const existingLocations = await tx
		.select({ id: location.id, location: location.location })
		.from(location)
		.where(
			or(
				...newLocations.map(
					(newLocation) =>
						sql`ST_EQUALS(
              ${location.location},
              ST_SetSRID(ST_MakePoint(${newLocation.lng}, ${newLocation.lat}), 4326)
            )`,
				),
			),
		)

	foundLocations = existingLocations.map((location) => {
		return {
			lng: location.location.x,
			lat: location.location.y,
			height: undefined,
			id: location.id,
		}
	})

	const toInsert = newLocations.filter(
		(newLocation) => !foundLocationsContain(foundLocations, newLocation),
	)
	const uniqueToInsert = toInsert.filter(
		(newLocation, index, arr) =>
			arr.findIndex(
				(candidate) =>
					candidate.lng === newLocation.lng &&
					candidate.lat === newLocation.lat,
			) === index,
	)

	const inserted =
		uniqueToInsert.length > 0
			? await tx
					.insert(location)
					.values(
						uniqueToInsert.map((newLocation) => {
							return {
								location: sql`ST_SetSRID(ST_MakePoint(${newLocation.lng}, ${newLocation.lat}), 4326)`,
							}
						}),
					)
					.onConflictDoNothing()
					.returning()
			: []

	inserted.forEach((value) =>
		foundLocations.push({
			lng: value.location.x,
			lat: value.location.y,
			height: undefined,
			id: value.id,
		}),
	)

	return foundLocations
}

export function foundLocationsContain(
	foundLocations: LocationWithId[],
	location: Location,
): boolean {
	return foundLocations.some((found) => foundLocationEquals(found, location))
}

export function foundLocationsGet(
	foundLocations: LocationWithId[],
	location: Location,
): bigint | undefined {
	return foundLocations.find((found) => foundLocationEquals(found, location))
		?.id
}

function foundLocationEquals(
	foundLocation: LocationWithId,
	location: Location,
): boolean {
	return (
		foundLocation.lat === location.lat && foundLocation.lng === location.lng
	)
}

/**
 * Filters the location updates to not add older updates than the newest already existing one,
 * then inserts the filtered location updates
 * @param deviceLocationUpdates The updates to add
 * @param deviceId The device ID the updates are referring to
 * @param locations The found locations with the IDs of the locations already in the database
 */
export async function addLocationUpdates(
	deviceLocationUpdates: DeviceLocationUpdate[],
	deviceId: string,
	locations: LocationWithId[],
	tx: DatabaseTransaction,
) {
	const filteredUpdates = await filterLocationUpdates(
		deviceLocationUpdates,
		deviceId,
		tx,
	)

	filteredUpdates
		.filter((update) => !foundLocationsContain(locations, update.location))
		.forEach((update) => {
			throw new Error(`Location ID for location ${update.location} not found,
        even though it should've been inserted`)
		})

	if (filteredUpdates.length > 0)
		await tx
			.insert(deviceToLocation)
			.values(
				filteredUpdates.map((update) => {
					return {
						deviceId: deviceId,
						locationId: foundLocationsGet(locations, update.location) as bigint,
						time: update.time,
					}
				}),
			)
			.onConflictDoNothing()
}

/**
 * Filters out location updates that don't need to be inserted because they're older than the latest update
 * @param deviceLocationUpdates The device location updates to filter through
 */
export async function filterLocationUpdates(
	deviceLocationUpdates: DeviceLocationUpdate[],
	deviceId: string,
	tx: DatabaseTransaction,
): Promise<DeviceLocationUpdate[]> {
	const currentLatestLocation = await tx
		.select({ time: deviceToLocation.time })
		.from(deviceToLocation)
		.where(eq(deviceToLocation.deviceId, deviceId))
		.orderBy(desc(deviceToLocation.time))
		.limit(1)

	return deviceLocationUpdates.filter(
		(update) =>
			currentLatestLocation.length === 0 ||
			update.time >= currentLatestLocation[0].time,
	)
}

/**
 * Inserts measurements with their evaluated locations (either from the explicit location, which is assumed to already be
 * in the location map), or from the last device location at the measurement time.
 * @param measurements The measurements to insert
 * @param locations The locations with the location IDs for the explicit locations
 * @param deviceId The devices ID for the measurements
 * @param tx The current transaction to run the insert SQLs in
 */
export async function insertMeasurementsWithLocation(
	measurements: MeasurementWithLocation[],
	locations: LocationWithId[],
	deviceId: string,
	tx: DatabaseTransaction,
	options: { shouldReturn?: boolean; timing?: MeasurementTiming | null } = {},
): Promise<Measurement[]> {
	const measuresWithLocationId = measurements.map((measurement) => {
		invariant(
			measurement.createdAt !== undefined,
			'Measurement must have a createdAt date',
		)
		return {
			sensorId: measurement.sensor_id,
			value: measurement.value,
			time: measurement.createdAt,
			locationId: measurement.location
				? foundLocationsGet(locations, measurement.location)
				: sql`(select ${deviceToLocation.locationId}
                from ${deviceToLocation}
                where ${deviceToLocation.deviceId} = ${deviceId}
                  and ${deviceToLocation.time} <= ${measurement.createdAt.toISOString()}
                order by ${deviceToLocation.time} desc
                limit 1)`,
		}
	})
	options?.timing?.mark('buildMeasurementInsertRows', {
		insertRowCount: measuresWithLocationId.length,
	})

	// Insert measurements with locationIds (may be null for measurements
	// without location and before any device location was set)
	if (measuresWithLocationId.length === 0) return []

	const insert = tx
		.insert(measurement)
		.values(measuresWithLocationId)
		.onConflictDoNothing()

	if (options.shouldReturn === false) {
		await insert
		return []
	}

	return await insert.returning()
}

/**
 * Updates the last measurement values for all given sensors
 * @param lastMeasurements The measurements to update, including the sensor keys as values
 * @param tx The current transaction to execute the update in
 */
export async function updateLastMeasurements(
	lastMeasurements: Record<string, NonNullable<LastMeasurement>>,
	tx: DatabaseTransaction,
	timing?: MeasurementTiming | null,
) {
	const sqlChunks: SQL[] = [
		sql`(case`,
		...Object.entries(lastMeasurements)
			.map(([sensorId, lastMeasurement]) => [
				sql`when ${sensor.id} = ${sensorId} then`,
				sql<LastMeasurement>`${JSON.stringify(lastMeasurement)}::json`,
			])
			.flat(),
		sql`end)`,
	]

	const finalSql: SQL = sql.join(sqlChunks, sql.raw(' '))
	timing?.mark('buildLastMeasurementUpdate', {
		updateSensorCount: Object.keys(lastMeasurements).length,
	})

	await tx
		.update(sensor)
		.set({ lastMeasurement: finalSql })
		.where(inArray(sensor.id, Object.keys(lastMeasurements)))
}

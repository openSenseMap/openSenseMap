import { asc, eq, inArray, or, sql } from 'drizzle-orm'
import { generateTestUserCredentials } from 'tests/data/generate_test_user'
import { createDevice, deleteDevice } from '~/db/models/device.server'
import {
	deleteMeasurementsForSensor,
	deleteMeasurementsForTime,
} from '~/db/models/measurement.server'
import { getSensors } from '~/db/models/sensor.server'
import { deleteUserByEmail } from '~/db/models/user.server'
import { deviceToLocation, location } from '~/db/schema'
import { type LastMeasurement, sensor, type Sensor } from '~/db/schema/sensor'
import { type User } from '~/db/schema/user'
import { drizzleClient } from '~/db.server'
import {
	addLocationUpdates,
	filterLocationUpdates,
	findOrCreateLocations,
	foundLocationsContain,
	foundLocationsGet,
	getLocationUpdates,
	insertMeasurementsWithLocation,
	type Location,
	type LocationWithId,
	updateLastMeasurements,
} from '~/lib/measurement-server-helper'
import { registerUser } from '~/services/user-service.server'

const DEVICE_SENSORS_ID_USER = generateTestUserCredentials()

const DEVICE_SENSOR_ID_BOX = {
	name: `${DEVICE_SENSORS_ID_USER}s Box`,
	exposure: 'outdoor',
	expiresAt: null,
	tags: [],
	latitude: 0,
	longitude: 0,
	//model: 'luftdaten.info',
	mqttEnabled: false,
	ttnEnabled: false,
	sensors: [
		{
			title: 'Temp',
			unit: '°C',
			sensorType: 'dummy',
		},
		{
			title: 'CO2',
			unit: 'mol/L',
			sensorType: 'dummy',
		},
		{
			title: 'Air Pressure',
			unit: 'kPa',
			sensorType: 'dummy',
		},
	],
}
const locations: LocationWithId[] = [
	{
		lng: 1,
		lat: 2,
		height: 3,
		id: BigInt(4),
	},
	{
		lng: 5,
		lat: 6,
		id: BigInt(7),
	},
]

const containedLocation: Location = {
	lng: 1,
	lat: 2,
	height: 4,
}

const otherContainedLocation: Location = {
	lng: 5,
	lat: 6,
}

const notContainedLocation: Location = {
	lng: 1,
	lat: 3,
}

describe('measurement server helper', () => {
	let device
	let deviceId: string = ''
	let sensors: Sensor[]

	let foundOrCreatedLocations: LocationWithId[]
	let locationIds: bigint[] = []

	const MEASUREMENTS = [
		{
			value: 3.14159,
			createdAt: new Date('1988-03-14 1:59:26+00'),
			sensor_id: '',
			location: {
				lng: -180,
				lat: -90,
			},
		},
		{
			value: 1589625,
			createdAt: new Date('1954-06-07 12:00:00+00'),
			sensor_id: '',
			location: {
				lng: 90,
				lat: 45,
				height: 3.123,
			},
		},
		{
			value: 0,
			createdAt: new Date('2000-05-25 11:11:11+00'),
			sensor_id: '',
		},
	]

	beforeAll(async () => {
		const registration = await registerUser(
			DEVICE_SENSORS_ID_USER.name,
			DEVICE_SENSORS_ID_USER.email,
			DEVICE_SENSORS_ID_USER.password,
			'en_US',
			true,
		)

		expect(registration.ok).toBe(true)

		if (!registration.ok) {
			throw new Error(
				`Test setup failed: ${registration.field} -> ${registration.code}`,
			)
		}

		const user = registration.user

		device = await createDevice(DEVICE_SENSOR_ID_BOX, (user as User).id)
		deviceId = device.id
		sensors = await getSensors(deviceId)

		MEASUREMENTS.forEach((meas) => (meas.sensor_id = sensors[0].id))
	})

	it('should get location updates', async () => {
		const result = getLocationUpdates(MEASUREMENTS)

		// Check filtering
		expect(result).toHaveLength(2)

		// Check ordering
		expect(result[0].time).toEqual(new Date('1954-06-07 12:00:00+00'))
		expect(result[1].time).toEqual(new Date('1988-03-14 1:59:26+00'))
	})

	it('should find or create locations', async () => {
		// Create one location to already exist
		const inserted = await drizzleClient
			.insert(location)
			.values({
				location: sql`ST_SetSRID(ST_MakePoint(${90}, ${45}), 4326)`,
			})
			.returning()

		expect(inserted).toHaveLength(1)
		const insertedId = inserted[0].id
		locationIds.push(insertedId)

		// Call function
		const result = await drizzleClient.transaction((tx) =>
			findOrCreateLocations(getLocationUpdates(MEASUREMENTS), tx),
		)
		foundOrCreatedLocations = result

		// Check locations
		expect(result).toHaveLength(2)
		expect(
			result.some((location) => location.lng == -180 && location.lat == -90),
		).toBeTruthy()
		expect(
			result.some((location) => location.lng == 90 && location.lat == 45),
		).toBeTruthy()

		// Check that location isn't inserted twice
		expect(
			result.find((location) => location.lng == 90 && location.lat == 45)?.id,
		).toBe(insertedId)

		// Check that locations are actually inserted
		const otherId = result.find(
			(location) => location.lng == -180 && location.lat == -90,
		)?.id as bigint
		locationIds.push(otherId)
		const databaseEntry = await drizzleClient
			.select()
			.from(location)
			.where(eq(location.id, otherId))

		expect(databaseEntry).toHaveLength(1)
		expect(databaseEntry[0].location.x).toBe(-180)
		expect(databaseEntry[0].location.y).toBe(-90)
	})

	it('should identify if found locations contain', () => {
		const result1 = foundLocationsContain(locations, containedLocation)
		const result2 = foundLocationsContain(locations, otherContainedLocation)
		const result3 = foundLocationsContain(locations, notContainedLocation)

		expect(result1).toBeTruthy()
		expect(result2).toBeTruthy()
		expect(result3).toBeFalsy()
	})

	it('should get found locations', () => {
		const result1 = foundLocationsGet(locations, containedLocation)
		const result2 = foundLocationsGet(locations, otherContainedLocation)
		const result3 = foundLocationsGet(locations, notContainedLocation)

		expect(result1).toBe(BigInt(4))
		expect(result2).toBe(BigInt(7))
		expect(result3).toBeUndefined()
	})

	it('should filter location updates', async () => {
		// Add one location update so that the oldest one gets filtered out
		await drizzleClient.insert(deviceToLocation).values({
			deviceId: deviceId,
			locationId: locationIds[0],
			time: new Date('1970-01-01'),
		})

		await drizzleClient.transaction(async (tx) => {
			const result = await filterLocationUpdates(
				getLocationUpdates(MEASUREMENTS),
				deviceId,
				tx,
			)

			expect(result).toHaveLength(1)
			// The filtered udpates should only include the newer one
			expect(result[0].time).toEqual(new Date('1988-03-14 1:59:26+00'))
		})
	})

	it('should add location updates', async () => {
		await drizzleClient.transaction((tx) =>
			addLocationUpdates(
				getLocationUpdates(MEASUREMENTS),
				deviceId,
				foundOrCreatedLocations,
				tx,
			),
		)

		const inserted = await drizzleClient
			.select()
			.from(deviceToLocation)
			.where(eq(deviceToLocation.deviceId, deviceId))
			.orderBy(asc(deviceToLocation.time))

		// One location update was already added in the previous test,
		// one more should have been added by the tested function
		expect(inserted).toHaveLength(2)
		expect(inserted[1].locationId).toBe(locationIds[1])
		expect(inserted[1].time).toEqual(new Date('1988-03-14 1:59:26+00'))
	})

	it('should inserted measurements with location', async () => {
		await drizzleClient.transaction(async (tx) => {
			const result = await insertMeasurementsWithLocation(
				MEASUREMENTS,
				foundOrCreatedLocations,
				deviceId,
				tx,
			)

			// All 3 should have been inserted
			expect(result).toHaveLength(3)

			// Location IDs should have been fetched
			// The locationIds[1] is what was inserted in a previous test
			expect(result[0].locationId).toBe(locationIds[1])
			// The locationIds[0] is what was created beforehand for test reasons
			expect(result[1].locationId).toBe(locationIds[0])
			// The last measurement didn't have a location,
			// the latest location ID is what was created by the previous test
			expect(result[2].locationId).toBe(locationIds[1])

			// The other values should be as expected
			expect(result[0].sensorId).toBe(sensors[0].id)
			expect(result[1].sensorId).toBe(sensors[0].id)
			expect(result[2].sensorId).toBe(sensors[0].id)
			expect(result[0].time).toEqual(new Date('1988-03-14 1:59:26+00'))
			expect(result[1].time).toEqual(new Date('1954-06-07 12:00:00+00'))
			expect(result[2].time).toEqual(new Date('2000-05-25 11:11:11+00'))
			expect(result[0].value).toBe(3.14159)
			expect(result[1].value).toBe(1589625)
			expect(result[2].value).toBe(0)
		})
	})

	it('should update last measurements', async () => {
		const lastMeasurements: Record<string, NonNullable<LastMeasurement>> = {}
		// This is true
		lastMeasurements[sensors[0].id] = {
			value: 0,
			createdAt: new Date('2000-05-25 11:11:11+00').toISOString(),
			sensorId: sensors[0].id,
		}
		// This is made up, but should (currently) still work
		lastMeasurements[sensors[1].id] = {
			value: 42,
			createdAt: new Date('1954-06-07 12:00:00+00').toISOString(),
			sensorId: sensors[1].id,
		}

		await drizzleClient.transaction(async (tx) => {
			await updateLastMeasurements(lastMeasurements, tx)
		})

		const results = await drizzleClient
			.select()
			.from(sensor)
			.where(inArray(sensor.id, [sensors[0].id, sensors[1].id]))

		expect(results).toHaveLength(2)
		expect(
			results.find((sensor) => sensor.id == sensors[0].id)?.lastMeasurement,
		).toEqual(lastMeasurements[sensors[0].id])
		expect(
			results.find((sensor) => sensor.id == sensors[1].id)?.lastMeasurement,
		).toEqual(lastMeasurements[sensors[1].id])
	})

	afterAll(async () => {
		//delete measurements
		await deleteMeasurementsForSensor(sensors[0].id)
		MEASUREMENTS.forEach(
			async (measurement) =>
				await deleteMeasurementsForTime(measurement.createdAt),
		)
		// delete the valid test user
		await deleteUserByEmail(DEVICE_SENSORS_ID_USER.email)
		// delete the box
		await deleteDevice({ id: deviceId })
		// delete created locations
		await deleteLocations()
	})

	async function deleteLocations() {
		await drizzleClient.delete(location).where(
			or(
				...MEASUREMENTS.filter((measurement) => measurement.location).map(
					(measurement) =>
						sql`ST_EQUALS(
            ${location.location},
            ST_SetSRID(ST_MakePoint(${measurement.location?.lng}, ${measurement.location?.lat}), 4326)
          )`,
				),
			),
		)
	}
})

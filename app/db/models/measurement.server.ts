import { and, desc, eq, gt, gte, inArray, lt, lte, sql } from 'drizzle-orm'
import { ArchivedDeviceError } from './device.server'
import {
	type LastMeasurement,
	location,
	measurement,
	measurements10minView,
	measurements1dayView,
	measurements1hourView,
	measurements1monthView,
	measurements1yearView,
	device,
} from '~/db/schema'
import { drizzleClient, type DatabaseTransaction } from '~/db.server'
import {
	type MinimalDevice,
	type MeasurementWithLocation,
	type LocationWithId,
	getLocationUpdates,
	findOrCreateLocations,
	addLocationUpdates,
	insertMeasurementsWithLocation,
	updateLastMeasurements,
} from '~/lib/measurement-server-helper'
import { type MeasurementTiming } from '~/lib/measurement-timing.server'

// This function retrieves measurements from the database based on the provided parameters.
export function getMeasurement(
	sensorId: string,
	aggregation: string,
	startDate?: Date,
	endDate?: Date,
) {
	// If both start date and end date are provided, filter measurements within the specified time range.
	if (startDate && endDate) {
		// Check the aggregation level for measurements and fetch accordingly.
		if (aggregation === '10m') {
			return drizzleClient
				.select()
				.from(measurements10minView)
				.where(
					and(
						eq(measurements10minView.sensorId, sensorId),
						gte(measurements10minView.time, startDate),
						lte(measurements10minView.time, endDate),
					),
				)
				.orderBy(desc(measurements10minView.time))
		} else if (aggregation === '1h') {
			return drizzleClient
				.select()
				.from(measurements1hourView)
				.where(
					and(
						eq(measurements1hourView.sensorId, sensorId),
						gte(measurements1hourView.time, startDate),
						lte(measurements1hourView.time, endDate),
					),
				)
				.orderBy(desc(measurements1hourView.time))
		} else if (aggregation === '1d') {
			return drizzleClient
				.select()
				.from(measurements1dayView)
				.where(
					and(
						eq(measurements1dayView.sensorId, sensorId),
						gte(measurements1dayView.time, startDate),
						lte(measurements1dayView.time, endDate),
					),
				)
				.orderBy(desc(measurements1dayView.time))
		} else if (aggregation === '1m') {
			return drizzleClient
				.select()
				.from(measurements1monthView)
				.where(
					and(
						eq(measurements1monthView.sensorId, sensorId),
						gte(measurements1monthView.time, startDate),
						lte(measurements1monthView.time, endDate),
					),
				)
				.orderBy(desc(measurements1monthView.time))
		} else if (aggregation === '1y') {
			return drizzleClient
				.select()
				.from(measurements1yearView)
				.where(
					and(
						eq(measurements1yearView.sensorId, sensorId),
						gte(measurements1yearView.time, startDate),
						lte(measurements1yearView.time, endDate),
					),
				)
				.orderBy(desc(measurements1yearView.time))
		}
		// If aggregation is not specified or different from "15m" and "1d", fetch default measurements.
		return drizzleClient.query.measurement.findMany({
			where: (measurement, { eq, gte, lte }) =>
				and(
					eq(measurement.sensorId, sensorId),
					gte(measurement.time, startDate),
					lte(measurement.time, endDate),
				),
			orderBy: [desc(measurement.time)],
			with: {
				location: {
					// https://github.com/drizzle-team/drizzle-orm/pull/2778
					// with: {
					//   geometry: true
					// },
					columns: {
						id: true,
					},
					extras: {
						x: sql<number>`ST_X(${location.location})`.as('x'),
						y: sql<number>`ST_Y(${location.location})`.as('y'),
					},
				},
			},
		})
	}

	// If only aggregation is provided, fetch measurements without considering time range.
	if (aggregation === '10m') {
		return drizzleClient
			.select()
			.from(measurements10minView)
			.where(eq(measurements10minView.sensorId, sensorId))
			.orderBy(desc(measurements10minView.time))
	} else if (aggregation === '1h') {
		return drizzleClient
			.select()
			.from(measurements1hourView)
			.where(eq(measurements1hourView.sensorId, sensorId))
			.orderBy(desc(measurements1hourView.time))
	} else if (aggregation === '1d') {
		return drizzleClient
			.select()
			.from(measurements1dayView)
			.where(eq(measurements1dayView.sensorId, sensorId))
			.orderBy(desc(measurements1dayView.time))
	} else if (aggregation === '1m') {
		return drizzleClient
			.select()
			.from(measurements1monthView)
			.where(eq(measurements1monthView.sensorId, sensorId))
			.orderBy(desc(measurements1monthView.time))
	} else if (aggregation === '1y') {
		return drizzleClient
			.select()
			.from(measurements1yearView)
			.where(eq(measurements1yearView.sensorId, sensorId))
			.orderBy(desc(measurements1yearView.time))
	}

	// If neither start date nor aggregation are specified, fetch default measurements with a limit of 20000.
	return drizzleClient.query.measurement.findMany({
		where: (measurement, { eq }) => eq(measurement.sensorId, sensorId),
		orderBy: [desc(measurement.time)],
		with: {
			location: {
				// https://github.com/drizzle-team/drizzle-orm/pull/2778
				// with: {
				//   geometry: true
				// },
				columns: {
					id: true,
				},
				extras: {
					x: sql<number>`ST_X(${location.location})`.as('x'),
					y: sql<number>`ST_Y(${location.location})`.as('y'),
				},
			},
		},
		limit: 3600, // 60 measurements per hour * 24 hours * 2.5 days
	})
}

export async function saveMeasurements(
	minimalDevice: MinimalDevice,
	measurements: MeasurementWithLocation[],
	timing?: MeasurementTiming | null,
): Promise<void> {
	if (!device) throw new Error('No device given!')
	if (!Array.isArray(measurements)) throw new Error('Array expected')

	const sensorIds = new Set(minimalDevice.sensors.map((s: any) => s.id))
	const lastMeasurements: Record<string, NonNullable<LastMeasurement>> = {}
	const now = new Date()
	const maxFutureTime = 30 * 1000
	timing?.mark('savePrepare')

	for (let i = measurements.length - 1; i >= 0; i--) {
		const m = measurements[i]

		if (!sensorIds.has(m.sensor_id)) {
			const error = new Error(
				`Measurement for sensor with id ${m.sensor_id} does not belong to box`,
			)
			error.name = 'ModelError'
			throw error
		}

		const measurementTime = new Date(m.createdAt || now)

		if (measurementTime.getTime() > now.getTime() + maxFutureTime) {
			const error = new Error(
				`Measurement timestamp is too far in the future: ${measurementTime.toISOString()}`,
			)
			error.name = 'ModelError'
			;(error as any).type = 'UnprocessableEntityError'
			throw error
		}
		m.createdAt = measurementTime

		if (
			!lastMeasurements[m.sensor_id] ||
			lastMeasurements[m.sensor_id].createdAt < measurementTime.toISOString()
		) {
			lastMeasurements[m.sensor_id] = {
				value: m.value,
				createdAt: measurementTime.toISOString(),
				sensorId: m.sensor_id,
			}
		}
	}
	timing?.mark('validateMeasurements', {
		measurementCount: measurements.length,
		lastMeasurementCount: Object.keys(lastMeasurements).length,
	})

	const deviceLocationUpdates = getLocationUpdates(measurements)
	timing?.mark('collectLocationUpdates', {
		locationUpdateCount: deviceLocationUpdates.length,
	})

	// Run location writes as individual statements before opening the measurement
	// transaction, so their locks are released before TimescaleDB creates chunks.
	let locations: LocationWithId[] = []
	if (deviceLocationUpdates.length > 0) {
		await ensureDeviceCanReceiveMeasurements(drizzleClient, minimalDevice.id)
		timing?.mark('locationDeviceLookup')

		locations = await findOrCreateLocations(
			deviceLocationUpdates,
			drizzleClient,
		)
		timing?.mark('findOrCreateLocations', {
			locationCount: locations.length,
		})

		await addLocationUpdates(
			deviceLocationUpdates,
			minimalDevice.id,
			locations,
			drizzleClient,
		)
		timing?.mark('addLocationUpdates')
	}

	await drizzleClient.transaction(async (tx) => {
		await ensureDeviceCanReceiveMeasurements(tx, minimalDevice.id)
		timing?.mark('transactionDeviceLookup')

		await insertMeasurementsWithLocation(
			measurements,
			locations,
			minimalDevice.id,
			tx,
			{ shouldReturn: false, timing: timing },
		)
		timing?.mark('insertMeasurements')
		await updateLastMeasurements(lastMeasurements, tx, timing)
		timing?.mark('updateLastMeasurements')
	})
	timing?.mark('transaction')
}

async function ensureDeviceCanReceiveMeasurements(
	db: Pick<DatabaseTransaction, 'select'>,
	deviceId: string,
): Promise<void> {
	const [currentDevice] = await db
		.select({
			id: device.id,
			archivedAt: device.archivedAt,
		})
		.from(device)
		.where(eq(device.id, deviceId))
		.limit(1)

	if (!currentDevice) {
		const error = new Error('Device not found')
		error.name = 'NotFoundError'
		throw error
	}

	if (currentDevice.archivedAt) {
		throw new ArchivedDeviceError(currentDevice.id)
	}
}

export async function insertMeasurements(measurements: any[]): Promise<void> {
	const measurementInserts = measurements.map((measurement) => ({
		sensorId: measurement.sensor_id,
		value: measurement.value,
		time: measurement.createdAt || new Date(),
	}))

	await drizzleClient.insert(measurement).values(measurementInserts)
}

export async function deleteMeasurementsForSensor(sensorId: string) {
	return await drizzleClient
		.delete(measurement)
		.where(eq(measurement.sensorId, sensorId))
}

export async function deleteSensorMeasurementsForTimes(
	sensorId: string,
	dates: Date[],
) {
	return await drizzleClient
		.delete(measurement)
		.where(
			and(eq(measurement.sensorId, sensorId), inArray(measurement.time, dates)),
		)
}

export async function deleteSensorMeasurementsForTimeRange(
	sensorId: string,
	greaterThan: Date,
	lessThan: Date,
) {
	return await drizzleClient
		.delete(measurement)
		.where(
			and(
				eq(measurement.sensorId, sensorId),
				and(gt(measurement.time, greaterThan), lt(measurement.time, lessThan)),
			),
		)
}

export async function deleteMeasurementsForTime(date: Date) {
	return await drizzleClient
		.delete(measurement)
		.where(eq(measurement.time, date))
}

export async function getMeasurementsCount() {
	return await drizzleClient.$count(measurement)
}

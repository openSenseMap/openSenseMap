import { and, sql, eq, desc, gte, lte } from 'drizzle-orm'
import {
	measurement,
	location,
	measurements10minView,
	measurements1dayView,
	measurements1hourView,
	measurements1monthView,
	measurements1yearView,
} from '~/db/schema'
import { drizzleClient } from '~/db.server'

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
						heightAboveGround: true,
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
					heightAboveGround: true,
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

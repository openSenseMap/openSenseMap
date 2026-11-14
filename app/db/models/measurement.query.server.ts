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

export const MAX_CHART_MEASUREMENTS_PER_SENSOR = 3600

export function getChartMeasurement(
	sensorId: string,
	aggregation: string,
	startDate?: Date,
	endDate?: Date,
) {
	// Fetch one extra row so the graph can distinguish a complete result from
	// a range that needs a coarser aggregation without loading the full range.
	return getMeasurement(
		sensorId,
		aggregation,
		startDate,
		endDate,
		MAX_CHART_MEASUREMENTS_PER_SENSOR + 1,
	)
}

// This function retrieves measurements from the database based on the provided parameters.
export function getMeasurement(
	sensorId: string,
	aggregation: string,
	startDate?: Date,
	endDate?: Date,
	rowLimit?: number,
) {
	// If both start date and end date are provided, filter measurements within the specified time range.
	if (startDate && endDate) {
		// Check the aggregation level for measurements and fetch accordingly.
		if (aggregation === '10m') {
			const query = drizzleClient
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
			return rowLimit ? query.limit(rowLimit) : query
		} else if (aggregation === '1h') {
			const query = drizzleClient
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
			return rowLimit ? query.limit(rowLimit) : query
		} else if (aggregation === '1d') {
			const query = drizzleClient
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
			return rowLimit ? query.limit(rowLimit) : query
		} else if (aggregation === '1m') {
			const query = drizzleClient
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
			return rowLimit ? query.limit(rowLimit) : query
		} else if (aggregation === '1y') {
			const query = drizzleClient
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
			return rowLimit ? query.limit(rowLimit) : query
		}
		// Use raw measurements for the selected time range.
		return drizzleClient.query.measurement.findMany({
			where: (measurement, { eq, gte, lte }) =>
				and(
					eq(measurement.sensorId, sensorId),
					gte(measurement.time, startDate),
					lte(measurement.time, endDate),
				),
			orderBy: [desc(measurement.time)],
			limit: rowLimit,
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
		const query = drizzleClient
			.select()
			.from(measurements10minView)
			.where(eq(measurements10minView.sensorId, sensorId))
			.orderBy(desc(measurements10minView.time))
		return rowLimit ? query.limit(rowLimit) : query
	} else if (aggregation === '1h') {
		const query = drizzleClient
			.select()
			.from(measurements1hourView)
			.where(eq(measurements1hourView.sensorId, sensorId))
			.orderBy(desc(measurements1hourView.time))
		return rowLimit ? query.limit(rowLimit) : query
	} else if (aggregation === '1d') {
		const query = drizzleClient
			.select()
			.from(measurements1dayView)
			.where(eq(measurements1dayView.sensorId, sensorId))
			.orderBy(desc(measurements1dayView.time))
		return rowLimit ? query.limit(rowLimit) : query
	} else if (aggregation === '1m') {
		const query = drizzleClient
			.select()
			.from(measurements1monthView)
			.where(eq(measurements1monthView.sensorId, sensorId))
			.orderBy(desc(measurements1monthView.time))
		return rowLimit ? query.limit(rowLimit) : query
	} else if (aggregation === '1y') {
		const query = drizzleClient
			.select()
			.from(measurements1yearView)
			.where(eq(measurements1yearView.sensorId, sensorId))
			.orderBy(desc(measurements1yearView.time))
		return rowLimit ? query.limit(rowLimit) : query
	}

	// By default, show only the latest 3,600 raw measurements.
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
		limit: rowLimit ?? 3600, // 60 measurements per hour * 24 hours * 2.5 days
	})
}

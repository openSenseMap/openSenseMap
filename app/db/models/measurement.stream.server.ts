import { pg } from '~/db.server'

export const MEASUREMENT_EXPORT_AGGREGATIONS = [
	'raw',
	'10m',
	'1h',
	'1d',
	'1m',
	'1y',
] as const

export type MeasurementExportAggregation =
	(typeof MEASUREMENT_EXPORT_AGGREGATIONS)[number]

export type MeasurementExportRow = {
	sensor_id: string
	time: Date | string
	value: number | null
	latitude: number | null
	longitude: number | null
}

type MeasurementExportStreamOptions = {
	sensorIds: string[]
	aggregation: MeasurementExportAggregation
	fromDate?: Date
	toDate?: Date
	includeCoordinates: boolean
	batchSize?: number
}

const AGGREGATION_SOURCES: Record<
	Exclude<MeasurementExportAggregation, 'raw'>,
	string
> = {
	'10m': 'measurement_10min',
	'1h': 'measurement_1hour',
	'1d': 'measurement_1day',
	'1m': 'measurement_1month',
	'1y': 'measurement_1year',
}

/**
 * Stream a multi-sensor export through one database cursor.
 *
 * Sensor IDs are expanded with ordinality so the result stays grouped in the
 * caller's order. This lets JSON exports retain their historic nested
 * per-sensor shape without buffering all measurements. For raw exports without
 * an explicit time range, the lateral query preserves the previous limit of the
 * latest 3,600 measurements per sensor. Aggregate exports keep their previous
 * all-history behaviour when no dates are supplied.
 */
export async function* streamMeasurementExportRows({
	sensorIds,
	aggregation,
	fromDate,
	toDate,
	includeCoordinates,
	batchSize = 1000,
}: MeasurementExportStreamOptions): AsyncGenerator<MeasurementExportRow[]> {
	if (sensorIds.length === 0) return

	const isRaw = aggregation === 'raw'
	const source = isRaw ? 'measurement' : AGGREGATION_SOURCES[aggregation]
	const valueColumn = isRaw ? 'value' : 'avg_value'
	const hasDateRange = fromDate !== undefined && toDate !== undefined
	const values: unknown[] = [sensorIds]

	let dateCondition = ''
	if (hasDateRange) {
		values.push(fromDate.toISOString(), toDate.toISOString())
		dateCondition = 'AND source.time >= $2 AND source.time < $3'
	}

	const locationIdColumn = isRaw
		? 'source.location_id'
		: 'NULL::bigint AS location_id'
	const locationColumns =
		includeCoordinates && isRaw
			? 'ST_Y(location.location) AS latitude, ST_X(location.location) AS longitude'
			: 'NULL::double precision AS latitude, NULL::double precision AS longitude'
	const locationJoin =
		includeCoordinates && isRaw
			? 'LEFT JOIN location ON measurement_row.location_id = location.id'
			: ''
	const rawDefaultLimit = isRaw && !hasDateRange ? 'LIMIT 3600' : ''

	// Table and column names are selected exclusively from the allowlist above.
	// All request-derived values remain parameterized.
	const sqlQuery = `
		SELECT
			measurement_row.sensor_id,
			measurement_row.time,
			measurement_row.value,
			${locationColumns}
		FROM unnest($1::text[]) WITH ORDINALITY AS requested(sensor_id, position)
		CROSS JOIN LATERAL (
			SELECT
				source.sensor_id,
				source.time,
				source.${valueColumn} AS value,
				${locationIdColumn}
			FROM ${source} AS source
			WHERE source.sensor_id = requested.sensor_id
				${dateCondition}
			ORDER BY source.time DESC
			${rawDefaultLimit}
		) AS measurement_row
		${locationJoin}
		ORDER BY requested.position, measurement_row.time DESC
	`

	const cursor = pg.unsafe(sqlQuery, values).cursor(batchSize)

	for await (const rows of cursor) {
		yield rows as unknown as MeasurementExportRow[]
	}
}

/**
 * Stream measurements in batches from Postgres
 * @param sensorIds list of sensor IDs
 * @param fromDate start of date range
 * @param toDate end of date range
 * @param bbox optional bounding box [lngSW, latSW, lngNE, latNE]
 * @param batchSize number of rows per batch
 */
export async function* streamMeasurements(
	sensorIds: string[],
	fromDate: Date,
	toDate: Date,
	bbox?: any,
	batchSize = 1000,
) {
	// Build parameterized query values array preventing sql injections
	const values: any[] = [
		sensorIds, // $1 - array of sensor IDs
		fromDate instanceof Date ? fromDate.toISOString() : fromDate, // $2 - start date as ISO string
		toDate instanceof Date ? toDate.toISOString() : toDate, // $3 - end date as ISO string
	]

	// check if sensor_id is in the array and filter by date range
	let conditions = `m.sensor_id = ANY($1::text[]) AND m.time BETWEEN $2 AND $3`

	if (bbox) {
		const [lngSW, latSW, lngNE, latNE] = bbox
		values.push(lngSW, latSW, lngNE, latNE)
		const idx = values.length - 4 // start index of bbox params in values (0-based -> $n numbering)
		// NOTE: pg placeholders are 1-based, so use idx + 1 .. idx + 4
		conditions += ` AND (
		m.location_id IS NULL OR
		ST_Contains(
		  ST_MakeEnvelope($${idx + 1}::double precision, $${idx + 2}::double precision, $${idx + 3}::double precision, $${idx + 4}::double precision, 4326),
		  l.location
		)
	  )`
	}

	const sqlQuery = `
	  SELECT 
		m.sensor_id,
		m.time,
		m.value,
		l.location,
		m.location_id
	  FROM measurement m
	  LEFT JOIN location l ON m.location_id = l.id
	  WHERE ${conditions}
	  ORDER BY m.time ASC
	`

	const cursor = pg.unsafe(sqlQuery, values).cursor(batchSize)

	for await (const rows of cursor) {
		yield rows
	}
}

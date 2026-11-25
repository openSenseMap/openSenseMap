import { pg } from '~/db.server'

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

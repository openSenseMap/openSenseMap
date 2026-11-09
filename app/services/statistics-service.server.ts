import { and, count, gt, lt, sql } from 'drizzle-orm'
import { measurement } from '~/db/schema'
import { drizzleClient } from '~/db.server'


const getApproximateRowCount = async (tableName: string) => {
	const [count] = await drizzleClient.execute(
		sql`SELECT * FROM approximate_row_count(${tableName});`,
	)

	return Number(count.approximate_row_count)
}

export const getApproximateMeasurementCount = () =>
	getApproximateRowCount('measurement')

/**
 *
 * @param humanReadable
 */
export const getStatistics = async (humanReadable: boolean = false) => {
	const rowCountTimeBucket = async (
		table: any, // Ideally, this should be the actual table type, but TypeScript can't infer it generically
		timeColumn: any,
		intervalMillis: number,
	) => {
		const result = await drizzleClient
			.select({ count: count() })
			.from(table)
			.where(
				and(
					gt(table[timeColumn], new Date(Date.now() - intervalMillis)),
					lt(table[timeColumn], new Date()),
				),
			)
		const [rowCount] = result
		return Number(rowCount.count)
	}

	const results = await Promise.all([
		getApproximateRowCount('device'),
		getApproximateMeasurementCount(),
		rowCountTimeBucket(measurement, 'time', 60000),
	])

	if (humanReadable) {
		const format = new Intl.NumberFormat(undefined, { notation: 'compact' })
		return results.map((r) => format.format(r))
	}
	return results
}

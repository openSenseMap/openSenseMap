import { isNotNull, isNull, ne, and, asc, eq, sql } from 'drizzle-orm'
import { drizzleClient } from '~/db.server'
import {
	PHENOMENON_FUZZY_MATCH_THRESHOLD,
	getFuzzySensorWikiPhenomenonMatch,
	getCanonicalSensorWikiPhenomenon,
	getSensorWikiPhenomenonFilterValue,
	getSensorWikiPhenomenonLabel,
	getTitlePhenomenonFilterValue,
	type PhenomenonFilterOption,
} from '~/lib/phenomenon-filter'
import { type SensorWikiTranslation } from '~/lib/sensor-wiki'
import { sensorWikiAliasEntries } from '~/lib/device-schemas/sensor-wiki-alias-catalog'
import { device, sensor } from '../schema'

export type Phenomenon = {
	id: number
	slug: string
	markdown: SensorWikiTranslation
	label: SensorWikiTranslation
	description: SensorWikiTranslation
}

const MIN_FALLBACK_PHENOMENON_COUNT = 3
const MAX_FALLBACK_PHENOMENA = 50

/**
 * Queries the database for a distinct list of phenomena known to the
 * application across all non-archived devices. Known aliases are grouped under
 * their canonical Sensor-Wiki phenomenon; frequent unmapped titles are shown as
 * "Other" options when they are not likely variants of a canonical phenomenon.
 */
export const getPhenomena = async function findPhenomena(): Promise<
	PhenomenonFilterOption[]
> {
	const rows = await drizzleClient
		.select({
			title: sensor.title,
			unit: sensor.unit,
			sensorType: sensor.sensorType,
			sensorWikiPhenomenon: sensor.sensorWikiPhenomenon,
			count: sql<number>`count(*)::int`,
		})
		.from(sensor)
		.innerJoin(device, eq(sensor.deviceId, device.id))
		.where(
			and(
				isNull(device.archivedAt),
				isNotNull(sensor.title),
				ne(sensor.title, ''),
			),
		)
		.groupBy(
			sensor.title,
			sensor.unit,
			sensor.sensorType,
			sensor.sensorWikiPhenomenon,
		)
		.orderBy(asc(sensor.title))

	const optionsByValue = new Map<string, PhenomenonFilterOption>()
	const fallbackOptionsByValue = new Map<
		string,
		PhenomenonFilterOption & { count: number }
	>()

	for (const row of rows) {
		const canonicalPhenomenon =
			getCanonicalSensorWikiPhenomenon(row, sensorWikiAliasEntries) ??
			getFuzzySensorWikiPhenomenonMatch(
				row,
				sensorWikiAliasEntries,
				PHENOMENON_FUZZY_MATCH_THRESHOLD,
			)?.sensorWikiPhenomenon

		if (canonicalPhenomenon) {
			const value = getSensorWikiPhenomenonFilterValue(canonicalPhenomenon)
			const option = optionsByValue.get(value) ?? {
				value,
				label: getSensorWikiPhenomenonLabel(
					canonicalPhenomenon,
					sensorWikiAliasEntries,
				),
				source: 'sensor-wiki',
				aliases: [],
			}

			if (row.title && !option.aliases.includes(row.title)) {
				option.aliases.push(row.title)
			}

			option.description = option.aliases.slice(0, 4).join(', ')
			optionsByValue.set(value, option)
			continue
		}

		if (row.count < MIN_FALLBACK_PHENOMENON_COUNT) continue

		const value = getTitlePhenomenonFilterValue(row.title)
		const existingFallback = fallbackOptionsByValue.get(value)

		if (existingFallback) {
			existingFallback.count += row.count
			existingFallback.description = `${existingFallback.count} sensors`
			continue
		}

		fallbackOptionsByValue.set(value, {
			value,
			label: `Other: ${row.title}`,
			description: `${row.count} sensors`,
			source: 'title',
			aliases: [row.title],
			count: row.count,
		})
	}

	const canonicalOptions = [...optionsByValue.values()].sort((left, right) =>
		left.label.localeCompare(right.label),
	)
	const limitedFallbackOptions = [...fallbackOptionsByValue.values()]
		.sort(
			(left, right) =>
				right.count - left.count || left.label.localeCompare(right.label),
		)
		.slice(0, MAX_FALLBACK_PHENOMENA)

	return [...canonicalOptions, ...limitedFallbackOptions]
}

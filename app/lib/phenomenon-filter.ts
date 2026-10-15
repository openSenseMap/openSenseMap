import {
	matchSensorWikiAlias,
	normalizeSensorWikiAliasValue,
	type SensorWikiAliasInput,
	type SensorWikiAliasEntry,
} from '~/lib/device-schemas/sensor-wiki-aliases'

const SENSOR_WIKI_FILTER_PREFIX = 'sensor-wiki:'
const TITLE_FILTER_PREFIX = 'title:'
export const PHENOMENON_FUZZY_MATCH_THRESHOLD = 0.82

export type PhenomenonFilterOption = {
	value: string
	label: string
	description?: string
	source: 'sensor-wiki' | 'title'
	aliases: string[]
}

export function getSensorWikiPhenomenonFilterValue(phenomenon: string) {
	return `${SENSOR_WIKI_FILTER_PREFIX}${phenomenon}`
}

export function getTitlePhenomenonFilterValue(title: string) {
	return `${TITLE_FILTER_PREFIX}${encodeURIComponent(title)}`
}

export function parsePhenomenonFilterValue(value: string):
	| {
			source: 'sensor-wiki'
			phenomenon: string
	  }
	| {
			source: 'title'
			title: string
	  } {
	if (value.startsWith(SENSOR_WIKI_FILTER_PREFIX)) {
		return {
			source: 'sensor-wiki',
			phenomenon: value.slice(SENSOR_WIKI_FILTER_PREFIX.length),
		}
	}

	if (value.startsWith(TITLE_FILTER_PREFIX)) {
		return {
			source: 'title',
			title: decodeURIComponent(value.slice(TITLE_FILTER_PREFIX.length)),
		}
	}

	return {
		source: 'title',
		title: value,
	}
}

export function getSensorWikiPhenomenonLabel(
	phenomenon: string,
	entries: SensorWikiAliasEntry[],
) {
	return (
		entries.find((entry) => entry.sensorWikiPhenomenon === phenomenon)?.title ??
		phenomenon
	)
}

export function getSensorWikiPhenomenonAliases(
	phenomenon: string,
	entries: SensorWikiAliasEntry[],
) {
	return entries
		.filter((entry) => entry.sensorWikiPhenomenon === phenomenon)
		.flatMap((entry) => [entry.title, ...entry.titleAliases])
}

export function getCanonicalSensorWikiPhenomenon(
	input: SensorWikiAliasInput & { sensorWikiPhenomenon?: string | null },
	entries: SensorWikiAliasEntry[],
) {
	const existingCanonicalPhenomenon = entries.find(
		(entry) => entry.sensorWikiPhenomenon === input.sensorWikiPhenomenon,
	)?.sensorWikiPhenomenon

	return (
		existingCanonicalPhenomenon ??
		input.sensorWikiPhenomenon ??
		matchSensorWikiAlias(input, entries)?.sensorWikiPhenomenon
	)
}

function tokenize(value: string) {
	return value.split(' ').filter(Boolean)
}

function levenshteinDistance(left: string, right: string) {
	const rows = left.length + 1
	const columns = right.length + 1
	const distances = Array.from({ length: rows }, () =>
		Array.from({ length: columns }, () => 0),
	)

	for (let row = 0; row < rows; row += 1) distances[row][0] = row
	for (let column = 0; column < columns; column += 1) {
		distances[0][column] = column
	}

	for (let row = 1; row < rows; row += 1) {
		for (let column = 1; column < columns; column += 1) {
			const substitutionCost = left[row - 1] === right[column - 1] ? 0 : 1

			distances[row][column] = Math.min(
				distances[row - 1][column] + 1,
				distances[row][column - 1] + 1,
				distances[row - 1][column - 1] + substitutionCost,
			)
		}
	}

	return distances[left.length][right.length]
}

function levenshteinSimilarity(left: string, right: string) {
	const longestLength = Math.max(left.length, right.length)
	if (longestLength === 0) return 1

	return 1 - levenshteinDistance(left, right) / longestLength
}

function tokenDiceSimilarity(left: string, right: string) {
	const leftTokens = tokenize(left)
	const rightTokens = tokenize(right)
	if (leftTokens.length === 0 || rightTokens.length === 0) return 0

	const rightTokenSet = new Set(rightTokens)
	const intersection = leftTokens.filter((token) => rightTokenSet.has(token))

	return (2 * intersection.length) / (leftTokens.length + rightTokens.length)
}

function titleSimilarity(left: string, right: string) {
	if (!left || !right) return 0
	if (left === right) return 1
	if (left.includes(right) || right.includes(left)) return 0.92

	return Math.max(
		levenshteinSimilarity(left, right),
		tokenDiceSimilarity(left, right),
	)
}

function aliasIncludesValue(aliases: string[] | undefined, value: string) {
	if (!value) return false

	return !!aliases?.some(
		(alias) => normalizeSensorWikiAliasValue(alias) === value,
	)
}

export function getFuzzySensorWikiPhenomenonMatch(
	input: SensorWikiAliasInput,
	entries: SensorWikiAliasEntry[],
	threshold = PHENOMENON_FUZZY_MATCH_THRESHOLD,
) {
	const normalizedTitle = normalizeSensorWikiAliasValue(input.title)
	const normalizedUnit = normalizeSensorWikiAliasValue(input.unit)
	const normalizedSensorType = normalizeSensorWikiAliasValue(input.sensorType)

	if (normalizedTitle.length < 3) return undefined

	const bestMatch = entries
		.map((entry) => {
			const titleScore = [entry.title, ...entry.titleAliases].reduce(
				(bestScore, alias) =>
					Math.max(
						bestScore,
						titleSimilarity(
							normalizedTitle,
							normalizeSensorWikiAliasValue(alias),
						),
					),
				0,
			)
			const unitMatched = aliasIncludesValue(entry.unitAliases, normalizedUnit)
			const sensorTypeMatched = aliasIncludesValue(
				entry.sensorTypeAliases,
				normalizedSensorType,
			)
			const score = Math.max(
				0,
				Math.min(
					1,
					titleScore * 0.78 +
						(unitMatched ? 0.17 : normalizedUnit ? -0.04 : 0) +
						(sensorTypeMatched ? 0.05 : 0),
				),
			)

			return {
				sensorWikiPhenomenon: entry.sensorWikiPhenomenon,
				score,
			}
		})
		.sort((left, right) => right.score - left.score)[0]

	if (!bestMatch || bestMatch.score < threshold) return undefined

	return bestMatch
}

export function sensorMatchesPhenomenonFilter(
	sensor: SensorWikiAliasInput & { sensorWikiPhenomenon?: string | null },
	filterValue: string,
	entries: SensorWikiAliasEntry[],
) {
	const parsedFilter = parsePhenomenonFilterValue(filterValue)

	if (parsedFilter.source === 'title') {
		return (
			normalizeSensorWikiAliasValue(sensor.title) ===
			normalizeSensorWikiAliasValue(parsedFilter.title)
		)
	}

	const canonicalPhenomenon = getCanonicalSensorWikiPhenomenon(sensor, entries)
	if (canonicalPhenomenon === parsedFilter.phenomenon) return true

	const fuzzyPhenomenon = getFuzzySensorWikiPhenomenonMatch(
		sensor,
		entries,
		PHENOMENON_FUZZY_MATCH_THRESHOLD,
	)
	if (fuzzyPhenomenon?.sensorWikiPhenomenon === parsedFilter.phenomenon) {
		return true
	}

	const normalizedTitle = normalizeSensorWikiAliasValue(sensor.title)
	return getSensorWikiPhenomenonAliases(parsedFilter.phenomenon, entries).some(
		(alias) => normalizeSensorWikiAliasValue(alias) === normalizedTitle,
	)
}

export function sensorMatchesAnyPhenomenonFilter(
	sensor: SensorWikiAliasInput & { sensorWikiPhenomenon?: string | null },
	filterValues: string[],
	entries: SensorWikiAliasEntry[],
) {
	return filterValues.some((filterValue) =>
		sensorMatchesPhenomenonFilter(sensor, filterValue, entries),
	)
}

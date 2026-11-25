import {
	matchSensorWikiAlias,
	normalizeSensorWikiAliasValue,
	type SensorWikiAliasInput,
	type SensorWikiAliasEntry,
} from '~/lib/sensor-wiki/aliases'

const SENSOR_WIKI_FILTER_PREFIX = 'sensor-wiki:'
const TITLE_FILTER_PREFIX = 'title:'
const PHENOMENON_FUZZY_MATCH_THRESHOLD = 0.82

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

export function getCanonicalSensorWikiPhenomenon(
	input: SensorWikiAliasInput & { sensorWikiPhenomenon?: string | null },
	entries: SensorWikiAliasEntry[],
) {
	return (
		input.sensorWikiPhenomenon?.trim() ||
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

function aliasIncludesValue(
	aliases: Array<string | undefined> | undefined,
	value: string,
) {
	if (!value) return false

	return !!aliases?.some(
		(alias) => normalizeSensorWikiAliasValue(alias) === value,
	)
}

export function getFuzzySensorWikiPhenomenonMatch(
	input: SensorWikiAliasInput,
	entries: SensorWikiAliasEntry[],
) {
	const normalizedTitle = normalizeSensorWikiAliasValue(input.title)
	const normalizedUnit = normalizeSensorWikiAliasValue(input.unit)
	const normalizedSensorType = normalizeSensorWikiAliasValue(input.sensorType)

	if (normalizedTitle.length < 3) return undefined

	const rankedMatches = entries
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
			const unitMatched = aliasIncludesValue(
				[entry.unit, ...(entry.unitAliases ?? [])],
				normalizedUnit,
			)
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
		.sort((left, right) => right.score - left.score)
	const [bestMatch] = rankedMatches

	if (!bestMatch || bestMatch.score < PHENOMENON_FUZZY_MATCH_THRESHOLD) {
		return undefined
	}
	if (
		rankedMatches.some(
			(match) =>
				match.score === bestMatch.score &&
				match.sensorWikiPhenomenon !== bestMatch.sensorWikiPhenomenon,
		)
	) {
		return undefined
	}

	return bestMatch
}

export function sensorMatchesAnyPhenomenonFilter(
	sensor: SensorWikiAliasInput & { sensorWikiPhenomenon?: string | null },
	filterValues: string[],
	entries: SensorWikiAliasEntry[],
) {
	const filters = filterValues.map(parsePhenomenonFilterValue)
	const normalizedTitle = normalizeSensorWikiAliasValue(sensor.title)

	if (
		filters.some(
			(filter) =>
				filter.source === 'title' &&
				normalizeSensorWikiAliasValue(filter.title) === normalizedTitle,
		)
	) {
		return true
	}

	if (!filters.some((filter) => filter.source === 'sensor-wiki')) return false

	const phenomenon =
		getCanonicalSensorWikiPhenomenon(sensor, entries) ??
		getFuzzySensorWikiPhenomenonMatch(sensor, entries)?.sensorWikiPhenomenon

	return filters.some(
		(filter) =>
			filter.source === 'sensor-wiki' && filter.phenomenon === phenomenon,
	)
}

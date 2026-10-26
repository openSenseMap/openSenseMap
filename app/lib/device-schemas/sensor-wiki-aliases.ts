export type SensorWikiAliasInput = {
	title?: string | null
	unit?: string | null
	sensorType?: string | null
}

export type SensorWikiAliasMatch = {
	sensorWikiPhenomenon: string
	sensorWikiUnit?: string
	confidence: 'high' | 'medium'
	reasons: string[]
}

export type SensorWikiAliasSuggestion = SensorWikiAliasMatch & {
	title: string
	unit?: string
	aliases: string[]
}

export type SensorWikiAliasEntry = {
	sensorWikiPhenomenon: string
	sensorWikiUnit?: string
	title: string
	unit?: string
	titleAliases: string[]
	unitAliases?: string[]
	sensorTypeAliases?: string[]
}

export function createSensorWikiAliasKey(entry: {
	sensorWikiPhenomenon: string
	sensorWikiUnit?: string | null
}) {
	return `${entry.sensorWikiPhenomenon}:${entry.sensorWikiUnit ?? ''}`
}

export function normalizeSensorWikiAliasValue(value?: string | null): string {
	return (
		(value ?? '')
			.trim()
			.toLowerCase()
			.normalize('NFKD')
			// remove accents
			.replace(/[\u0300-\u036f]/g, '')
			.replace(/μ/g, 'u')
			.replace(/°/g, '')
			.replace(/[^a-z0-9%/]+/g, ' ')
			.replace(/\s+/g, ' ')
			.trim()
	)
}

export function matchSensorWikiAlias(
	input: SensorWikiAliasInput,
	entries: SensorWikiAliasEntry[],
): SensorWikiAliasMatch | undefined {
	const normalizedTitle = normalizeSensorWikiAliasValue(input.title)
	const normalizedUnit = normalizeSensorWikiAliasValue(input.unit)
	const normalizedSensorType = normalizeSensorWikiAliasValue(input.sensorType)
	const candidates: Array<{
		entry: SensorWikiAliasEntry
		unitMatched: boolean
		sensorTypeMatched: boolean
		exactPrimaryTitleMatched: boolean
		score: number
	}> = []

	for (const entry of entries) {
		const exactPrimaryTitleMatched =
			normalizeSensorWikiAliasValue(entry.title) === normalizedTitle
		const titleMatched =
			exactPrimaryTitleMatched ||
			entry.titleAliases.some(
				(alias) => normalizeSensorWikiAliasValue(alias) === normalizedTitle,
			)

		if (!titleMatched) continue

		const unitMatched = Boolean(
			normalizedUnit &&
			[entry.unit, ...(entry.unitAliases ?? [])].some(
				(alias) => normalizeSensorWikiAliasValue(alias) === normalizedUnit,
			),
		)
		const sensorTypeMatched = Boolean(
			normalizedSensorType &&
			entry.sensorTypeAliases?.some(
				(alias) =>
					normalizeSensorWikiAliasValue(alias) === normalizedSensorType,
			),
		)

		candidates.push({
			entry,
			unitMatched,
			sensorTypeMatched,
			exactPrimaryTitleMatched,
			// These weights make the ranking lexicographic: unit, sensor type,
			// then an exact match against the entry's primary display title.
			score:
				(unitMatched ? 4 : 0) +
				(sensorTypeMatched ? 2 : 0) +
				(exactPrimaryTitleMatched ? 1 : 0),
		})
	}

	if (candidates.length === 0) return undefined

	const bestScore = Math.max(...candidates.map((candidate) => candidate.score))
	const bestCandidates = candidates.filter(
		(candidate) => candidate.score === bestScore,
	)
	const bestTargets = new Set(
		bestCandidates.map(({ entry }) => createSensorWikiAliasKey(entry)),
	)

	if (bestTargets.size > 1) return undefined

	const [bestMatch] = bestCandidates
	const reasons = ['title-alias']
	if (bestMatch.unitMatched) reasons.push('unit-alias')
	if (bestMatch.sensorTypeMatched) reasons.push('sensor-type-alias')

	return {
		sensorWikiPhenomenon: bestMatch.entry.sensorWikiPhenomenon,
		sensorWikiUnit: bestMatch.unitMatched
			? bestMatch.entry.sensorWikiUnit
			: undefined,
		confidence:
			bestMatch.unitMatched || bestMatch.sensorTypeMatched ? 'high' : 'medium',
		reasons,
	}
}

export function getSensorWikiAliasSuggestions(
	input: SensorWikiAliasInput,
	entries: SensorWikiAliasEntry[],
	limit = 5,
): SensorWikiAliasSuggestion[] {
	const normalizedTitle = normalizeSensorWikiAliasValue(input.title)
	const normalizedUnit = normalizeSensorWikiAliasValue(input.unit)
	const normalizedSensorType = normalizeSensorWikiAliasValue(input.sensorType)

	if (normalizedTitle.length < 2) return []

	return entries
		.map((entry) => {
			const normalizedAliases = [entry.title, ...entry.titleAliases].map(
				(alias) => normalizeSensorWikiAliasValue(alias),
			)
			const titleMatches = normalizedAliases.some((alias) =>
				alias.includes(normalizedTitle),
			)
			const titleStartsWithQuery = normalizedAliases.some((alias) =>
				alias.startsWith(normalizedTitle),
			)
			const unitMatched =
				!!normalizedUnit &&
				[entry.unit, ...(entry.unitAliases ?? [])].some(
					(alias) => normalizeSensorWikiAliasValue(alias) === normalizedUnit,
				)
			const sensorTypeMatched =
				!!normalizedSensorType &&
				entry.sensorTypeAliases?.some(
					(alias) =>
						normalizeSensorWikiAliasValue(alias) === normalizedSensorType,
				)

			if (!titleMatches) return null

			const reasons = ['title-alias']
			if (unitMatched) reasons.push('unit-alias')
			if (sensorTypeMatched) reasons.push('sensor-type-alias')

			return {
				suggestion: {
					title: entry.title,
					unit: entry.unit,
					sensorWikiPhenomenon: entry.sensorWikiPhenomenon,
					sensorWikiUnit: entry.sensorWikiUnit,
					confidence: unitMatched || sensorTypeMatched ? 'high' : 'medium',
					reasons,
					aliases: entry.titleAliases,
				} satisfies SensorWikiAliasSuggestion,
				score:
					(titleStartsWithQuery ? 2 : 1) +
					(unitMatched ? 2 : 0) +
					(sensorTypeMatched ? 1 : 0),
			}
		})
		.filter((result): result is NonNullable<typeof result> => result !== null)
		.sort((a, b) => b.score - a.score)
		.map(({ suggestion }) => suggestion)
		.slice(0, limit)
}

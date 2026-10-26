import { z } from 'zod'
import rawCatalog from './sensor-wiki-aliases.json'
import {
	createSensorWikiAliasKey,
	matchSensorWikiAlias,
	normalizeSensorWikiAliasValue,
	type SensorWikiAliasEntry,
} from './sensor-wiki-aliases'

const nonEmptyString = z.string().trim().min(1)

export const sensorWikiAliasEntrySchema = z.object({
	sensorWikiPhenomenon: nonEmptyString,
	sensorWikiUnit: nonEmptyString.optional(),
	title: nonEmptyString,
	unit: nonEmptyString.optional(),
	titleAliases: z.array(nonEmptyString),
	unitAliases: z.array(nonEmptyString).optional(),
	sensorTypeAliases: z.array(nonEmptyString).optional(),
})

export const sensorWikiAliasCatalogSchema = z.object({
	version: z.literal(1),
	entries: z.array(sensorWikiAliasEntrySchema).min(1),
})

export type SensorWikiAliasCatalog = {
	version: 1
	entries: SensorWikiAliasEntry[]
}

function findNormalizedDuplicates(values: string[]) {
	const seen = new Set<string>()
	const duplicates = new Set<string>()

	for (const value of values) {
		const normalized = normalizeSensorWikiAliasValue(value)
		if (seen.has(normalized)) duplicates.add(value)
		seen.add(normalized)
	}

	return [...duplicates]
}

export function getSensorWikiAliasCatalogIssues(
	entries: SensorWikiAliasEntry[],
) {
	const issues: string[] = []
	const targetKeys = new Set<string>()

	for (const entry of entries) {
		const targetKey = createSensorWikiAliasKey(entry)
		if (targetKeys.has(targetKey)) {
			issues.push(`Duplicate catalog target: ${targetKey}`)
		}
		targetKeys.add(targetKey)

		for (const [field, values] of [
			['titleAliases', entry.titleAliases],
			['unitAliases', entry.unitAliases ?? []],
			['sensorTypeAliases', entry.sensorTypeAliases ?? []],
		] as const) {
			for (const duplicate of findNormalizedDuplicates([...values])) {
				issues.push(
					`Duplicate normalized ${field} value "${duplicate}" for ${targetKey}`,
				)
			}
		}

		for (const title of [entry.title, ...entry.titleAliases]) {
			const match = matchSensorWikiAlias(
				{
					title,
					unit: entry.unit,
					sensorType: entry.sensorTypeAliases?.[0],
				},
				entries,
			)

			if (!match || createSensorWikiAliasKey(match) !== targetKey) {
				issues.push(
					`Alias "${title}" does not resolve deterministically to ${targetKey}`,
				)
			}
		}
	}

	return issues
}

export function parseSensorWikiAliasCatalog(
	value: unknown,
): SensorWikiAliasCatalog {
	const catalog = sensorWikiAliasCatalogSchema.parse(value)
	const issues = getSensorWikiAliasCatalogIssues(catalog.entries)

	if (issues.length > 0) {
		throw new Error(
			`Invalid Sensor-Wiki alias catalog:\n- ${issues.join('\n- ')}`,
		)
	}

	return catalog
}

export const sensorWikiAliasCatalog = parseSensorWikiAliasCatalog(rawCatalog)
export const sensorWikiAliasEntries = sensorWikiAliasCatalog.entries

import { z } from 'zod'
import rawCatalog from './aliases.json'
import { createSensorWikiAliasKey, matchSensorWikiAlias } from './aliases'

const nonEmptyString = z.string().trim().min(1)

const sensorWikiAliasEntrySchema = z.object({
	sensorWikiPhenomenon: nonEmptyString,
	sensorWikiUnit: nonEmptyString.optional(),
	title: nonEmptyString,
	unit: nonEmptyString.optional(),
	titleAliases: z.array(nonEmptyString),
	unitAliases: z.array(nonEmptyString).optional(),
	sensorTypeAliases: z.array(nonEmptyString).optional(),
})

const sensorWikiAliasCatalogSchema = z
	.object({
		version: z.literal(1),
		entries: z.array(sensorWikiAliasEntrySchema).min(1),
	})
	.superRefine(({ entries }, context) => {
		const targetKeys = new Set<string>()

		for (const [entryIndex, entry] of entries.entries()) {
			const targetKey = createSensorWikiAliasKey(entry)
			if (targetKeys.has(targetKey)) {
				context.addIssue({
					code: 'custom',
					message: `Duplicate catalog target: ${targetKey}`,
					path: ['entries', entryIndex],
				})
			}
			targetKeys.add(targetKey)

			for (const [titleIndex, title] of [
				entry.title,
				...entry.titleAliases,
			].entries()) {
				const match = matchSensorWikiAlias(
					{
						title,
						unit: entry.unit,
						sensorType: entry.sensorTypeAliases?.[0],
					},
					entries,
				)

				if (!match || createSensorWikiAliasKey(match) !== targetKey) {
					context.addIssue({
						code: 'custom',
						message: `Alias "${title}" does not resolve deterministically to ${targetKey}`,
						path:
							titleIndex === 0
								? ['entries', entryIndex, 'title']
								: ['entries', entryIndex, 'titleAliases', titleIndex - 1],
					})
				}
			}
		}
	})

export const sensorWikiAliasCatalog =
	sensorWikiAliasCatalogSchema.parse(rawCatalog)
export const sensorWikiAliasEntries = sensorWikiAliasCatalog.entries

import { asc, eq } from 'drizzle-orm'
import { drizzleClient } from '~/db.server'
import { sensorWikiAlias } from '~/db/schema'
import { type SensorWikiAliasEntry } from '~/lib/device-schemas/sensor-wiki-aliases'

export async function getSensorWikiAliasesForAdmin() {
	return drizzleClient
		.select()
		.from(sensorWikiAlias)
		.orderBy(
			asc(sensorWikiAlias.sensorWikiPhenomenon),
			asc(sensorWikiAlias.sensorWikiUnit),
		)
}

export async function createSensorWikiAlias(input: {
	sensorWikiPhenomenon: string
	sensorWikiUnit?: string | null
	title: string
	unit?: string | null
	titleAliases: string[]
	unitAliases: string[]
	sensorTypeAliases: string[]
}) {
	return drizzleClient.insert(sensorWikiAlias).values(input).returning()
}

export async function updateSensorWikiAlias(
	id: string,
	input: {
		sensorWikiPhenomenon: string
		sensorWikiUnit?: string | null
		title: string
		unit?: string | null
		titleAliases: string[]
		unitAliases: string[]
		sensorTypeAliases: string[]
	},
) {
	return drizzleClient
		.update(sensorWikiAlias)
		.set(input)
		.where(eq(sensorWikiAlias.id, id))
		.returning()
}

export async function deleteSensorWikiAlias(id: string) {
	return drizzleClient
		.delete(sensorWikiAlias)
		.where(eq(sensorWikiAlias.id, id))
		.returning()
}

export async function getActiveSensorWikiAliasEntries(): Promise<
	SensorWikiAliasEntry[]
> {
	try {
		const rows = await drizzleClient
			.select({
				sensorWikiPhenomenon: sensorWikiAlias.sensorWikiPhenomenon,
				sensorWikiUnit: sensorWikiAlias.sensorWikiUnit,
				title: sensorWikiAlias.title,
				unit: sensorWikiAlias.unit,
				titleAliases: sensorWikiAlias.titleAliases,
				unitAliases: sensorWikiAlias.unitAliases,
				sensorTypeAliases: sensorWikiAlias.sensorTypeAliases,
			})
			.from(sensorWikiAlias)
			.orderBy(
				asc(sensorWikiAlias.sensorWikiPhenomenon),
				asc(sensorWikiAlias.sensorWikiUnit),
			)

		return rows.map((row) => ({
			sensorWikiPhenomenon: row.sensorWikiPhenomenon,
			sensorWikiUnit: row.sensorWikiUnit ?? undefined,
			title: row.title,
			unit: row.unit ?? undefined,
			titleAliases: row.titleAliases,
			unitAliases: row.unitAliases,
			sensorTypeAliases: row.sensorTypeAliases,
		}))
	} catch (error) {
		console.error(
			'Sensor-Wiki aliases could not be loaded from the database.',
			error,
		)
		return []
	}
}

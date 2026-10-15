import { createId } from '@paralleldrive/cuid2'
import { index, pgTable, text, uniqueIndex } from 'drizzle-orm/pg-core'
import { type InferInsertModel, type InferSelectModel, sql } from 'drizzle-orm'

export const sensorWikiAlias = pgTable(
	'sensor_wiki_alias',
	{
		id: text('id')
			.primaryKey()
			.notNull()
			.$defaultFn(() => createId()),
		key: text('key').notNull(),
		sensorWikiPhenomenon: text('sensor_wiki_phenomenon').notNull(),
		sensorWikiUnit: text('sensor_wiki_unit'),
		title: text('title').notNull(),
		unit: text('unit'),
		titleAliases: text('title_aliases')
			.array()
			.default(sql`ARRAY[]::text[]`)
			.notNull(),
		unitAliases: text('unit_aliases')
			.array()
			.default(sql`ARRAY[]::text[]`)
			.notNull(),
		sensorTypeAliases: text('sensor_type_aliases')
			.array()
			.default(sql`ARRAY[]::text[]`)
			.notNull(),
	},
	(table) => [
		uniqueIndex('sensor_wiki_alias_key_unique').on(table.key),
		index('sensor_wiki_alias_phenomenon_idx').on(table.sensorWikiPhenomenon),
	],
)

export type SensorWikiAlias = InferSelectModel<typeof sensorWikiAlias>
export type InsertSensorWikiAlias = InferInsertModel<typeof sensorWikiAlias>

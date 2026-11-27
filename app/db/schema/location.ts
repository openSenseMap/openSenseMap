import { relations, sql } from 'drizzle-orm'
import {
	bigserial,
	geometry,
	index,
	pgTable,
	unique,
} from 'drizzle-orm/pg-core'
import { measurement } from './measurement'

/**
 * Table
 */
export const location = pgTable(
	'location',
	{
		id: bigserial('id', { mode: 'bigint' }).primaryKey(),
		location: geometry('location', {
			type: 'point',
			mode: 'xy',
			srid: 4326,
		}).notNull(),
	},
	(t) => [
		index('location_index').using('gist', t.location),
		unique().on(t.location),
		sql`CONSTRAINT check_location CHECK (
			ST_X(${t.location}) BETWEEN -180 AND 180
			ST_Y(${t.location}) BETWEEN -90 AND 90
		)`,
	],
)

/**
 * Relations
 * 1. One-to-many: Location - Measurement (One location can have many measurements)
 */
export const locationRelations = relations(location, ({ many }) => ({
	measurements: many(measurement),
}))

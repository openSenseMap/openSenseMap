import { createId } from '@paralleldrive/cuid2'
import {
	relations,
	sql,
	type InferInsertModel,
	type InferSelectModel,
} from 'drizzle-orm'
import {
	pgTable,
	boolean,
	text,
	timestamp,
	doublePrecision,
	primaryKey,
	unique,
	date,
	bigint,
} from 'drizzle-orm/pg-core'
import { DeviceExposureEnum, DeviceModelEnum, DeviceStatusEnum } from './enum'
import { location } from './location'
import { logEntry } from './log-entry'
import { sensor } from './sensor'
import { user } from './user'
import { deviceSchemaVersion } from './device-schema'

/**
 * Table
 */
export const device = pgTable('device', {
	id: text('id')
		.primaryKey()
		.notNull()
		.$defaultFn(() => createId()),
	name: text('name').notNull(),
	image: text('image'),
	website: text('website'),
	description: text('description'),
	tags: text('tags')
		.array()
		.default(sql`ARRAY[]::text[]`),
	link: text('link'),
	useAuth: boolean('use_auth'),
	apiKey: text('apiKey'),
	exposure: DeviceExposureEnum('exposure'),
	status: DeviceStatusEnum('status').default('inactive'),
	model: DeviceModelEnum('model').default('custom'),
	public: boolean('public').default(false),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at').defaultNow().notNull(),
	archivedAt: timestamp('archived_at'),
	orphanedAt: timestamp('orphaned_at'),
	expiresAt: date('expires_at', { mode: 'date' }),
	latitude: doublePrecision('latitude').notNull(),
	longitude: doublePrecision('longitude').notNull(),
	heightAboveGround: doublePrecision('height_above_ground'),
	terrainElevation: doublePrecision('terrain_elevation'),
	terrainElevationDataset: text('terrain_elevation_dataset'),
	sensorWikiModel: text('sensor_wiki_model'),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, {
			onDelete: 'cascade',
			onUpdate: 'cascade',
		}),
	deviceSchemaVersionId: text('device_schema_version_id').references(
		() => deviceSchemaVersion.id,
		{
			onDelete: 'set null',
			onUpdate: 'cascade',
		},
	),
})

// Many-to-many relation between device - location
// https://orm.drizzle.team/docs/rqb#many-to-many
export const deviceToLocation = pgTable(
	'device_to_location',
	{
		deviceId: text('device_id')
			.notNull()
			.references(() => device.id, {
				onDelete: 'cascade',
				onUpdate: 'cascade',
			}),
		locationId: bigint('location_id', { mode: 'bigint' })
			.notNull()
			.references(() => location.id),
		time: timestamp('time').defaultNow().notNull(),
	},
	(t) => ({
		pk: primaryKey({ columns: [t.deviceId, t.locationId, t.time] }),
		unique: unique().on(t.deviceId, t.locationId, t.time), // Device can only be at one location at the same time
	}),
)

/**
 * Relations
 */
export const deviceRelations = relations(device, ({ one, many }) => ({
	user: one(user, {
		fields: [device.userId],
		references: [user.id],
	}),
	sensors: many(sensor),
	locations: many(deviceToLocation),
	logEntries: many(logEntry),
}))

// Many-to-many
export const deviceToLocationRelations = relations(
	deviceToLocation,
	({ one }) => ({
		device: one(device, {
			fields: [deviceToLocation.deviceId],
			references: [device.id],
		}),
		geometry: one(location, {
			fields: [deviceToLocation.locationId],
			references: [location.id],
		}),
	}),
)

/**
 * Types
 */
export type Device = InferSelectModel<typeof device>
export type InsertDevice = InferInsertModel<typeof device>

import { createId } from '@paralleldrive/cuid2'
import { relations, sql, type InferSelectModel } from 'drizzle-orm'
import {
	index,
	jsonb,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
} from 'drizzle-orm/pg-core'
import { user } from './user'
import { type UploadedDeviceSchemaV1 } from '~/lib/device-schemas/device-schema-v1'

export const deviceSchemaVisibilityEnum = pgEnum('device_schema_visibility', [
	'private',
	'public',
])

export const deviceSchemaVersionStatusEnum = pgEnum(
	'device_schema_version_status',
	['current', 'deprecated'],
)

export const deviceSchema = pgTable(
	'device_schema',
	{
		id: text('id')
			.primaryKey()
			.notNull()
			.$defaultFn(() => createId()),
		slug: text('slug').notNull(),
		name: text('name').notNull(),
		description: text('description'),
		tags: text('tags')
			.array()
			.default(sql`ARRAY[]::text[]`),
		ownerUserId: text('owner_user_id')
			.notNull()
			.references(() => user.id, {
				onDelete: 'cascade',
				onUpdate: 'cascade',
			}),
		visibility: deviceSchemaVisibilityEnum('visibility')
			.default('private')
			.notNull(),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at').defaultNow().notNull(),
	},
	(table) => [
		uniqueIndex('device_schema_owner_slug_unique').on(
			table.ownerUserId,
			table.slug,
		),
		index('device_schema_visibility_idx').on(table.visibility),
	],
)

export const deviceSchemaVersion = pgTable(
	'device_schema_version',
	{
		id: text('id')
			.primaryKey()
			.notNull()
			.$defaultFn(() => createId()),
		deviceSchemaId: text('device_schema_id')
			.notNull()
			.references(() => deviceSchema.id, {
				onDelete: 'cascade',
				onUpdate: 'cascade',
			}),
		version: text('version').notNull(),
		formatVersion: text('format_version').notNull(),
		content: jsonb('content').$type<UploadedDeviceSchemaV1>().notNull(),
		hash: text('hash').notNull(),
		status: deviceSchemaVersionStatusEnum('status')
			.default('current')
			.notNull(),
		createdByUserId: text('created_by_user_id')
			.notNull()
			.references(() => user.id, {
				onDelete: 'restrict',
			}),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		publishedAt: timestamp('published_at'),
		deprecatedAt: timestamp('deprecated_at'),
	},
	(table) => [
		uniqueIndex('device_schema_version_unique').on(
			table.deviceSchemaId,
			table.version,
		),
		uniqueIndex('device_schema_version_hash_unique').on(
			table.deviceSchemaId,
			table.hash,
		),
	],
)

export const deviceSchemaRelations = relations(
	deviceSchema,
	({ one, many }) => ({
		owner: one(user, {
			fields: [deviceSchema.ownerUserId],
			references: [user.id],
		}),
		versions: many(deviceSchemaVersion),
	}),
)

export const deviceSchemaVersionRelations = relations(
	deviceSchemaVersion,
	({ one }) => ({
		schema: one(deviceSchema, {
			fields: [deviceSchemaVersion.deviceSchemaId],
			references: [deviceSchema.id],
		}),
		createdBy: one(user, {
			fields: [deviceSchemaVersion.createdByUserId],
			references: [user.id],
		}),
	}),
)

export type DeviceSchema = InferSelectModel<typeof deviceSchema>
export type DeviceSchemaVersion = InferSelectModel<typeof deviceSchemaVersion>

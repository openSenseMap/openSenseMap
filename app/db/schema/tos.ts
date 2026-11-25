import { createId } from '@paralleldrive/cuid2'
import {
	pgTable,
	text,
	timestamp,
	primaryKey,
	index,
	jsonb,
} from 'drizzle-orm/pg-core'
import { user } from './user'

export const tosVersion = pgTable(
	'tos_version',
	{
		id: text('id')
			.primaryKey()
			.notNull()
			.$defaultFn(() => createId()),

		version: text('version').notNull().unique(),

		title: jsonb('title')
			.$type<{
				en: string
				de: string
			}>()
			.notNull(),

		body: jsonb('body')
			.$type<{
				en: string
				de: string
			}>()
			.notNull(),

		effectiveFrom: timestamp('effective_from', {
			withTimezone: true,
		}).notNull(),
		acceptBy: timestamp('accept_by', { withTimezone: true }).notNull(),

		createdAt: timestamp('created_at', { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(t) => ({
		effectiveFromIdx: index('tos_version_effective_from_idx').on(
			t.effectiveFrom,
		),
		acceptByIdx: index('tos_version_accept_by_idx').on(t.acceptBy),
	}),
)

export const tosUserState = pgTable(
	'tos_user_state',
	{
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),

		tosVersionId: text('tos_version_id')
			.notNull()
			.references(() => tosVersion.id, { onDelete: 'cascade' }),

		acceptedAt: timestamp('accepted_at', { withTimezone: true }),
	},
	(t) => ({
		pk: primaryKey({ columns: [t.userId, t.tosVersionId] }),
		userIdx: index('tos_user_state_user_idx').on(t.userId),
	}),
)

import { createId } from '@paralleldrive/cuid2'
import { type InferInsertModel, type InferSelectModel } from 'drizzle-orm'
import { index, pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { user } from './user'

export const elevationConsent = pgTable(
	'elevation_consent',
	{
		id: text('id')
			.primaryKey()
			.notNull()
			.$defaultFn(() => createId()),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, {
				onDelete: 'cascade',
				onUpdate: 'cascade',
			}),
		consentVersion: text('consent_version').notNull(),
		acceptedAt: timestamp('accepted_at', { withTimezone: true })
			.defaultNow()
			.notNull(),
		withdrawnAt: timestamp('withdrawn_at', { withTimezone: true }),
	},
	(t) => ({
		userIdx: index('elevation_consent_user_idx').on(t.userId),
	}),
)

export type ElevationConsent = InferSelectModel<typeof elevationConsent>
export type InsertElevationConsent = InferInsertModel<typeof elevationConsent>

import { createId } from '@paralleldrive/cuid2'
import { relations } from 'drizzle-orm'
import {
	pgTable,
	text,
	timestamp,
	index,
	uniqueIndex,
} from 'drizzle-orm/pg-core'
import { user } from './user'

export const actionToken = pgTable(
	'action_token',
	{
		id: text('id')
			.primaryKey()
			.notNull()
			.$defaultFn(() => createId()),

		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),

		purpose: text('purpose')
			.$type<
				| 'email_confirmation'
				| 'password_reset'
				| 'tos_acceptance'
				| 'newsletter_confirmation'
			>()
			.notNull(),

		tokenHash: text('token_hash').notNull().unique(),

		expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
	},
	(t) => ({
		userPurposeUq: uniqueIndex('action_token_user_purpose_uq').on(
			t.userId,
			t.purpose,
		),
		expiresAtIdx: index('action_token_expires_at_idx').on(t.expiresAt),
	}),
)

export const actionTokenRelations = relations(actionToken, ({ one }) => ({
	user: one(user, {
		fields: [actionToken.userId],
		references: [user.id],
	}),
}))

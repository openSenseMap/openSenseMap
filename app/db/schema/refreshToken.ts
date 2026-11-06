import { relations, type InferSelectModel } from 'drizzle-orm'
import { json, pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { user } from './user'

export const refreshToken = pgTable('refresh_token', {
	userId: text('user_id')
		.notNull()
		.references(() => user.id, {
			onDelete: 'cascade',
		}),
	token: text('token'),
	expiresAt: timestamp('expires_at', { withTimezone: true }),
})

export const refreshTokenRelations = relations(refreshToken, ({ one }) => ({
	user: one(user, {
		fields: [refreshToken.userId],
		references: [user.id],
	}),
}))

export const tokenRevocation = pgTable('token_revocation', {
	hash: text('hash').notNull(),
	token: json('token').notNull(),
	expiresAt: timestamp('expires_at', { withTimezone: true })
		.notNull()
		.$defaultFn(() => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)), // UTC today + 1 week in MS
})

export type RefreshToken = InferSelectModel<typeof refreshToken>
export type tokenRevocation = InferSelectModel<typeof tokenRevocation>

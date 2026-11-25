import { type InferInsertModel, type InferSelectModel } from 'drizzle-orm'
import { pgTable, text } from 'drizzle-orm/pg-core'
import { user } from './user'

/**
 * Table
 */
export const password = pgTable('password', {
	hash: text('hash').notNull(),
	userId: text('user_id')
		.primaryKey()
		.references(() => user.id, {
			onDelete: 'cascade',
			onUpdate: 'cascade',
		})
		.notNull(),
})

/**
 * Types
 */
export type Password = InferSelectModel<typeof password>
export type InsertPassword = InferInsertModel<typeof password>

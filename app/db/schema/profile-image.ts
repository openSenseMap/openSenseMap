import { createId } from '@paralleldrive/cuid2'
import { type InferInsertModel, type InferSelectModel } from 'drizzle-orm'
import { pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { profile } from './profile'
import { bytea } from './types'

/**
 * Table
 */
export const profileImage = pgTable('profile_image', {
	id: text('id')
		.notNull()
		.primaryKey()
		.$defaultFn(() => createId()),
	altText: text('alt_text'),
	contentType: text('content_type').notNull(),
	blob: bytea('blob').notNull(),
	createdAt: timestamp('created_at', { withTimezone: true })
		.defaultNow()
		.notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true })
		.defaultNow()
		.notNull(),
	profileId: text('profile_id').references(() => profile.id, {
		onDelete: 'cascade',
		onUpdate: 'cascade',
	}),
})

/**
 * Types
 */
export type Image = InferSelectModel<typeof profileImage>
export type InsertImage = InferInsertModel<typeof profileImage>

import { createId } from '@paralleldrive/cuid2'
import {
	relations,
	type InferInsertModel,
	type InferSelectModel,
} from 'drizzle-orm'
import {
	pgTable,
	boolean,
	doublePrecision,
	real,
	text,
} from 'drizzle-orm/pg-core'
import { user } from './user'

/**
 * Table
 */
export const profile = pgTable('profile', {
	id: text('id')
		.primaryKey()
		.notNull()
		.$defaultFn(() => createId()),
	displayName: text('display_name').notNull(),
	image: text('image'),
	public: boolean('public').default(false),
	homeLatitude: doublePrecision('home_latitude'),
	homeLongitude: doublePrecision('home_longitude'),
	homeZoom: real('home_zoom').default(10),
	userId: text('user_id')
		.notNull()
		.unique()
		.references(() => user.id, {
			onDelete: 'cascade',
			onUpdate: 'cascade',
		}),
})

/**
 * Relations
 */
export const profileRelations = relations(profile, ({ one }) => ({
	user: one(user, {
		fields: [profile.userId],
		references: [user.id],
	}),
}))

/**
 * Types
 */
export type Profile = InferSelectModel<typeof profile>
export type InsertProfile = InferInsertModel<typeof profile>

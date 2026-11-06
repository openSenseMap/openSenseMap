import { createId } from '@paralleldrive/cuid2'
import { type InferSelectModel } from 'drizzle-orm'
import { integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

export const integration = pgTable('integration', {
	id: text('id')
		.primaryKey()
		.notNull()
		.$defaultFn(() => createId()),
	name: text('name').notNull(),
	slug: text('slug').notNull().unique(),
	serviceUrl: text('service_url').notNull(),
	serviceKey: text('service_key').notNull(),
	icon: text('icon'), //name of lucide icon , pascal case!
	description: text('description'),
	order: integer('order').default(0).notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export type Integration = InferSelectModel<typeof integration>

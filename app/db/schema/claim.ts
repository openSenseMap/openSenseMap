import { createId } from '@paralleldrive/cuid2'
import { type InferInsertModel, type InferSelectModel } from 'drizzle-orm'
import { index, pgTable, text, timestamp, unique } from 'drizzle-orm/pg-core'
import { device } from './device'

export const claim = pgTable(
	'claim',
	{
		id: text('id')
			.primaryKey()
			.notNull()
			.$defaultFn(() => createId()),
		boxId: text('box_id')
			.notNull()
			.references(() => device.id, { onDelete: 'cascade' }),
		token: text('token').notNull(),
		expiresAt: timestamp('expires_at', {
			mode: 'date',
			withTimezone: true,
		}),
		createdAt: timestamp('created_at', { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		unique('unique_box_id').on(table.boxId),
		index('claim_expires_at_idx').on(table.expiresAt),
	],
)
export type Claim = InferSelectModel<typeof claim>
export type InsertClaim = InferInsertModel<typeof claim>

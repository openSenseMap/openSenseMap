import { randomBytes } from 'crypto'
import {
	relations,
	type InferInsertModel,
	type InferSelectModel,
} from 'drizzle-orm'
import {
	pgTable,
	text,
	timestamp,
	json,
	integer,
	index,
} from 'drizzle-orm/pg-core'
import { device } from './device'
import { DeviceStatusEnum } from './enum'
import { type Measurement } from './measurement'

export function generateHexId(): string {
	return randomBytes(12).toString('hex')
}

/**
 * Type for lastMeasurement JSON field
 */
export type LastMeasurement = {
	value: number | string
	createdAt: string
	sensorId?: string
} | null

/**
 * Table
 */
export const sensor = pgTable(
	'sensor',
	{
		id: text('id')
			.primaryKey()
			.notNull()
			.$defaultFn(() => generateHexId()), // store as hex strings to maintain compatibility with the byte protocol
		title: text('title').notNull(),
		unit: text('unit'),
		sensorType: text('sensor_type'),
		icon: text('icon'),
		status: DeviceStatusEnum('status').default('inactive'),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at').defaultNow().notNull(),
		deviceId: text('device_id')
			.references(() => device.id, {
				onDelete: 'cascade',
			})
			.notNull(),
		sensorWikiType: text('sensor_wiki_type'),
		sensorWikiPhenomenon: text('sensor_wiki_phenomenon'),
		sensorWikiUnit: text('sensor_wiki_unit'),
		lastMeasurement: json('lastMeasurement').$type<LastMeasurement>(),
		data: json('data'),
		order: integer('order').default(0),
	},
	(t) => [index('sensor_device_id_idx').on(t.deviceId)],
)

/**
 * Relations
 */
export const sensorRelations = relations(sensor, ({ one }) => ({
	device: one(device, {
		fields: [sensor.deviceId],
		references: [device.id],
	}),
}))

/**
 * Types
 */
export type Sensor = InferSelectModel<typeof sensor>
export type InsertSensor = InferInsertModel<typeof sensor>

export type SensorWithLatestMeasurement = Sensor & Measurement

export type SensorWithMeasurementData = Sensor & {
	data: {
		locationId?: number | null
		location?: { id: number; x: number; y: number } | null
		time: Date | null
		value: number | null
		sensorId: string | null
	}[]
}

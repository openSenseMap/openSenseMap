import * as z from 'zod/v4'
import { IsoDateTimeSchema } from './common'
import { CoordinatesWithHeightSchema, LocationObjectSchema } from './location'

export const MeasurementValueSchema = z.number().nullable().meta({
	description: 'Measured value',
	example: 23.42,
})

export const MeasurementLocationIdSchema = z
	.union([z.string(), z.number()])
	.nullable()
	.meta({
		description:
			'ID of the location associated with the measurement. Depending on serialization this may be returned as a string or number.',
		example: '123',
	})

export const MeasurementLocationSchema = z
	.union([CoordinatesWithHeightSchema, LocationObjectSchema])
	.meta({
		id: 'MeasurementLocation',
		description:
			'Optional measurement location. Accepted as [longitude, latitude, height?], { lng, lat, height? }, or { longitude, latitude, height? }.',
	})

export const LastMeasurementSchema = z
	.object({
		value: MeasurementValueSchema,

		createdAt: IsoDateTimeSchema.meta({
			description: 'Timestamp of the latest measurement',
			example: '2026-05-15T12:00:00.000Z',
		}),

		sensorId: z.string().meta({
			description: 'ID of the sensor this measurement belongs to',
			example: '60a13611a877b3001b8ffd59',
		}),
	})
	.meta({
		id: 'LastMeasurement',
		description: 'Cached latest measurement for a sensor.',
	})

export const LegacyLatestMeasurementSchema = z
	.object({
		value: z.string().meta({
			description: 'Measured value of the sensor.',
			example: '4.78',
		}),

		createdAt: IsoDateTimeSchema.meta({
			description: 'Timestamp of the latest measurement.',
			example: '2026-05-15T12:00:00.000Z',
		}),
	})
	.meta({
		id: 'LegacyLatestMeasurement',
		description: 'Latest measurement as returned by legacy sensor endpoints.',
	})

export const MeasurementSchema = z
	.object({
		sensorId: z.string().meta({
			description: 'ID of the sensor this measurement belongs to',
			example: '60a13611a877b3001b8ffd59',
		}),

		time: IsoDateTimeSchema.meta({
			description: 'Measurement timestamp',
			example: '2026-05-15T12:00:00.000Z',
		}),

		value: MeasurementValueSchema,

		locationId: MeasurementLocationIdSchema,
	})
	.meta({
		id: 'Measurement',
		description: 'Measurement data.',
	})

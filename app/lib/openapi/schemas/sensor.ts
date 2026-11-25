import * as z from 'zod/v4'

import { IsoDateTimeSchema } from './common'
import { LastMeasurementSchema } from './measurement'

export const UnknownJsonSchema = z.unknown().nullable().meta({
	description: 'Arbitrary JSON data',
})

export const SensorSchema = z
	.object({
		id: z.string().meta({
			description: 'Sensor id',
			example: '60a13611a877b3001b8ffd59',
		}),

		title: z.string().nullable().meta({
			description: 'Sensor title',
			example: 'Temperature',
		}),

		unit: z.string().nullable().meta({
			description: 'Measurement unit',
			example: '°C',
		}),

		sensorType: z.string().nullable().meta({
			description: 'Sensor type',
			example: 'HDC1080',
		}),

		icon: z.string().nullable().meta({
			description: 'Sensor icon',
			example: 'osem-thermometer',
		}),

		status: z.string().nullable().meta({
			description: 'Sensor status',
			example: 'active',
		}),

		createdAt: IsoDateTimeSchema.meta({
			description: 'Sensor creation timestamp',
			example: '2026-05-15T12:00:00.000Z',
		}),

		updatedAt: IsoDateTimeSchema.meta({
			description: 'Sensor update timestamp',
			example: '2026-05-15T12:00:00.000Z',
		}),

		deviceId: z.string().meta({
			description: 'ID of the device this sensor belongs to',
			example: '5bdbe70f55d0ad001a04edc9',
		}),

		sensorWikiType: z.string().nullable().meta({
			example: 'temperature',
		}),

		sensorWikiPhenomenon: z.string().nullable().meta({
			example: 'air_temperature',
		}),

		sensorWikiUnit: z.string().nullable().meta({
			example: 'degree_celsius',
		}),

		lastMeasurement: LastMeasurementSchema.nullable(),

		data: UnknownJsonSchema,

		order: z.number().int().nullable().meta({
			description: 'Display order of the sensor',
			example: 0,
		}),
	})
	.meta({
		id: 'Sensor',
		description: 'Sensor metadata.',
	})

import * as z from 'zod/v4'

export const DeviceIdSchema = z.string().min(1).meta({
	description: 'Unique identifier of the device.',
	example: '5bdbe70f55d0ad001a04edc9',
})

export const DevicePathParamsSchema = z.object({
	deviceId: DeviceIdSchema,
})

export const SensorIdSchema = z.string().min(1).meta({
	description: 'Unique identifier of the sensor.',
	example: '60a13611a877b3001b8ffd59',
})

export const DeviceSensorPathParamsSchema = z.object({
	deviceId: DeviceIdSchema,
	sensorId: SensorIdSchema,
})

export const IsoDateTimeSchema = z.iso.datetime().meta({
	description: 'ISO 8601 timestamp',
	example: '2026-05-18T12:34:56.000Z',
})

export const IsoDateTimeToDateSchema = IsoDateTimeSchema.transform(
	(value) => new Date(value),
)

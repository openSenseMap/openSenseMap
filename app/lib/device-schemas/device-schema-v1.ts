import { z } from 'zod'

export const deviceSchemaSensorSchema = z.object({
	id: z.string().min(1),
	title: z.string().min(1),
	unit: z.string().min(1),
	sensorType: z.string().min(1),
	icon: z.string().optional(),
	sensorWikiType: z.string().optional(),
	sensorWikiPhenomenon: z.string().optional(),
	sensorWikiUnit: z.string().optional(),
})

export const uploadedDeviceSchemaV1 = z
	.object({
		schemaType: z.literal('opensensemap.deviceSchema'),
		schemaVersion: z.literal('1.0.0'),
		id: z.string().min(1),
		name: z.string().min(1),
		version: z.string().min(1),
		description: z.string().optional(),
		tags: z.array(z.string()).optional().default([]),
		sensors: z.array(deviceSchemaSensorSchema).min(1),
	})
	.strict()

export type UploadedDeviceSchemaV1 = z.infer<typeof uploadedDeviceSchemaV1>

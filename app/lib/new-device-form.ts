import { z } from 'zod'
import { uploadedDeviceSchemaV1 } from '~/lib/device-schemas/device-schema-v1'
import { generalInfoSchema } from '~/lib/device-general'
import { deviceLocationInputSchema } from '~/lib/location'

export const newDeviceLocationSubmissionSchema =
	deviceLocationInputSchema.extend({
		elevationLookupConsent: z.boolean().optional(),
	})

export const sensorSchema = z.object({
	title: z.string().min(1, 'Sensor title is required'),
	unit: z.string().min(1, 'Sensor unit is required'),
	sensorType: z.string().min(1, 'Sensor type is required'),
	icon: z.string().optional(),
	image: z.string().optional(),
	id: z.string().optional(),
	sensorWikiType: z.string().optional(),
	sensorWikiPhenomenon: z.string().optional(),
	sensorWikiUnit: z.string().optional(),
})

export const customDeviceSchemaUploadSchema = uploadedDeviceSchemaV1.optional()

export type Sensor = z.infer<typeof sensorSchema>
export type CustomDeviceSchemaUpload = z.infer<
	typeof customDeviceSchemaUploadSchema
>

export const deviceSelectionSchema = z.object({
	model: z.enum(
		[
			'homeV2Lora',
			'homeV2Ethernet',
			'homeV2Wifi',
			'senseBox:Edu',
			'luftdaten.info',
			'custom',
		],
		{
			error: () => 'Please select a device.',
		},
	),
})

export const sensorSelectionSchema = z.object({
	selectedSensors: z
		.array(sensorSchema)
		.min(1, 'Please select at least one sensor'),
	deviceSchema: customDeviceSchemaUploadSchema,
	deviceSchemaVersionId: z.string().optional(),
	deviceSchemaRegistrySelection: z.unknown().optional(),
})

export const advancedSchema = z.record(z.string(), z.unknown())

export const newDeviceSubmissionSchema = z
	.object({
		'general-info': generalInfoSchema,
		location: newDeviceLocationSubmissionSchema,
		'device-selection': deviceSelectionSchema,
		'sensor-selection': sensorSelectionSchema,
		advanced: advancedSchema,
	})
	.superRefine((submission, context) => {
		if (submission['device-selection'].model === 'custom') return

		submission['sensor-selection'].selectedSensors.forEach((sensor, index) => {
			if (sensor.id) return

			context.addIssue({
				code: 'custom',
				message: 'Selected sensor template is invalid.',
				path: ['sensor-selection', 'selectedSensors', index, 'id'],
			})
		})
	})

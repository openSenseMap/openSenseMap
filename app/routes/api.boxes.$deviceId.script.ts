import { type Route } from './+types/api.boxes.$deviceId.script'
import { getDevice } from '~/db/models/device.server'
import type SketchTemplaterConstructor from '@sensebox/sketch-templater'
import * as z from 'zod/v4'
import { ZodOpenApiPathItemObject } from 'zod-openapi'
import { DevicePathParamsSchema } from '~/lib/openapi/schemas/common'
import { StandardResponse } from '~/lib/responses'
import {
	BadRequestErrorSchema,
	badRequestResponse,
	internalServerErrorResponse,
	InternalServerErrorSchema,
	NotFoundErrorSchema,
	notFoundResponse,
} from '~/lib/openapi/errors'

const SketchPortSchema = z.enum(['A', 'B', 'C'])

const SketchOptionsSchema = z
	.object({
		serialPort: z.enum(['Serial1', 'Serial2']).optional().meta({
			description: 'Serial port the SDS011 sensor is connected to.',
			example: 'Serial1',
		}),

		soilDigitalPort: SketchPortSchema.optional().meta({
			description: 'Digital port the SMT50 sensor is connected to.',
			example: 'A',
		}),

		soundMeterPort: SketchPortSchema.optional().meta({
			description: 'Digital port the sound level meter sensor is connected to.',
			example: 'B',
		}),

		windSpeedPort: SketchPortSchema.optional().meta({
			description: 'Digital port the wind speed sensor is connected to.',
			example: 'C',
		}),

		ssid: z.string().optional().meta({
			description: 'SSID of the Wi-Fi network.',
			example: 'MyWiFi',
		}),

		password: z.string().optional().meta({
			description: 'Password of the Wi-Fi network.',
			example: 'super-secret-password',
			format: 'password',
		}),

		devEUI: z.string().optional().meta({
			description: 'devEUI of the TTN device.',
			example: '70B3D57ED0000000',
		}),

		appEUI: z.string().optional().meta({
			description: 'appEUI of the TTN application.',
			example: '70B3D57ED0000000',
		}),

		appKey: z.string().optional().meta({
			description: 'appKey of the TTN application.',
			example: '00000000000000000000000000000000',
		}),

		display_enabled: z.enum(['true', 'false']).optional().meta({
			description: 'Whether to include code for an attached OLED display.',
			example: 'true',
		}),
	})
	.meta({
		id: 'SketchOptions',
		description:
			'Optional sketch generation parameters. For GET requests these are passed as query parameters; for POST requests they are passed as form fields.',
	})

const ArduinoSketchResponseSchema = z.string().meta({
	id: 'ArduinoSketchResponse',
	description: 'Generated Arduino sketch as plain text.',
	example:
		'// Generated Arduino sketch\n#include <Arduino.h>\n\nvoid setup() {}\nvoid loop() {}',
})

export const openapi: ZodOpenApiPathItemObject = {
	get: {
		tags: ['Devices'],
		summary: 'Download the Arduino script for a senseBox',
		description:
			'Generates and returns an Arduino sketch for the specified senseBox. Optional sketch configuration values can be supplied as query parameters.',

		requestParams: {
			path: DevicePathParamsSchema,
			query: SketchOptionsSchema,
		},

		responses: {
			200: {
				description: 'Arduino sketch generated successfully.',
				content: {
					'text/plain': {
						schema: ArduinoSketchResponseSchema,
					},
				},
			},

			400: badRequestResponse(
				BadRequestErrorSchema,
				'Bad request. The device ID is missing or invalid.',
			),

			404: notFoundResponse(NotFoundErrorSchema, 'Device not found.'),

			500: internalServerErrorResponse(
				InternalServerErrorSchema,
				'Internal server error.',
			),
		},
	},

	post: {
		tags: ['Devices'],
		summary: 'Generate the Arduino script for a senseBox from form data',
		description:
			'Generates and returns an Arduino sketch for the specified senseBox. Optional sketch configuration values can be supplied as form fields.',

		requestParams: {
			path: DevicePathParamsSchema,
		},

		requestBody: {
			required: false,
			content: {
				'application/x-www-form-urlencoded': {
					schema: SketchOptionsSchema,
				},
				'multipart/form-data': {
					schema: SketchOptionsSchema,
				},
			},
		},

		responses: {
			200: {
				description: 'Arduino sketch generated successfully.',
				content: {
					'text/plain': {
						schema: ArduinoSketchResponseSchema,
					},
				},
			},

			400: badRequestResponse(
				BadRequestErrorSchema,
				'Bad request. The device ID is missing or invalid.',
			),

			404: notFoundResponse(NotFoundErrorSchema, 'Device not found.'),

			500: internalServerErrorResponse(
				InternalServerErrorSchema,
				'Internal server error.',
			),
		},
	},
}

type SketchTemplater = InstanceType<typeof SketchTemplaterConstructor>
// Both the loading promise as well as the instance are stored, s.t.
// concurrent requests share them and the module is only imported once.
// The module is commonjs, so this is required to make it compatible with ESM imports
let sketchTemplaterLoadPromise: Promise<SketchTemplater> | null = null
let sketchTemplaterInstance: SketchTemplater | null = null

const loadSketchTemplater = async () => {
	if (sketchTemplaterInstance) return sketchTemplaterInstance
	if (sketchTemplaterLoadPromise) return sketchTemplaterLoadPromise

	sketchTemplaterLoadPromise = (async () => {
		try {
			const { default: SketchTemplater } =
				await import('@sensebox/sketch-templater')
			const cfg = {
				// The domain used in the generation of Arduino sketches
				ingress_domain:
					process.env.INGRESS_DOMAIN || 'ingress.opensensemap.org',
			}
			sketchTemplaterInstance = new SketchTemplater(cfg)
			sketchTemplaterLoadPromise = null
			return sketchTemplaterInstance
		} catch (err) {
			sketchTemplaterLoadPromise = null
			throw err
		}
	})()

	return sketchTemplaterLoadPromise
}

type Box = NonNullable<Awaited<ReturnType<typeof getDevice>>>
type BoxForSketch = Box & {
	_id: string
	sensors: Array<Box['sensors'][number] & { _id: string }>
}

const buildBoxForSketch = (
	box: Box,
	formEntries: Record<string, FormDataEntryValue>,
): BoxForSketch => ({
	...box,
	_id: box.id,
	sensors: box.sensors.map((sensor) => ({
		...sensor,
		_id: sensor.id,
	})),
	...formEntries,
})

const handleSketch = async (
	deviceId: string | undefined,
	formEntries: Record<string, FormDataEntryValue>,
): Promise<Response> => {
	if (deviceId === undefined) {
		return StandardResponse.badRequest('Invalid device id specified')
	}

	const box = await getDevice({ id: deviceId })
	if (!box) {
		return StandardResponse.notFound('Device not found')
	}

	const boxForSketch = buildBoxForSketch(box, formEntries)
	const templateSketcher = await loadSketchTemplater()
	const sketch = templateSketcher.generateSketch(boxForSketch, { encoding: '' })
	return new Response(sketch, {
		status: 200,
		headers: { 'Content-Type': 'text/plain; charset=utf-8' },
	})
}

export const loader = async ({
	request,
	params,
}: Route.LoaderArgs): Promise<Response> => {
	try {
		const url = new URL(request.url)
		const formEntries = Object.fromEntries(
			url.searchParams.entries(),
		) as Record<string, FormDataEntryValue>

		const response = await handleSketch(params.deviceId, formEntries)
		return response
	} catch (err: any) {
		return StandardResponse.internalServerError(
			err.message || 'An unexpected error occurred',
		)
	}
}

export const action = async ({
	request,
	params,
}: Route.ActionArgs): Promise<Response> => {
	try {
		const formData = await request.formData()
		const formEntries = Object.fromEntries(formData.entries())
		const response = await handleSketch(params.deviceId, formEntries)
		return response
	} catch (err: any) {
		return StandardResponse.internalServerError(
			err.message || 'An unexpected error occurred',
		)
	}
}

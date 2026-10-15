import { type Route } from './+types/api.boxes.$deviceId.script'
import { getDevice } from '~/db/models/device.server'
import { type User } from '~/db/schema'
import {
	SketchOptionsSchema,
	type SketchOptions,
} from '~/lib/api-schemas/sketch-options'
import { withAuthenticatedUser } from '~/lib/jwt'
import type SketchTemplaterConstructor from '@sensebox/sketch-templater'
import * as z from 'zod/v4'
import { type ZodOpenApiPathItemObject } from 'zod-openapi'
import { DevicePathParamsSchema } from '~/lib/openapi/schemas/common'
import { StandardResponse } from '~/lib/responses'
import {
	BadRequestErrorSchema,
	badRequestResponse,
	ForbiddenErrorSchema,
	forbiddenResponse,
	internalServerErrorResponse,
	InternalServerErrorSchema,
	NotFoundErrorSchema,
	notFoundResponse,
	UnprocessableContentErrorSchema,
	unprocessableContentResponse,
} from '~/lib/openapi/errors'

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
			'Generates and returns an Arduino sketch for an owned senseBox. Requires JWT authorization. Optional sketch configuration values can be supplied as query parameters.',
		security: [{ bearerAuth: [] }],

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

			403: forbiddenResponse(
				ForbiddenErrorSchema,
				'Invalid or missing JWT authorization, or the current user does not own the device.',
			),

			422: unprocessableContentResponse(
				UnprocessableContentErrorSchema,
				'One or more sketch options are invalid.',
			),

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
			'Generates and returns an Arduino sketch for an owned senseBox. Requires JWT authorization. Optional sketch configuration values can be supplied as form fields.',
		security: [{ bearerAuth: [] }],

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

			403: forbiddenResponse(
				ForbiddenErrorSchema,
				'Invalid or missing JWT authorization, or the current user does not own the device.',
			),

			422: unprocessableContentResponse(
				UnprocessableContentErrorSchema,
				'One or more sketch options are invalid.',
			),

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

const buildBoxForSketch = (box: Box, options: SketchOptions) => ({
	...box,
	_id: box.id,
	sensors: box.sensors.map((sensor) => ({
		...sensor,
		_id: sensor.id,
	})),
	sdsSerialPort: options.serialPort,
	soilDigitalPort: options.soilDigitalPort,
	soundMeterPort: options.soundMeterPort,
	windSpeedPort: options.windSpeedPort,
	ssid: options.ssid,
	password: options.password,
	devEUI: options.devEUI,
	appEUI: options.appEUI,
	appKey: options.appKey,
	display_enabled: options.display_enabled,
	access_token: box.useAuth ? box.apiKey : undefined,
})

const handleSketch = async (
	deviceId: string | undefined,
	rawOptions: Record<string, FormDataEntryValue>,
	user: User,
): Promise<Response> => {
	if (deviceId === undefined) {
		return StandardResponse.badRequest('Invalid device id specified')
	}

	const parsedOptions = SketchOptionsSchema.safeParse(rawOptions)
	if (!parsedOptions.success) {
		return StandardResponse.unprocessableContent(
			parsedOptions.error.issues[0]?.message ?? 'Invalid sketch options',
		)
	}

	const box = await getDevice({ id: deviceId })
	if (!box) {
		return StandardResponse.notFound('Device not found')
	}
	if (user.role !== 'admin' && box.userId !== user.id) {
		return StandardResponse.forbidden('You do not own this device')
	}

	const boxForSketch = buildBoxForSketch(box, parsedOptions.data)
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
		return await withAuthenticatedUser(request, async (user) => {
			const url = new URL(request.url)
			const formEntries = Object.fromEntries(
				url.searchParams.entries(),
			) as Record<string, FormDataEntryValue>

			return handleSketch(params.deviceId, formEntries, user)
		})
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
		return await withAuthenticatedUser(request, async (user) => {
			const formData = await request.formData()
			const formEntries = Object.fromEntries(formData.entries())
			return handleSketch(params.deviceId, formEntries, user)
		})
	} catch (err: any) {
		return StandardResponse.internalServerError(
			err.message || 'An unexpected error occurred',
		)
	}
}

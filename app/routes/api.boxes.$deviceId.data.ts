import { type Route } from './+types/api.boxes.$deviceId.data'
import { isValidServiceKey } from '~/db/models/integration.server'
import { StandardResponse } from '~/lib/responses'
import { postNewMeasurements } from '~/services/measurement-service.server'

import * as z from 'zod/v4'
import { type ZodOpenApiPathItemObject } from 'zod-openapi'

import {
	BadRequestErrorSchema,
	ConflictErrorSchema,
	InternalServerErrorSchema,
	NotFoundErrorSchema,
	UnauthorizedErrorSchema,
	UnprocessableContentErrorSchema,
	UnsupportedMediaTypeErrorSchema,
	badRequestResponse,
	conflictResponse,
	internalServerErrorResponse,
	notFoundResponse,
	unauthorizedResponse,
	unprocessableContentResponse,
	unsupportedMediaTypeResponse,
} from '~/lib/openapi/errors'

import { DevicePathParamsSchema } from '~/lib/openapi/schemas/common'
import { MeasurementLocationSchema } from '~/lib/openapi/schemas/measurement'

const PostDeviceDataQueryParamsSchema = z
	.object({
		luftdaten: z.string().optional().meta({
			description:
				'Presence flag. If present, the request body is decoded using the luftdaten decoder. The parameter value is ignored.',
			example: '',
		}),

		hackair: z.string().optional().meta({
			description:
				'Presence flag. If present, the request body is decoded using the hackAIR decoder. The parameter value is ignored.',
			example: '',
		}),
	})
	.meta({
		id: 'PostDeviceDataQueryParams',
		description: 'Query parameters controlling legacy decoder selection.',
	})

const PostDeviceDataHeaderParamsSchema = z
	.object({
		authorization: z.string().optional().meta({
			description: 'Device API key or bearer-style authorization value.',
			example: 'Bearer device-api-key-or-token',
		}),

		'x-osem-device-api-key': z.string().optional().meta({
			description:
				'Alternative HTTP header for authorizing a device when the Authorization header cannot be used.',
			example: 'device-api-key',
		}),
	})
	.meta({
		id: 'PostDeviceDataHeaderParams',
		description: 'Headers accepted when posting measurements to a device.',
	})

const MeasurementJsonArrayItemSchema = z
	.object({
		sensor_id: z.string().optional().meta({
			description: 'ID of the sensor this measurement belongs to.',
			example: '5bdbe70f55d0ad001a04edc9',
		}),

		sensor: z.string().optional().meta({
			description: 'Legacy alias for `sensor_id`.',
			example: '5bdbe70f55d0ad001a04edc9',
		}),

		value: z.union([z.number(), z.string()]).meta({
			description: 'Measurement value.',
			example: 21.5,
		}),

		createdAt: z.iso.datetime().optional().meta({
			description: 'Measurement timestamp. Defaults to current server time.',
			example: '2026-05-22T12:00:00.000Z',
		}),

		location: MeasurementLocationSchema.optional(),
	})
	.meta({
		id: 'MeasurementJsonArrayItem',
		description: 'Single measurement in JSON array notation.',
	})

const MeasurementJsonObjectValueSchema = z.union([
	z.number(),
	z.string(),
	z.tuple([
		z.union([z.number(), z.string()]),
		z.iso.datetime().optional(),
		MeasurementLocationSchema.optional(),
	]),
])

const MeasurementJsonObjectSchema = z
	.record(z.string(), MeasurementJsonObjectValueSchema)
	.meta({
		id: 'MeasurementJsonObject',
		description:
			'JSON object notation. Object keys are sensor IDs. Values can be a measurement value or [value, createdAt?, location?].',
		example: {
			'5bdbe70f55d0ad001a04edc9': 21.5,
			'5bdbe70f55d0ad001a04edc8': [
				42.1,
				'2026-05-22T12:00:00.000Z',
				[7.684, 51.972, 66.6],
			],
		},
	})

const PostDeviceDataJsonRequestSchema = z
	.union([z.array(MeasurementJsonArrayItemSchema), MeasurementJsonObjectSchema])
	.meta({
		id: 'PostDeviceDataJsonRequest',
		description:
			'Measurements submitted as JSON array notation or JSON object notation.',
	})

const PostDeviceDataSuccessResponseSchema = z
	.literal('Measurements saved in box')
	.meta({
		id: 'PostDeviceDataSuccessResponse',
		description: 'Plain text success response.',
		example: 'Measurements saved in box',
	})

const PostDeviceDataCsvRequestSchema = z.string().meta({
	id: 'PostDeviceDataCsvRequest',
	description:
		'CSV measurements, one measurement per line: sensorId,value,createdAt?,lng?,lat?,height?.',
	example:
		'5bdbe70f55d0ad001a04edc9,21.5,2026-05-22T12:00:00.000Z,7.684,51.972,66.6',
})

export const openapi: ZodOpenApiPathItemObject = {
	post: {
		tags: ['Sensors'],
		summary: 'Post multiple new measurements to a device',
		description:
			'Posts multiple measurements to a device. Supports JSON array notation, JSON object notation, CSV, luftdaten-compatible JSON, hackAIR-compatible JSON, and sbx binary formats.',

		requestParams: {
			path: DevicePathParamsSchema,
			query: PostDeviceDataQueryParamsSchema,
			header: PostDeviceDataHeaderParamsSchema,
		},

		requestBody: {
			required: true,
			content: {
				'application/json': {
					schema: PostDeviceDataJsonRequestSchema,
				},

				'text/csv': {
					schema: PostDeviceDataCsvRequestSchema,
				},

				'application/sbx-bytes': {
					schema: {
						type: 'string',
						format: 'binary',
						description:
							'Binary sbx-bytes payload. Each measurement is 16 bytes: 12-byte sensor id + 4-byte float32 value.',
					},
				},

				'application/sbx-bytes-ts': {
					schema: {
						type: 'string',
						format: 'binary',
						description:
							'Binary sbx-bytes-ts payload. Each measurement is 20 bytes: 12-byte sensor id + 4-byte float32 value + 4-byte Unix timestamp.',
					},
				},
			},
		},

		responses: {
			201: {
				description: 'Measurements saved successfully.',
				content: {
					'text/plain': {
						schema: PostDeviceDataSuccessResponseSchema,
					},
				},
			},

			400: badRequestResponse(
				BadRequestErrorSchema,
				'Bad request. This can happen when the device id is missing or the request body is malformed.',
			),

			401: unauthorizedResponse(
				UnauthorizedErrorSchema,
				'Unauthorized. The device access token is missing or invalid.',
			),

			404: notFoundResponse(NotFoundErrorSchema, 'Device not found.'),

			409: conflictResponse(
				ConflictErrorSchema,
				'Conflict. Archived devices are read-only.',
			),

			415: unsupportedMediaTypeResponse(
				UnsupportedMediaTypeErrorSchema,
				'Unsupported media type.',
			),

			422: unprocessableContentResponse(
				UnprocessableContentErrorSchema,
				'Unprocessable content. This can happen when decoding fails, a measurement references a sensor outside the device, a timestamp is too far in the future, or location coordinates are invalid.',
			),

			500: internalServerErrorResponse(
				InternalServerErrorSchema,
				'Internal server error.',
			),
		},
	},
}

export const action = async ({
	request,
	params,
}: Route.ActionArgs): Promise<Response> => {
	try {
		const deviceId = params.deviceId
		if (deviceId === undefined)
			return StandardResponse.badRequest('Invalid device id specified')

		const searchParams = new URL(request.url).searchParams
		const luftdaten = searchParams.get('luftdaten') !== null
		const hackair = searchParams.get('hackair') !== null

		const contentType = request.headers.get('content-type') || ''
		const serviceKey = request.headers.get('x-service-key')
		const authorization =
			request.headers.get('authorization') ??
			request.headers.get('x-osem-device-api-key')

		const isTrustedService = await isValidServiceKey(serviceKey)

		let body: any
		if (contentType.includes('application/json')) {
			body = await request.json()
		} else if (contentType.includes('text/csv')) {
			body = await request.text()
		} else if (contentType.includes('application/sbx-bytes')) {
			body = await request.arrayBuffer()
		} else {
			body = await request.text()
		}

		await postNewMeasurements(deviceId, body, {
			contentType,
			luftdaten,
			hackair,
			authorization: isTrustedService ? undefined : authorization,
			isTrustedService,
		})

		return new Response('Measurements saved in box', {
			status: 201,
			headers: {
				'Content-Type': 'text/plain; charset=utf-8',
			},
		})
	} catch (err: any) {
		// Handle different error types
		if (err.name === 'UnauthorizedError')
			return StandardResponse.unauthorized(err.message)

		if (err.name === 'ModelError' && err.type === 'UnprocessableEntityError')
			return StandardResponse.unprocessableContent(err.message)

		if (err.name === 'UnsupportedMediaTypeError')
			return StandardResponse.unsupportedMediaType(err.message)

		if (err.name === 'ArchivedDeviceError')
			return StandardResponse.conflict(
				err.message || 'Archived devices are read-only',
			)

		return StandardResponse.internalServerError(
			err.message || 'An unexpected error occurred',
		)
	}
}

import { type Route } from './+types/api.boxes.$deviceId.sensors'
import { StandardResponse } from '~/lib/responses'
import { getLatestMeasurements } from '~/services/measurement-service.server'
import { z } from 'zod'
import { type ZodOpenApiPathItemObject } from 'zod-openapi'
import {
	BadRequestErrorSchema,
	badRequestResponse,
	internalServerErrorResponse,
	InternalServerErrorSchema,
	NotFoundErrorSchema,
	notFoundResponse,
} from '~/lib/openapi/errors'
import { DevicePathParamsSchema } from '~/lib/openapi/schemas/common'
import { apiMessages } from '~/lib/openapi/messages'
import { parsePathParams } from '~/lib/request-parsing'

const messages = {
	invalidCount:
		'Illegal value for parameter count. allowed values: numbers from 1 to 100',
}

const DeviceSensorsQueryParamsSchema = z.object({
	count: z.coerce.number().int().min(1).max(100).optional().meta({
		description:
			'Number of measurements to retrieve for every sensor. Allowed values are numbers from 1 to 100.',
		example: 5,
	}),
})

const SensorWithLatestMeasurementSchema = z
	.object({
		_id: z.string().optional(),
		id: z.string().optional(),

		title: z.string().nullable().optional(),
		unit: z.string().nullable().optional(),
		sensorType: z.string().nullable().optional(),
		icon: z.string().nullable().optional(),

		lastMeasurement: z
			.object({
				value: z.union([z.string(), z.number()]).nullable(),
				createdAt: z.string(),
			})
			.nullable()
			.optional(),
	})
	.catchall(z.unknown())
	.meta({
		id: 'SensorWithLatestMeasurement',
		description: 'Sensor metadata enriched with latest measurement data.',
	})

const DeviceWithSensorsSchema = z
	.object({
		id: z.string().meta({
			description: 'Device id',
			example: '5bdbe70f55d0ad001a04edc9',
		}),

		sensors: z.array(SensorWithLatestMeasurementSchema).meta({
			description:
				'Sensors of this device, each enriched with latest measurement data.',
		}),
	})
	.meta({
		id: 'DeviceWithSensors',
		description: 'Device including sensors with their latest measurement data.',
	})

export const openapi: ZodOpenApiPathItemObject = {
	get: {
		tags: ['Sensors'],
		summary: 'Get latest measurements of all sensors of a device',
		description:
			'Returns the specified device with its sensors. Each sensor is enriched with latest measurement data. The optional `count` query parameter controls how many measurements are retrieved per sensor, depending on service behavior.',

		requestParams: {
			path: DevicePathParamsSchema,
			query: DeviceSensorsQueryParamsSchema,
		},

		responses: {
			200: {
				description: 'Device sensors returned successfully.',
				content: {
					'application/json': {
						schema: DeviceWithSensorsSchema,
					},
				},
			},

			400: badRequestResponse(
				BadRequestErrorSchema,
				'Bad request. The `count` query parameter must be a number from 1 to 100.',
			),

			404: notFoundResponse(NotFoundErrorSchema, 'Device not found.'),

			500: internalServerErrorResponse(
				InternalServerErrorSchema,
				'Internal server error.',
			),
		},
	},
}

const parseDeviceSensorsQueryParams = (
	request: Request,
): z.output<typeof DeviceSensorsQueryParamsSchema> | Response => {
	const url = new URL(request.url)

	const parsed = DeviceSensorsQueryParamsSchema.safeParse({
		count: url.searchParams.get('count') ?? undefined,
	})

	if (!parsed.success) {
		return StandardResponse.badRequest(
			parsed.error.issues[0]?.message ?? messages.invalidCount,
		)
	}

	return parsed.data
}

export const loader = async ({
	request,
	params,
}: Route.LoaderArgs): Promise<Response> => {
	try {
		const parsedParams = parsePathParams(params, DevicePathParamsSchema, {
			message: apiMessages.deviceIdRequired,
		})

		if (parsedParams instanceof Response) {
			return parsedParams
		}

		const queryParams = parseDeviceSensorsQueryParams(request)

		if (queryParams instanceof Response) {
			return queryParams
		}

		const deviceWithSensors = await getLatestMeasurements(
			parsedParams.deviceId,
			queryParams.count,
		)

		if (!deviceWithSensors) {
			return StandardResponse.notFound(apiMessages.deviceNotFound)
		}

		const responseParsed =
			await DeviceWithSensorsSchema.safeParseAsync(deviceWithSensors)

		if (!responseParsed.success) {
			return StandardResponse.internalServerError()
		}

		return StandardResponse.ok(responseParsed.data)
	} catch {
		return StandardResponse.internalServerError()
	}
}

import { type Route } from './+types/api.boxes.$deviceId.sensors.$sensorId'
import { StandardResponse } from '~/lib/responses'
import { getLatestMeasurementsForSensor } from '~/services/measurement-service.server'

import * as z from 'zod/v4'
import { type ZodOpenApiPathItemObject } from 'zod-openapi'

import { DeviceSensorPathParamsSchema } from '~/lib/openapi/schemas/common'

import {
	BadRequestErrorSchema,
	InternalServerErrorSchema,
	NotFoundErrorSchema,
	badRequestResponse,
	internalServerErrorResponse,
	notFoundResponse,
} from '~/lib/openapi/errors'

import { parsePathParams } from '~/lib/request-parsing'
import { LegacyLatestMeasurementSchema } from '~/lib/openapi/schemas/measurement'

const LatestSensorMeasurementQueryParamsSchema = z
	.object({
		onlyValue: z.enum(['true', 'false']).optional().meta({
			description:
				'If set to `true`, only the latest measured value is returned instead of the full sensor object.',
			example: 'false',
		}),
	})
	.meta({
		id: 'LatestSensorMeasurementQueryParams',
		description:
			'Query parameters for retrieving the latest sensor measurement.',
	})

const LatestSensorResponseSchema = z
	.object({
		_id: z.string().meta({
			description: 'Unique identifier of the sensor.',
			example: '6649b23072c4c40007105953',
		}),

		id: z.string().optional().meta({
			description:
				'Unique identifier of the sensor. `_id` is kept for legacy compatibility.',
			example: '6649b23072c4c40007105953',
		}),

		title: z.string().nullable().optional().meta({
			description: 'The title of the phenomenon the sensor observes.',
			example: 'Temperatur',
		}),

		sensorType: z.string().nullable().optional().meta({
			description: 'The type of the sensor.',
			example: 'HDC1080',
		}),

		unit: z.string().nullable().optional().meta({
			description: 'The unit of the phenomenon the sensor observes.',
			example: '°C',
		}),

		icon: z.string().nullable().optional().meta({
			description: 'Visual representation of this sensor.',
			example: 'osem-thermometer',
		}),

		lastMeasurement: LegacyLatestMeasurementSchema.nullable().optional(),
	})
	.catchall(z.unknown())
	.meta({
		id: 'LatestSensorResponse',
		description:
			'Sensor metadata enriched with the latest measurement. `_id` is returned for legacy compatibility.',
	})

const OnlyValueResponseSchema = z
	.union([z.string(), z.number(), z.null()])
	.meta({
		id: 'LatestSensorOnlyValueResponse',
		description:
			'Only the latest measured value. Returns `null` if no latest measurement exists.',
		example: '4.78',
	})

export const openapi: ZodOpenApiPathItemObject = {
	get: {
		tags: ['Measurements'],
		summary: 'Get latest measurement of a sensor',
		description:
			'Returns the latest measurement of a sensor. By default, the response contains sensor metadata and the latest measurement. If `onlyValue=true`, only the measured value is returned.',

		requestParams: {
			path: DeviceSensorPathParamsSchema,
			query: LatestSensorMeasurementQueryParamsSchema,
		},

		responses: {
			200: {
				description: 'Latest sensor measurement returned successfully.',
				content: {
					'application/json': {
						schema: z.union([
							LatestSensorResponseSchema,
							OnlyValueResponseSchema,
						]),
					},
				},
			},

			400: badRequestResponse(
				BadRequestErrorSchema,
				'Bad request. The device ID, sensor ID, or query parameters are invalid.',
			),

			404: notFoundResponse(NotFoundErrorSchema, 'Device or sensor not found.'),

			500: internalServerErrorResponse(
				InternalServerErrorSchema,
				'Internal server error.',
			),
		},
	},
}

const parseQueryParams = (
	request: Request,
): z.output<typeof LatestSensorMeasurementQueryParamsSchema> | Response => {
	const searchParams = new URL(request.url).searchParams

	const parsed = LatestSensorMeasurementQueryParamsSchema.safeParse({
		onlyValue: searchParams.get('onlyValue') ?? undefined,
	})

	if (!parsed.success) {
		return StandardResponse.badRequest(
			parsed.error.issues[0]?.message ?? 'Invalid query parameters',
		)
	}

	return parsed.data
}

export const loader = async ({
	request,
	params,
}: Route.LoaderArgs): Promise<Response> => {
	try {
		const parsedParams = parsePathParams(params, DeviceSensorPathParamsSchema, {
			message: 'Invalid device id or sensor id specified',
		})

		if (parsedParams instanceof Response) {
			return parsedParams
		}

		const queryParams = parseQueryParams(request)

		if (queryParams instanceof Response) {
			return queryParams
		}

		const onlyValue = queryParams.onlyValue === 'true'

		const meas = await getLatestMeasurementsForSensor(
			parsedParams.deviceId,
			parsedParams.sensorId,
			undefined,
		)

		if (meas == null) {
			return StandardResponse.notFound('Device not found.')
		}

		if (onlyValue) {
			const value = meas.lastMeasurement?.value ?? null

			const responseParsed = await OnlyValueResponseSchema.safeParseAsync(value)

			if (!responseParsed.success) {
				return StandardResponse.internalServerError()
			}

			return StandardResponse.ok(responseParsed.data)
		}

		const sensorResponse = {
			...meas,
			_id: meas.id,
			lastMeasurement: meas.lastMeasurement
				? {
						...meas.lastMeasurement,
						value:
							typeof meas.lastMeasurement.value === 'number'
								? String(meas.lastMeasurement.value)
								: meas.lastMeasurement.value,
					}
				: null,
		}

		const responseParsed =
			await LatestSensorResponseSchema.safeParseAsync(sensorResponse)

		if (!responseParsed.success) {
			return StandardResponse.internalServerError()
		}

		return StandardResponse.ok(responseParsed.data)
	} catch {
		return StandardResponse.internalServerError()
	}
}

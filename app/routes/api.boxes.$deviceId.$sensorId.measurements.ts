import { type Route } from './+types/api.boxes.$deviceId.$sensorId.measurements'
import { getUserDevices } from '~/db/models/device.server'
import {
	deleteMeasurementsForSensor,
	deleteSensorMeasurementsForTimeRange,
	deleteSensorMeasurementsForTimes,
} from '~/db/models/measurement.server'
import { withAuthenticatedUser } from '~/lib/jwt'
import { StandardResponse } from '~/lib/responses'

import * as z from 'zod/v4'
import { type ZodOpenApiPathItemObject } from 'zod-openapi'

import {
	DeviceSensorPathParamsSchema,
	IsoDateTimeToDateSchema,
} from '~/lib/openapi/schemas/common'

import {
	BadRequestErrorSchema,
	ForbiddenErrorSchema,
	InternalServerErrorSchema,
	MessageResponseSchema,
	MethodNotAllowedErrorSchema,
	NotFoundErrorSchema,
	messageResponse,
	badRequestResponse,
	forbiddenResponse,
	internalServerErrorResponse,
	methodNotAllowedResponse,
	notFoundResponse,
} from '~/lib/openapi/errors'

import { parsePathParams } from '~/lib/request-parsing'

const DeleteSensorMeasurementsQueryParamsSchema = z
	.object({
		'from-date': IsoDateTimeToDateSchema.optional().meta({
			description: 'Beginning date of the measurement range to delete.',
			example: '2026-05-13T12:00:00.000Z',
		}),

		'to-date': IsoDateTimeToDateSchema.optional().meta({
			description: 'End date of the measurement range to delete.',
			example: '2026-05-15T12:00:00.000Z',
		}),

		timestamps: z
			.union([IsoDateTimeToDateSchema, z.array(IsoDateTimeToDateSchema)])
			.optional()
			.transform((value) => {
				if (value === undefined) return undefined
				return Array.isArray(value) ? value : [value]
			})
			.meta({
				description: 'One or more exact measurement timestamps to delete.',
				example: ['2026-05-15T12:00:00.000Z'],
			}),

		deleteAllMeasurements: z.enum(['true', 'false']).optional().meta({
			description: 'Set to `true` to delete all measurements of this sensor.',
			example: 'true',
		}),
	})
	.meta({
		id: 'DeleteSensorMeasurementsQueryParams',
		description:
			'Query parameters selecting which measurements should be deleted.',
	})

export const openapi: ZodOpenApiPathItemObject = {
	delete: {
		tags: ['Measurements'],
		summary: 'Delete measurements of a sensor',
		description:
			'Deletes measurements for the specified sensor. The measurements to delete are selected via query parameters. You can delete all measurements, delete specific timestamps, or delete a time range using `from-date` and `to-date`.',
		security: [{ bearerAuth: [] }],

		requestParams: {
			path: DeviceSensorPathParamsSchema,
			query: DeleteSensorMeasurementsQueryParamsSchema,
		},

		responses: {
			200: messageResponse('Measurements deleted successfully.'),

			400: badRequestResponse(
				BadRequestErrorSchema,
				'Bad request. This can happen for invalid query parameters or invalid parameter combinations.',
			),

			403: forbiddenResponse(
				ForbiddenErrorSchema,
				'Invalid JWT authorization or the authenticated user is not allowed to delete data of the given device.',
			),

			404: notFoundResponse(
				NotFoundErrorSchema,
				'Sensor not found or not part of this device.',
			),

			405: methodNotAllowedResponse(
				MethodNotAllowedErrorSchema,
				'Method not allowed. Endpoint only supports DELETE.',
			),

			500: internalServerErrorResponse(
				InternalServerErrorSchema,
				'Internal server error.',
			),
		},
	},
}

const parseQueryParams = (
	request: Request,
): z.output<typeof DeleteSensorMeasurementsQueryParamsSchema> | Response => {
	const url = new URL(request.url)
	const timestamps = url.searchParams.getAll('timestamps')

	const params = {
		'from-date': url.searchParams.get('from-date') ?? undefined,
		'to-date': url.searchParams.get('to-date') ?? undefined,
		deleteAllMeasurements:
			url.searchParams.get('deleteAllMeasurements') ?? undefined,
		timestamps:
			timestamps.length === 0
				? undefined
				: timestamps.length === 1
					? timestamps[0]
					: timestamps,
	}

	const parsed = DeleteSensorMeasurementsQueryParamsSchema.safeParse(params)

	if (!parsed.success) {
		return StandardResponse.badRequest(
			parsed.error.issues[0]?.message ?? 'Invalid query parameters',
		)
	}

	return parsed.data
}

export async function action({ request, params }: Route.ActionArgs) {
	if (request.method !== 'DELETE') {
		return StandardResponse.methodNotAllowed('Endpoint only supports DELETE')
	}

	const parsedParams = parsePathParams(params, DeviceSensorPathParamsSchema, {
		message: 'Invalid device id or sensor id specified',
	})

	if (parsedParams instanceof Response) {
		return parsedParams
	}

	return withAuthenticatedUser(request, async (user) => {
		try {
			const userDevices = await getUserDevices(user.id)

			const device = userDevices.find((d) => d.id === parsedParams.deviceId)

			if (!device) {
				return StandardResponse.forbidden(
					'You are not allowed to delete data of the given device',
				)
			}

			if (!device.sensors.some((s) => s.id === parsedParams.sensorId)) {
				return StandardResponse.notFound(
					`Sensor with id ${parsedParams.sensorId} not found or not part of this device`,
				)
			}

			const queryParams = parseQueryParams(request)

			if (queryParams instanceof Response) {
				return queryParams
			}

			let count = 0

			if (queryParams.deleteAllMeasurements === 'true') {
				count = (await deleteMeasurementsForSensor(parsedParams.sensorId)).count
			} else if (queryParams.timestamps) {
				count = (
					await deleteSensorMeasurementsForTimes(
						parsedParams.sensorId,
						queryParams.timestamps,
					)
				).count
			} else if (queryParams['from-date'] && queryParams['to-date']) {
				count = (
					await deleteSensorMeasurementsForTimeRange(
						parsedParams.sensorId,
						queryParams['from-date'],
						queryParams['to-date'],
					)
				).count
			}

			const responseParsed = await MessageResponseSchema.safeParseAsync({
				message: `Successfully deleted ${count} of sensor ${parsedParams.sensorId}`,
			})

			if (!responseParsed.success) {
				return StandardResponse.internalServerError()
			}

			return StandardResponse.ok(responseParsed.data)
		} catch (err: any) {
			return StandardResponse.internalServerError(
				err.message || 'An unexpected error occured',
			)
		}
	})
}

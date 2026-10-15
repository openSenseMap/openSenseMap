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
	OkMessageResponseSchema,
} from '~/lib/openapi/schemas/common'

import {
	BadRequestErrorSchema,
	ForbiddenErrorSchema,
	InternalServerErrorSchema,
	MethodNotAllowedErrorSchema,
	NotFoundErrorSchema,
	badRequestResponse,
	forbiddenResponse,
	internalServerErrorResponse,
	methodNotAllowedResponse,
	notFoundResponse,
} from '~/lib/openapi/errors'

import { parsePathParams } from '~/lib/request-parsing'

const TimestampListSchema = z.preprocess((value) => {
	const values = Array.isArray(value) ? value : [value]
	return values.flatMap((entry) =>
		typeof entry === 'string' ? entry.split(',') : entry,
	)
}, z.array(IsoDateTimeToDateSchema).min(1))

const DeleteAllMeasurementsSchema = z
	.preprocess(
		(value) => (typeof value === 'boolean' ? String(value) : value),
		z.enum(['true', 'false']),
	)
	.transform((value) => value === 'true')

const DeleteSensorMeasurementsQueryParamsSchema = z
	.object({
		'from-date': IsoDateTimeToDateSchema.optional().meta({
			description: 'Beginning date of the measurement range to delete.',
			example: '2026-05-13T12:00:00.000Z',
		}),
		fromDate: IsoDateTimeToDateSchema.optional().meta({
			description: 'Legacy camel-case alias for `from-date`.',
		}),

		'to-date': IsoDateTimeToDateSchema.optional().meta({
			description: 'End date of the measurement range to delete.',
			example: '2026-05-15T12:00:00.000Z',
		}),
		toDate: IsoDateTimeToDateSchema.optional().meta({
			description: 'Legacy camel-case alias for `to-date`.',
		}),

		timestamps: TimestampListSchema.optional().meta({
			description:
				'One or more exact measurement timestamps to delete. Repeated and comma-separated values are accepted.',
			example: ['2026-05-15T12:00:00.000Z'],
		}),

		deleteAllMeasurements: DeleteAllMeasurementsSchema.optional().meta({
			description: 'Set to `true` to delete all measurements of this sensor.',
			example: 'true',
		}),
	})
	.meta({
		id: 'DeleteSensorMeasurementsQueryParams',
		description:
			'Query parameters selecting which measurements should be deleted. The same fields are also accepted in a JSON request body.',
	})

export const openapi: ZodOpenApiPathItemObject = {
	delete: {
		tags: ['Measurements'],
		summary: 'Delete measurements of a sensor',
		description:
			'Deletes measurements for the specified sensor. Selectors can be supplied as legacy JSON or as query parameters. Specify exactly one of `deleteAllMeasurements=true`, `timestamps`, or a complete `from-date`/`to-date` range.',
		security: [{ bearerAuth: [] }],

		requestParams: {
			path: DeviceSensorPathParamsSchema,
			query: DeleteSensorMeasurementsQueryParamsSchema,
		},

		requestBody: {
			required: false,
			content: {
				'application/json': {
					schema: DeleteSensorMeasurementsQueryParamsSchema,
				},
			},
		},

		responses: {
			200: {
				description: 'Measurements deleted successfully.',
				content: {
					'application/json': {
						schema: OkMessageResponseSchema,
					},
				},
			},

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

type DeleteSensorMeasurementsSelector = {
	fromDate?: Date
	toDate?: Date
	timestamps?: Date[]
	deleteAllMeasurements: boolean
}

const selectorParameterNames = [
	'from-date',
	'fromDate',
	'to-date',
	'toDate',
	'timestamps',
	'deleteAllMeasurements',
] as const

const parseSelectorParams = async (
	request: Request,
): Promise<DeleteSensorMeasurementsSelector | Response> => {
	let body: Record<string, unknown> = {}
	const contentType = request.headers.get('content-type')?.toLowerCase() ?? ''

	if (contentType.includes('application/json')) {
		const rawBody = await request.text()

		if (rawBody.trim()) {
			try {
				const parsedBody: unknown = JSON.parse(rawBody)
				if (
					typeof parsedBody !== 'object' ||
					parsedBody === null ||
					Array.isArray(parsedBody)
				) {
					return StandardResponse.badRequest(
						'JSON request body must be an object',
					)
				}
				body = parsedBody as Record<string, unknown>
			} catch {
				return StandardResponse.badRequest('Invalid JSON in request body')
			}
		}
	}

	const mergedParams: Record<string, unknown> = { ...body }
	const searchParams = new URL(request.url).searchParams

	for (const name of selectorParameterNames) {
		const values = searchParams.getAll(name)
		if (values.length === 1) mergedParams[name] = values[0]
		if (values.length > 1) mergedParams[name] = values
	}

	const parsed =
		DeleteSensorMeasurementsQueryParamsSchema.safeParse(mergedParams)

	if (!parsed.success) {
		return StandardResponse.badRequest(
			parsed.error.issues[0]?.message ?? 'Invalid deletion selector',
		)
	}

	const fromDate = parsed.data.fromDate ?? parsed.data['from-date']
	const toDate = parsed.data.toDate ?? parsed.data['to-date']

	if (Boolean(fromDate) !== Boolean(toDate)) {
		return StandardResponse.badRequest(
			'from-date and to-date need to be specified simultaneously',
		)
	}

	if (fromDate && toDate && fromDate > toDate) {
		return StandardResponse.badRequest('from-date must not be after to-date')
	}

	const deleteAllMeasurements = parsed.data.deleteAllMeasurements === true
	const selectionCount =
		Number(deleteAllMeasurements) +
		Number(parsed.data.timestamps !== undefined) +
		Number(fromDate !== undefined && toDate !== undefined)

	if (selectionCount !== 1) {
		return StandardResponse.badRequest(
			'Specify exactly one of deleteAllMeasurements=true, timestamps, or a from-date/to-date range',
		)
	}

	return {
		fromDate,
		toDate,
		timestamps: parsed.data.timestamps,
		deleteAllMeasurements,
	}
}

const formatLegacyTimestamp = (date: Date): string =>
	date.toISOString().replace(/\.\d{3}Z$/, 'Z')

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

			const selector = await parseSelectorParams(request)

			if (selector instanceof Response) {
				return selector
			}

			let message: string
			let deletedCount: number

			if (selector.deleteAllMeasurements) {
				const result = await deleteMeasurementsForSensor(parsedParams.sensorId)
				deletedCount = result.count
				message = `Successfully deleted all measurements of sensor ${parsedParams.sensorId}`
			} else if (selector.timestamps) {
				const result = await deleteSensorMeasurementsForTimes(
					parsedParams.sensorId,
					selector.timestamps,
				)
				deletedCount = result.count
				message = `Successfully deleted ${selector.timestamps.length} measurements of sensor ${parsedParams.sensorId}`
			} else if (selector.fromDate && selector.toDate) {
				const result = await deleteSensorMeasurementsForTimeRange(
					parsedParams.sensorId,
					selector.fromDate,
					selector.toDate,
				)
				deletedCount = result.count
				message = `Successfully deleted measurements between ${formatLegacyTimestamp(selector.fromDate)} and ${formatLegacyTimestamp(selector.toDate)} of sensor ${parsedParams.sensorId}`
			} else {
				return StandardResponse.internalServerError(
					'Validated deletion selector is incomplete',
				)
			}

			if (deletedCount === 0) {
				return StandardResponse.notFound(
					'No matching measurements for specified query',
				)
			}

			const responseParsed = await OkMessageResponseSchema.safeParseAsync({
				code: 'Ok',
				message,
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

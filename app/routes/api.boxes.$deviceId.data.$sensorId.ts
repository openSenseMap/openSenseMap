import { type Params } from 'react-router'
import { type Route } from './+types/api.boxes.$deviceId.data.$sensorId'
import { getMeasurements } from '~/db/models/sensor.server'
import { type Measurement } from '~/db/schema'
import { convertToCsv } from '~/lib/csv'
import {
	type TransformedMeasurement,
	transformOutliers,
} from '~/lib/outlier-transform'
import { parseDateParam, parseEnumParam } from '~/lib/params'
import { StandardResponse } from '~/lib/responses'
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
import { DeviceSensorPathParamsSchema } from '~/lib/openapi/schemas/common'
import {
	DateRangeQuerySchema,
	DelimiterSchema,
	OutputFormatSchema,
	QueryDownloadSchema,
	SeparatorSchema,
} from '~/lib/api-schemas/query'

const SensorDataQueryParamsSchema = DateRangeQuerySchema.extend({
	outliers: z.enum(['replace', 'mark']).optional().meta({
		description:
			'Enables outlier calculation. `mark` adds `isOutlier` to each measurement. `replace` replaces outlier values according to the outlier transformation.',
		example: 'mark',
	}),

	'outlier-window': z.coerce.number().int().min(1).max(50).default(15).meta({
		description:
			'Size of the moving window used as base to calculate outliers. Allowed values are numbers between 1 and 50.',
		example: 15,
	}),

	format: OutputFormatSchema,

	download: QueryDownloadSchema,

	delimiter: DelimiterSchema.meta({
		description:
			'Only for CSV responses. Controls the CSV delimiter. Defaults to `comma`. Do not use together with `separator`.',
	}),

	separator: SeparatorSchema,
}).meta({
	id: 'SensorDataQueryParams',
	description:
		'Query parameters for retrieving measurements of a single sensor.',
})

const SensorMeasurementSchema = z
	.object({
		sensorId: z.string().meta({
			description: 'ID of the sensor this measurement belongs to',
			example: '6649b23072c4c40007105953',
		}),

		time: z.iso.datetime().meta({
			description: 'Measurement timestamp',
			example: '2025-11-06T23:59:57.189Z',
		}),

		value: z.number().nullable().meta({
			description: 'Measured value',
			example: 4.78,
		}),

		locationId: z.union([z.string(), z.number()]).nullable().meta({
			description:
				'ID of the location associated with this measurement. Depending on serialization this may be returned as a string or number.',
			example: '5752066',
		}),

		isOutlier: z.boolean().optional().meta({
			description:
				'Only present when outlier calculation is enabled via the `outliers` query parameter.',
			example: false,
		}),
	})
	.meta({
		id: 'SensorMeasurement',
		description: 'Measurement of a single sensor.',
	})

const SensorMeasurementsJsonResponseSchema = z
	.array(SensorMeasurementSchema)
	.meta({
		id: 'SensorMeasurementsJsonResponse',
		description:
			'Up to 10000 measurements from a sensor for the requested time frame.',
		example: [
			{
				sensorId: '6649b23072c4c40007105953',
				time: '2025-11-06T23:59:57.189Z',
				value: 4.78,
				locationId: '5752066',
			},
			{
				sensorId: '6649b23072c4c40007105953',
				time: '2025-11-06T23:57:06.030Z',
				value: 4.13,
				locationId: '5752066',
			},
		],
	})

const SensorMeasurementsCsvResponseSchema = z.string().meta({
	id: 'SensorMeasurementsCsvResponse',
	description:
		'CSV response with one measurement per row. The delimiter is controlled by the `delimiter` or `separator` query parameter.',
	example:
		'createdAt,value\n2023-09-29T08:06:13.254Z,6.38\n2023-09-29T08:06:12.312Z,6.38',
})

export const openapi: ZodOpenApiPathItemObject = {
	get: {
		tags: ['Sensors'],
		summary: 'Get measurements from a sensor',
		description:
			'Get up to 10000 measurements from a sensor for a specific time frame. `from-date` and `to-date` are optional; if omitted, the last 48 hours are used. The documented maximum time frame is one month. JSON and CSV response formats are supported. If `download=true`, a `Content-Disposition` header is set.',

		requestParams: {
			path: DeviceSensorPathParamsSchema,
			query: SensorDataQueryParamsSchema,
		},

		responses: {
			200: {
				description: 'Measurements returned successfully.',
				headers: {
					'Content-Disposition': {
						description:
							'Only present when `download=true` or when `format=csv`. Forces browsers to download the response.',
						schema: {
							type: 'string',
							example: 'attachment; filename=6649b23072c4c40007105953.csv',
						},
					},
				},
				content: {
					'application/json': {
						schema: SensorMeasurementsJsonResponseSchema,
					},
					'text/csv': {
						schema: SensorMeasurementsCsvResponseSchema,
					},
				},
			},

			400: badRequestResponse(
				BadRequestErrorSchema,
				'Bad request. This can happen for invalid dates, invalid enum parameters, or an invalid outlier window.',
			),

			404: notFoundResponse(NotFoundErrorSchema, 'Device or sensor not found.'),

			500: internalServerErrorResponse(
				InternalServerErrorSchema,
				'Internal server error.',
			),
		},
	},
}

export const loader = async ({
	request,
	params,
}: Route.LoaderArgs): Promise<Response> => {
	try {
		const collected = collectParameters(request, params)
		if (collected instanceof Response) return collected
		const {
			sensorId,
			outliers,
			outlierWindow,
			fromDate,
			toDate,
			format,
			download,
			delimiter,
		} = collected

		let meas: Measurement[] | TransformedMeasurement[] = await getMeasurements(
			sensorId,
			fromDate.toISOString(),
			toDate.toISOString(),
		)
		if (meas == null) return StandardResponse.notFound('Device not found.')

		if (outliers)
			meas = transformOutliers(meas, outlierWindow, outliers == 'replace')

		let headers: HeadersInit = {
			'content-type':
				format == 'json'
					? 'application/json; charset=utf-8'
					: 'text/csv; charset=utf-8',
		}
		if (download) {
			headers['Content-Disposition'] =
				`attachment; filename=${sensorId}.${format}`
		}
		const responseInit: ResponseInit = {
			status: 200,
			headers: headers,
		}

		if (format == 'json') return Response.json(meas, responseInit)
		else {
			const csv = getCsv(meas, delimiter == 'comma' ? ',' : ';')
			return new Response(csv, responseInit)
		}
	} catch {
		return StandardResponse.internalServerError()
	}
}

function collectDelimiterParam(url: URL): 'comma' | 'semicolon' | Response {
	const delimiterParam = url.searchParams.get('delimiter')
	const separatorParam = url.searchParams.get('separator')

	if (delimiterParam !== null && separatorParam !== null) {
		return StandardResponse.badRequest(
			'Please specify only one of delimiter or separator.',
		)
	}

	const paramName = delimiterParam !== null ? 'delimiter' : 'separator'
	const value = delimiterParam ?? separatorParam

	if (value === null) return 'comma'

	if (value !== 'comma' && value !== 'semicolon') {
		return StandardResponse.badRequest(
			`Illegal value for parameter ${paramName}. Allowed values: comma, semicolon`,
		)
	}

	return value
}

function collectParameters(
	request: Request,
	params: Params<string>,
):
	| Response
	| {
			deviceId: string
			sensorId: string
			outliers: string | null
			outlierWindow: number
			fromDate: Date
			toDate: Date
			format: string | null
			download: boolean
			delimiter: string
	  } {
	// deviceId is there for legacy reasons
	const deviceId = params.deviceId
	if (deviceId === undefined)
		return StandardResponse.badRequest('Invalid device id specified')
	const sensorId = params.sensorId
	if (sensorId === undefined)
		return StandardResponse.badRequest('Invalid sensor id specified')

	const url = new URL(request.url)

	const outliers = parseEnumParam(url, 'outliers', ['replace', 'mark'], null)
	if (outliers instanceof Response) return outliers

	const outlierWindowParam = url.searchParams.get('outlier-window')
	let outlierWindow = 15

	if (outlierWindowParam !== null) {
		outlierWindow = Number(outlierWindowParam)

		if (
			!Number.isInteger(outlierWindow) ||
			outlierWindow < 1 ||
			outlierWindow > 50
		) {
			return StandardResponse.badRequest(
				'Illegal value for parameter outlier-window. Allowed values: numbers between 1 and 50',
			)
		}
	}

	const fromDate = parseDateParam(
		url,
		'from-date',
		new Date(new Date().setDate(new Date().getDate() - 2)),
	)
	if (fromDate instanceof Response) return fromDate

	const toDate = parseDateParam(url, 'to-date', new Date())
	if (toDate instanceof Response) return toDate

	const format = parseEnumParam(url, 'format', ['json', 'csv'], 'json')
	if (format instanceof Response) return format

	const downloadParam = parseEnumParam(url, 'download', ['true', 'false'], null)

	if (downloadParam instanceof Response) return downloadParam

	const delimiter = collectDelimiterParam(url)
	if (delimiter instanceof Response) return delimiter

	return {
		deviceId,
		sensorId,
		outliers: outliers as 'replace' | 'mark' | null,
		outlierWindow,
		fromDate,
		toDate,
		format,
		download: format === 'csv' || downloadParam === 'true',
		delimiter,
	}
}

function getCsv(
	meas: Measurement[] | TransformedMeasurement[],
	delimiter: string,
): string {
	return convertToCsv(
		['createdAt', 'value'],
		meas,
		[
			(measurement) => measurement.time.toString(),
			(measurement) => measurement.value?.toString() ?? 'null',
		],
		delimiter,
	)
}

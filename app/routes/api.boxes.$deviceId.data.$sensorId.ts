import { type Params } from 'react-router'
import { type Route } from './+types/api.boxes.$deviceId.data.$sensorId'
import { getMeasurements, getSensorFromDevice } from '~/db/models/sensor.server'
import { convertToCsv } from '~/lib/csv'
import { transformOutliers } from '~/lib/outlier-transform'
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
			'Alias for `outlierWindow`. Size of the moving window used as base to calculate outliers.',
		example: 15,
	}),

	outlierWindow: z.coerce.number().int().min(1).max(50).optional().meta({
		description:
			'Legacy name for the moving-window size used to calculate outliers. Allowed values are numbers between 1 and 50.',
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
		location: z
			.array(z.number())
			.min(2)
			.max(3)
			.optional()
			.meta({
				description:
					'Measurement coordinates as [longitude, latitude, height?].',
				example: [7, 52, 10],
			}),

		createdAt: z.iso.datetime().meta({
			description: 'Measurement timestamp',
			example: '2025-11-06T23:59:57.189Z',
		}),

		value: z.string().nullable().meta({
			description: 'Measured value',
			example: '4.78',
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
				location: [7, 52],
				createdAt: '2025-11-06T23:59:57.189Z',
				value: '4.78',
			},
			{
				location: [7, 52],
				createdAt: '2025-11-06T23:57:06.030Z',
				value: '4.13',
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
			deviceId,
			sensorId,
			outliers,
			outlierWindow,
			fromDate,
			toDate,
			format,
			download,
			delimiter,
		} = collected

		const sensor = await getSensorFromDevice(deviceId, sensorId)
		if (!sensor) {
			return StandardResponse.notFound(
				'Sensor not found or not part of this device.',
			)
		}

		let meas = await getMeasurements(
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

		if (format == 'json')
			return Response.json(serializeLegacyMeasurements(meas), responseInit)
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

	const outlierWindowParam =
		url.searchParams.get('outlierWindow') ??
		url.searchParams.get('outlier-window')
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
		'fromDate',
		new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
		['from-date'],
	)
	if (fromDate instanceof Response) return fromDate

	const toDate = parseDateParam(url, 'toDate', new Date(), ['to-date'])
	if (toDate instanceof Response) return toDate
	if (fromDate > toDate) {
		return StandardResponse.badRequest('from-date must not be after to-date')
	}

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

type MeasurementResult = Awaited<ReturnType<typeof getMeasurements>>[number]
type MeasurementResultWithOutlier = MeasurementResult & {
	isOutlier?: boolean
}

function serializeLegacyMeasurements(
	measurements: MeasurementResultWithOutlier[],
) {
	return measurements.map((measurement) => {
		const coordinates = measurement.location
			? [
					measurement.location.x,
					measurement.location.y,
					...(measurement.location.heightAboveGround === null
						? []
						: [measurement.location.heightAboveGround]),
				]
			: undefined

		return {
			...(coordinates ? { location: coordinates } : {}),
			createdAt: measurement.time.toISOString(),
			value: measurement.value === null ? null : measurement.value.toString(),
			...(measurement.isOutlier === undefined
				? {}
				: { isOutlier: measurement.isOutlier }),
		}
	})
}

function getCsv(
	meas: MeasurementResultWithOutlier[],
	delimiter: string,
): string {
	return convertToCsv(
		['createdAt', 'value'],
		meas,
		[
			(measurement) => measurement.time.toISOString(),
			(measurement) => measurement.value?.toString() ?? 'null',
		],
		delimiter,
	)
}

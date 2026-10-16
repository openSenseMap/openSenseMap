import { type Route } from './+types/api.boxes.data'
import { streamMeasurements } from '~/db/models/measurement.stream.server'
import { findMatchingSensors } from '~/db/models/sensor.server'
import { parseBoxesDataQuery } from '~/lib/api-schemas/boxes-data-query-schema'
import { escapeCSVValue } from '~/lib/csv'
import { StandardResponse } from '~/lib/responses'
import { logServerError } from '~/lib/sentry.server'
import { transformMeasurement } from '~/services/measurement-service.server'

import * as z from 'zod/v4'
import { type ZodOpenApiPathItemObject } from 'zod-openapi'

import {
	BadRequestErrorSchema,
	InternalServerErrorSchema,
	NotFoundErrorSchema,
	UnprocessableContentErrorSchema,
	badRequestResponse,
	internalServerErrorResponse,
	notFoundResponse,
	unprocessableContentResponse,
} from '~/lib/openapi/errors'

import {
	BboxSchema,
	ColumnsBodySchema,
	ColumnsQuerySchema,
	DateRangeQuerySchema,
	DelimiterSchema,
	DownloadSchema,
	ExposureSchema,
	OutputFormatSchema,
	QueryBboxSchema,
	QueryDownloadSchema,
} from '~/lib/api-schemas/query'

const DevicesDataRequestSchema = DateRangeQuerySchema.extend({
	phenomenon: z.string().optional(),
	grouptag: z.string().optional(),
	boxid: z.union([z.string(), z.array(z.string())]).optional(),
	exposure: z.union([ExposureSchema, z.array(ExposureSchema)]).optional(),
	bbox: BboxSchema,
	format: OutputFormatSchema,
	download: DownloadSchema,
	delimiter: DelimiterSchema,
	columns: ColumnsBodySchema,
}).meta({
	id: 'DevicesDataRequest',
	description:
		'JSON body variant of the devices data query. Equivalent to the GET query parameters, but supports arrays naturally.',
})

const DevicesDataQueryParamsSchema = DateRangeQuerySchema.extend({
	phenomenon: z.string().optional().meta({
		description: 'Filter by sensor phenomenon/title.',
		example: 'Temperatur',
	}),

	grouptag: z.string().optional().meta({
		description: 'Filter devices by group tag.',
		example: 'co2-campaign',
	}),

	boxid: z.string().optional().meta({
		description: 'Filter by device ID.',
		example: '5bdbe70f55d0ad001a04edc9',
	}),

	exposure: ExposureSchema.optional(),

	bbox: QueryBboxSchema,

	format: OutputFormatSchema,

	download: QueryDownloadSchema,

	delimiter: DelimiterSchema,

	columns: ColumnsQuerySchema,
}).meta({
	id: 'DevicesDataQueryParams',
	description: 'Query parameters for streaming measurements across devices.',
})

const DevicesDataJsonResponseSchema = z
	.array(z.record(z.string(), z.unknown()))
	.meta({
		id: 'DevicesDataJsonResponse',
		description:
			'Streamed JSON array of measurement rows. Each row contains the requested columns.',
		example: [
			{
				createdAt: '2026-05-13T12:00:00.000Z',
				value: 21.5,
				boxId: '5bdbe70f55d0ad001a04edc9',
				boxName: 'My device',
				sensorId: '60a13611a877b3001b8ffd59',
				phenomenon: 'Temperatur',
				unit: '°C',
			},
		],
	})

const DevicesDataCsvResponseSchema = z.string().meta({
	id: 'DevicesDataCsvResponse',
	description:
		'CSV measurement export. The first row contains the requested column names.',
	example:
		'createdAt,value,boxId,boxName,sensorId,phenomenon,unit\n2026-05-13T12:00:00.000Z,21.5,5bdbe70f55d0ad001a04edc9,my Device,60a13611a877b3001b8ffd59,Temperatur,°C\n',
})

export const openapi: ZodOpenApiPathItemObject = {
	get: {
		tags: ['Measurements'],
		summary: 'Stream measurements across devices and sensors',
		description:
			'Streams measurements matching the given filters. Results can be returned as JSON or CSV. This endpoint is useful for bulk data downloads and cross-device measurement queries.',

		requestParams: {
			query: DevicesDataQueryParamsSchema,
		},

		responses: {
			200: {
				description: 'Measurements streamed successfully.',
				headers: {
					'Content-Disposition': {
						description:
							'Present when `download=true`. Suggests a download filename.',
						schema: {
							type: 'string',
							example:
								'attachment; filename=opensensemap_org-download-Temperatur-20260513_120000.csv',
						},
					},
				},
				content: {
					'application/json': {
						schema: DevicesDataJsonResponseSchema,
					},
					'text/csv': {
						schema: DevicesDataCsvResponseSchema,
					},
				},
			},

			400: badRequestResponse(
				BadRequestErrorSchema,
				'Bad request. This can happen for invalid query parameters.',
			),

			404: notFoundResponse(
				NotFoundErrorSchema,
				'No matching devices or sensors found.',
			),

			422: unprocessableContentResponse(
				UnprocessableContentErrorSchema,
				'Unprocessable content. This can happen for invalid bounding box parameters.',
			),

			500: internalServerErrorResponse(
				InternalServerErrorSchema,
				'Internal server error.',
			),
		},
	},

	post: {
		tags: ['Measurements'],
		summary:
			'Stream measurements across devices and sensors using a JSON request body',
		description:
			'POST variant of the devices data query. Parameters can be sent as a JSON request body. If the request body cannot be parsed as JSON, the server falls back to query parameters.',

		requestParams: {
			query: DevicesDataQueryParamsSchema,
		},

		requestBody: {
			required: false,
			content: {
				'application/json': {
					schema: DevicesDataRequestSchema,
				},
			},
		},

		responses: {
			200: {
				description: 'Measurements streamed successfully.',
				headers: {
					'Content-Disposition': {
						description:
							'Present when `download=true`. Suggests a download filename.',
						schema: {
							type: 'string',
							example:
								'attachment; filename=opensensemap_org-download-Temperatur-20260513_120000.csv',
						},
					},
				},
				content: {
					'application/json': {
						schema: DevicesDataJsonResponseSchema,
					},
					'text/csv': {
						schema: DevicesDataCsvResponseSchema,
					},
				},
			},

			400: badRequestResponse(
				BadRequestErrorSchema,
				'Bad request. This can happen for invalid query or body parameters.',
			),

			404: notFoundResponse(
				NotFoundErrorSchema,
				'No matching devices or sensors found.',
			),

			422: unprocessableContentResponse(
				UnprocessableContentErrorSchema,
				'Unprocessable content. This can happen for invalid bounding box parameters.',
			),

			500: internalServerErrorResponse(
				InternalServerErrorSchema,
				'Internal server error.',
			),
		},
	},
}

function createDownloadFilename(
	date: Date,
	action: string,
	params: string[],
	format: string,
) {
	return `opensensemap_org-${action}-${encodeURI(params.join('-'))}-${date
		.toISOString()
		.replace(/-|:|\.\d*Z/g, '')
		.replace('T', '_')}.${format}`
}

export async function loader({ request }: Route.LoaderArgs) {
	try {
		const params = await parseBoxesDataQuery(request)

		const { sensorsMap, sensorIds } = await findMatchingSensors(params)

		if (sensorIds.length === 0) {
			return StandardResponse.notFound('No matching sensors found')
		}

		const headers = new Headers()
		headers.set(
			'Content-Type',
			params.format === 'csv'
				? 'text/csv; charset=utf-8'
				: 'application/json; charset=utf-8',
		)
		if (params.download) {
			const filename = createDownloadFilename(
				new Date(),
				'download',
				[params.phenomenon || 'data'],
				params.format,
			)
			headers.set('Content-Disposition', `attachment; filename=${filename}`)
		}

		const delimiterChar = params.delimiter === 'semicolon' ? ';' : ','

		const stream = new ReadableStream({
			async start(controller) {
				try {
					const encoder = new TextEncoder()
					let isFirst = true

					// Write CSV header or JSON opening bracket
					if (params.format === 'csv') {
						const header = params.columns.join(delimiterChar) + '\n'
						controller.enqueue(encoder.encode(header))
					} else {
						controller.enqueue(encoder.encode('['))
					}

					for await (const batch of streamMeasurements(
						sensorIds,
						params.fromDate,
						params.toDate,
						params.bbox,
					)) {
						for (const measurement of batch) {
							const transformed = transformMeasurement(
								{
									sensorId: measurement.sensor_id,
									createdAt: measurement.time
										? new Date(measurement.time)
										: null,
									value: measurement.value,
									locationId: measurement.location_id ?? null,
								},
								sensorsMap,
								{},
								params.columns,
							)

							let line: string
							if (params.format === 'csv') {
								line =
									params.columns
										.map((col: string) =>
											escapeCSVValue(
												(transformed as Record<string, any>)[col],
												delimiterChar,
											),
										)
										.join(delimiterChar) + '\n'
							} else {
								// Format as JSON
								if (!isFirst) {
									line = ',' + JSON.stringify(transformed)
								} else {
									line = JSON.stringify(transformed)
									isFirst = false
								}
							}

							controller.enqueue(encoder.encode(line))
						}
					}

					// Close JSON array
					if (params.format === 'json') {
						controller.enqueue(encoder.encode(']'))
					}

					controller.close()
				} catch (error) {
					logServerError('Measurement export stream failed', error, {
						'app.operation': 'measurement.export_stream',
						'export.format': params.format,
						'export.column_count': params.columns.length,
					})
					console.error('Stream error:', error)
					controller.error(error)
				}
			},
		})

		return new Response(stream, { headers })
	} catch (err) {
		if (err instanceof Response) {
			if (err.status === 404) {
				return StandardResponse.notFound('No matching sensors found')
			}
			return err
		}
		logServerError('Measurement export setup failed unexpectedly', err, {
			'app.operation': 'measurement.export_setup',
		})
		return StandardResponse.internalServerError()
	}
}

export async function action(args: Route.ActionArgs) {
	return loader({
		request: args.request,
		params: args.params as any,
		context: args.context as any,
		url: new URL(args.request.url),
	} as Route.LoaderArgs)
}

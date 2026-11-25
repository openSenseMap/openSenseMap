import { z } from 'zod'
import { type Params } from 'react-router'
import { type ZodOpenApiPathItemObject } from 'zod-openapi'
import { type Route } from './+types/api.boxes.$deviceId.locations'
import { getLocations } from '~/db/models/device.server'
import { parseDateParam, parseEnumParam } from '~/lib/params'
import { StandardResponse } from '~/lib/responses'

import {
	InternalServerErrorSchema,
	NotFoundErrorSchema,
	badRequestResponse,
	internalServerErrorResponse,
	notFoundResponse,
	BadRequestErrorSchema,
} from '~/lib/openapi/errors'

import { apiMessages } from '~/lib/openapi/messages'
import {
	DevicePathParamsSchema,
	IsoDateTimeSchema,
} from '~/lib/openapi/schemas/common'
import { CoordinatesSchema } from '~/lib/openapi/schemas/location'
import {
	DateRangeQuerySchema,
	JsonGeoJsonFormatSchema,
} from '~/lib/api-schemas/query'

const DeviceLocationsQueryParamsSchema = DateRangeQuerySchema.extend({
	format: JsonGeoJsonFormatSchema,
})

const PointLocationSchema = z
	.object({
		coordinates: CoordinatesSchema,
		type: z.literal('Point'),
		timestamp: IsoDateTimeSchema.meta({
			description: 'Timestamp of the device location',
			example: '2017-07-27T12:00:00.000Z',
		}),
	})
	.meta({
		id: 'DeviceLocationPoint',
		description: 'Location of a device as GeoJSON Point-like object.',
		example: {
			coordinates: [7.68123, 51.9123],
			type: 'Point',
			timestamp: '2017-07-27T12:00:00.000Z',
		},
	})

const JsonLocationsResponseSchema = z.array(PointLocationSchema).meta({
	id: 'DeviceLocationsJsonResponse',
	description:
		'Device locations ordered by date as an array of GeoJSON Point-like objects.',
	example: [
		{
			coordinates: [7.68123, 51.9123],
			type: 'Point',
			timestamp: '2017-07-27T12:00:00.000Z',
		},
		{
			coordinates: [7.68223, 51.9433],
			type: 'Point',
			timestamp: '2017-07-27T12:01:00.000Z',
		},
		{
			coordinates: [7.68323, 51.9423],
			type: 'Point',
			timestamp: '2017-07-27T12:02:00.000Z',
		},
	],
})

const GeoJsonLineStringResponseSchema = z
	.object({
		type: z.literal('Feature'),
		geometry: z.object({
			type: z.literal('LineString'),
			coordinates: z.array(CoordinatesSchema),
		}),
		properties: z.object({
			timestamps: z.array(
				IsoDateTimeSchema.meta({
					example: '2017-07-27T12:00:00.000Z',
				}),
			),
		}),
	})
	.meta({
		id: 'DeviceLocationsGeoJsonResponse',
		description:
			'GeoJSON Feature containing a LineString. `properties.timestamps` contains one timestamp for each coordinate.',
		example: {
			type: 'Feature',
			geometry: {
				type: 'LineString',
				coordinates: [
					[7.68123, 51.9123],
					[7.68223, 51.9433],
					[7.68323, 51.9423],
				],
			},
			properties: {
				timestamps: [
					'2017-07-27T12:00:00.000Z',
					'2017-07-27T12:01:00.000Z',
					'2017-07-27T12:02:00.000Z',
				],
			},
		},
	})

export const openapi: ZodOpenApiPathItemObject = {
	get: {
		tags: ['Devices'],
		summary: 'Get locations of a device',
		description:
			'Get all locations of the specified device ordered by date. By default, the response is an array of GeoJSON Point-like objects. If `format=geojson`, a GeoJSON LineString Feature is returned, with `properties.timestamps` containing one timestamp for each coordinate.',

		requestParams: {
			path: DevicePathParamsSchema,
			query: DeviceLocationsQueryParamsSchema,
		},

		responses: {
			200: {
				description: 'Device locations returned successfully.',
				content: {
					'application/json': {
						schema: JsonLocationsResponseSchema,
					},
					'application/geo+json': {
						schema: GeoJsonLineStringResponseSchema,
					},
				},
			},

			400: badRequestResponse(
				BadRequestErrorSchema,
				'Bad request. This can happen for an invalid device id, invalid date parameter, or invalid format parameter.',
			),

			404: notFoundResponse(NotFoundErrorSchema, 'Device not found.'),

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

		const { deviceId, fromDate, toDate, format } = collected

		const locations = await getLocations({ id: deviceId }, fromDate, toDate)

		if (!locations) {
			return StandardResponse.notFound(apiMessages.deviceNotFound)
		}

		const jsonLocations = locations.map((location) => {
			return {
				coordinates: [location.x, location.y],
				type: 'Point',
				timestamp:
					location.time instanceof Date
						? location.time.toISOString()
						: location.time,
			}
		})

		const responseInit: ResponseInit = {
			status: 200,
			headers: {
				'content-type':
					format === 'json'
						? 'application/json; charset=utf-8'
						: 'application/geo+json; charset=utf-8',
			},
		}

		if (format === 'json') {
			return Response.json(jsonLocations, responseInit)
		}

		const geoJsonLocations = {
			type: 'Feature',
			geometry: {
				type: 'LineString',
				coordinates: jsonLocations.map((location) => location.coordinates),
			},
			properties: {
				timestamps: jsonLocations.map((location) => location.timestamp),
			},
		}

		const geoJsonResponseParsed =
			GeoJsonLineStringResponseSchema.safeParse(geoJsonLocations)

		if (!geoJsonResponseParsed.success) {
			return StandardResponse.internalServerError()
		}

		return Response.json(geoJsonResponseParsed.data, responseInit)
	} catch {
		return StandardResponse.internalServerError()
	}
}

function collectParameters(
	request: Request,
	params: Params<string>,
):
	| Response
	| {
			deviceId: string
			fromDate: Date
			toDate: Date
			format: 'json' | 'geojson'
	  } {
	const deviceId = params.deviceId

	if (deviceId === undefined) {
		return StandardResponse.badRequest(apiMessages.deviceIdRequired)
	}

	const url = new URL(request.url)

	const fromDate = parseDateParam(
		url,
		'from-date',
		new Date(new Date().setDate(new Date().getDate() - 2)),
	)

	if (fromDate instanceof Response) return fromDate

	const toDate = parseDateParam(url, 'to-date', new Date())

	if (toDate instanceof Response) return toDate

	const format = parseEnumParam(url, 'format', ['json', 'geojson'], 'json')

	if (format instanceof Response) return format

	return {
		deviceId,
		fromDate,
		toDate,
		format: format as 'json' | 'geojson',
	}
}

import { type Route } from './+types/api.boxes'
import {
	createDevice,
	findDevices,
	type FindDevicesOptions,
} from '~/db/models/device.server'
import { type User } from '~/db/schema'
import { transformDeviceToApiFormat } from '~/lib/device-transform'
import { StandardResponse } from '~/lib/responses'

import { type ZodOpenApiPathItemObject } from 'zod-openapi'
import {
	ApiDeviceSchema,
	DevicesGeoJsonResponseSchema,
	DevicesResponseSchema,
} from '~/lib/openapi/schemas/device'
import {
	BadRequestErrorSchema,
	badRequestResponse,
	ForbiddenErrorSchema,
	forbiddenResponse,
	internalServerErrorResponse,
	InternalServerErrorSchema,
	MethodNotAllowedErrorSchema,
	methodNotAllowedResponse,
	UnprocessableContentErrorSchema,
	unprocessableContentResponse,
} from '~/lib/openapi/errors'
import { withAuthenticatedUser } from '~/lib/jwt'
import {
	DevicesQuerySchema,
	CreateDeviceSchema,
} from '~/lib/api-schemas/devices'
import {
	ElevationLookupError,
	getTerrainElevation,
} from '~/services/elevation-service.server'
import { applyElevationConsentChoice } from '~/db/models/elevation-consent.server'

const DevicesQueryParamsSchema = DevicesQuerySchema.meta({
	id: 'DevicesQueryParams',
	description:
		'Query parameters used to filter and format the devices response.',
})

const CreateDeviceRequestSchema = CreateDeviceSchema.meta({
	id: 'CreateDeviceRequest',
	description: 'Payload for creating a new device.',
})

const CreatedDeviceResponseSchema = ApiDeviceSchema.meta({
	id: 'CreatedDeviceResponse',
	description:
		'Created device response transformed through `transformDeviceToApiFormat`.',
})

export const openapi: ZodOpenApiPathItemObject = {
	get: {
		tags: ['Devices'],
		summary: 'Get devices',
		description:
			'Find devices using query parameters. By default, a JSON array of devices is returned. If `format=geojson`, a GeoJSON FeatureCollection is returned.',

		requestParams: {
			query: DevicesQueryParamsSchema,
		},

		responses: {
			200: {
				description: 'Devices retrieved successfully.',
				content: {
					'application/json': {
						schema: DevicesResponseSchema,
					},
					'application/geo+json': {
						schema: DevicesGeoJsonResponseSchema,
					},
				},
			},

			422: unprocessableContentResponse(
				UnprocessableContentErrorSchema,
				'Invalid query parameter.',
			),

			500: internalServerErrorResponse(
				InternalServerErrorSchema,
				'Internal server error.',
			),
		},
	},

	post: {
		tags: ['Devices'],
		summary: 'Create a new device',
		description:
			'Creates a new device with optional sensors. An optional location height is interpreted and stored as height above ground. Coordinates are sent to GPXZ and height above sea level is calculated only when the authenticated user has granted the current elevation lookup consent. A missing consent or lookup failure does not fail device creation.',
		security: [{ bearerAuth: [] }],

		requestBody: {
			required: true,
			content: {
				'application/json': {
					schema: CreateDeviceRequestSchema,
				},
			},
		},

		responses: {
			201: {
				description: 'Device created successfully.',
				content: {
					'application/json': {
						schema: CreatedDeviceResponseSchema,
					},
				},
			},

			400: badRequestResponse(
				BadRequestErrorSchema,
				'Bad request. This can happen when the request body is not valid JSON or does not match CreateDeviceSchema.',
			),

			403: forbiddenResponse(
				ForbiddenErrorSchema,
				'Invalid or missing JWT authorization.',
			),

			405: methodNotAllowedResponse(
				MethodNotAllowedErrorSchema,
				'Method not allowed.',
			),

			500: internalServerErrorResponse(
				InternalServerErrorSchema,
				'Internal server error.',
			),
		},
	},
}

function normalizeBoxesQueryParams(query: Record<string, unknown>) {
	const maxDistance = query.maxDistance ?? query.maxdistance

	return {
		...query,
		maxDistance,
	}
}

export async function loader({ request }: Route.LoaderArgs) {
	const url = new URL(request.url)
	const queryObj = Object.fromEntries(url.searchParams)

	const normalizedQueryObj = normalizeBoxesQueryParams(queryObj)

	const parseResult = DevicesQuerySchema.safeParse(normalizedQueryObj)

	if (!parseResult.success) {
		const { fieldErrors } = parseResult.error.flatten()
		if (fieldErrors.format)
			throw StandardResponse.unprocessableContent('Invalid format parameter')

		throw StandardResponse.unprocessableContent(
			`${parseResult.error.flatten()}`,
		)
	}

	const params: FindDevicesOptions = parseResult.data

	const devices = await findDevices(params)

	if (params.format === 'geojson') {
		const geojson = {
			type: 'FeatureCollection',
			features: devices.map((device) => ({
				type: 'Feature',
				geometry: {
					type: 'Point',
					coordinates:
						device.heightAboveSeaLevel === null
							? [device.longitude, device.latitude]
							: [device.longitude, device.latitude, device.heightAboveSeaLevel],
				},
				properties: {
					...device,
					height: device.heightAboveSeaLevel,
				},
			})),
		}

		return Response.json(geojson, {
			headers: {
				'Content-Type': 'application/geo+json; charset=utf-8',
			},
		})
	}
	return Response.json(
		devices.map((device) => ({
			...device,
			height: device.heightAboveSeaLevel,
		})),
		{
			headers: {
				'Content-Type': 'application/json; charset=utf-8',
			},
		},
	)
}

export const action = async ({ request }: Route.ActionArgs) => {
	try {
		if (request.method !== 'POST') {
			return StandardResponse.methodNotAllowed('Method Not Allowed')
		}

		return await withAuthenticatedUser(request, async (user) => {
			return await post(request, user)
		})
	} catch {
		return StandardResponse.internalServerError()
	}
}

async function post(request: Request, user: User) {
	try {
		// Parse and validate request body
		let requestData
		try {
			requestData = await request.json()
		} catch {
			return StandardResponse.badRequest('Invalid JSON in request body')
		}

		// Validate request data
		const validationResult = CreateDeviceSchema.safeParse(requestData)
		if (!validationResult.success) {
			return StandardResponse.badRequest(
				validationResult.error.issues[0]?.message ?? 'Invalid request data',
			)
		}

		const validatedData = validationResult.data
		const sensorsProvided = validatedData.sensors?.length > 0
		// Request height is relative to ground; sea-level height is best-effort.
		const [longitude, latitude, heightAboveGround] = validatedData.location
		let terrainElevation: number | null = null
		let terrainElevationDataset: string | null = null
		const mayLookupElevation = await applyElevationConsentChoice(
			user.id,
			validatedData.elevationLookupConsent,
		)

		if (heightAboveGround !== undefined && mayLookupElevation) {
			try {
				const elevationResult = await getTerrainElevation(latitude, longitude)
				terrainElevation = elevationResult.elevation
				terrainElevationDataset = elevationResult.dataset
			} catch (error) {
				console.warn('POST /boxes terrain elevation lookup failed', {
					error: error instanceof ElevationLookupError ? error.code : error,
					latitude,
					longitude,
				})
			}
		}

		const newDevice = await createDevice(
			{
				name: validatedData.name,
				exposure: validatedData.exposure,
				model: sensorsProvided ? undefined : validatedData.model,
				latitude: latitude,
				longitude: longitude,
				heightAboveGround: heightAboveGround ?? null,
				terrainElevation,
				terrainElevationDataset,
				tags: validatedData.grouptag,
				sensors: sensorsProvided
					? validatedData.sensors.map((s) => ({
							title: s.title,
							sensorType: s.sensorType,
							unit: s.unit,
						}))
					: undefined,
			},
			user.id,
		)

		// Build response object using helper function
		const responseData = transformDeviceToApiFormat(newDevice)

		return StandardResponse.created(responseData)
	} catch {
		return StandardResponse.internalServerError()
	}
}

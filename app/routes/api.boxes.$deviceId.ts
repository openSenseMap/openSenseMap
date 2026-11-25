import { type Route } from './+types/api.boxes.$deviceId'
import {
	DeviceUpdateError,
	getDevice,
	type UpdateDeviceArgs,
} from '~/db/models/device.server'
import { type Device, type User } from '~/db/schema'
import { transformDeviceToApiFormat } from '~/lib/device-transform'
import { withAuthenticatedUser } from '~/lib/jwt'
import { StandardResponse } from '~/lib/responses'
import { deleteDevice, updateDevice } from '~/services/device-service.server'
import { z } from 'zod'
import { type ZodOpenApiPathItemObject } from 'zod-openapi'
import {
	BadRequestErrorSchema,
	badRequestResponse,
	ForbiddenErrorSchema,
	forbiddenResponse,
	internalServerErrorResponse,
	InternalServerErrorSchema,
	NotFoundErrorSchema,
	notFoundResponse,
	UnauthorizedErrorSchema,
	unauthorizedResponse,
} from '~/lib/openapi/errors'
import { DevicePathParamsSchema } from '~/lib/openapi/schemas/common'
import { apiMessages } from '~/lib/openapi/messages'
import {
	DeviceSensorUpdateSchema,
	DeviceAddonsUpdateSchema,
	ApiDeviceSchema,
	type DeviceSensorUpdate,
} from '~/lib/openapi/schemas/device'
import { ExposureSchema } from '~/lib/api-schemas/query'
import {
	requestContentTypeJson,
	responseContentTypeJson,
} from '~/middleware/content-type-header.server'
import { parseJsonBody } from '~/lib/request-parsing'
import { DeviceLocationInputSchema } from '~/lib/openapi/schemas/location'
import { ElevationLookupConsentSchema } from '~/lib/openapi/schemas/consent'
import {
	ElevationLookupError,
	getTerrainElevation,
} from '~/services/elevation-service.server'
import { applyElevationConsentChoice } from '~/db/models/elevation-consent.server'

const messages = {
	conflictingSensorsAndAddons:
		'sensors and addons can not appear in the same request.',
	deviceNotOwned: 'You do not own this device',
	deviceArchived: 'Device is archived and cannot be updated',
}

const UpdateDeviceRequestSchema = z
	.object({
		name: z.string().optional().meta({
			description: 'Device name',
			example: 'My device',
		}),

		exposure: ExposureSchema.optional(),

		description: z.string().optional().meta({
			description: 'Device description',
			example: 'Sensor device on my balcony',
		}),

		image: z.string().optional().meta({
			description: 'Device image URL or image value',
		}),

		deleteImage: z.boolean().optional().meta({
			description: 'If true, the device image is removed.',
			example: true,
		}),

		model: z.string().optional().meta({
			description: 'Device model',
			example: 'homeWifi',
		}),

		useAuth: z.boolean().optional().meta({
			description: 'Whether device API-key authentication is enabled',
			example: true,
		}),

		weblink: z.string().optional().meta({
			description: 'Web link for the device.',
			example: 'https://example.com',
		}),

		location: DeviceLocationInputSchema.optional(),

		elevationLookupConsent: ElevationLookupConsentSchema.optional(),

		grouptag: z
			.union([z.string(), z.array(z.string())])
			.transform((value) => (Array.isArray(value) ? value : [value]))
			.optional()
			.meta({
				description: 'Group tags assigned to the device',
				example: ['school', 'feinstaub'],
			}),

		sensors: z.array(DeviceSensorUpdateSchema).optional().meta({
			description:
				'Sensors to update or create. Must not be used together with `addons.add`.',
		}),

		addons: DeviceAddonsUpdateSchema.optional(),
	})
	.superRefine((body, ctx) => {
		if (body.sensors && body.addons?.add) {
			ctx.addIssue({
				code: 'custom',
				path: ['sensors'],
				message: messages.conflictingSensorsAndAddons,
			})
		}
	})
	.meta({
		id: 'UpdateDeviceRequest',
		description: 'Device update payload.',
	})

const DeleteDeviceRequestSchema = z
	.object({
		password: z
			.string()
			.min(1, {
				error: apiMessages.passwordRequired,
			})
			.meta({
				description: 'Current user password required to delete the device',
				example: 'myCurrentPassword123',
				format: 'password',
			}),
	})
	.meta({
		id: 'DeleteDeviceRequest',
		description: 'Device deletion confirmation payload.',
	})
export const openapi: ZodOpenApiPathItemObject = {
	get: {
		tags: ['Devices'],
		summary: 'Get device by ID',
		description: 'Retrieve a single device by its unique identifier.',

		requestParams: {
			path: DevicePathParamsSchema,
		},

		responses: {
			200: {
				description: 'Device retrieved successfully.',
				content: {
					'application/json': {
						schema: ApiDeviceSchema,
					},
				},
			},

			400: badRequestResponse(
				BadRequestErrorSchema,
				'Bad request. The device ID path parameter is missing or malformed.',
			),

			404: notFoundResponse(NotFoundErrorSchema, 'Device not found.'),

			500: internalServerErrorResponse(
				InternalServerErrorSchema,
				'Internal server error.',
			),
		},
	},

	put: {
		tags: ['Devices'],
		summary: 'Update device',
		description:
			'Updates a device. Requires JWT authorization. An optional location height is interpreted and stored as height above ground. Coordinates are sent to GPXZ and height above sea level is recalculated only when the authenticated user has granted the current elevation lookup consent. A missing consent or lookup failure does not fail the update.',
		security: [{ bearerAuth: [] }],

		requestParams: {
			path: DevicePathParamsSchema,
		},

		requestBody: {
			required: true,
			content: {
				'application/json': {
					schema: UpdateDeviceRequestSchema,
				},
			},
		},

		responses: {
			200: {
				description: 'Device updated successfully.',
				content: {
					'application/json': {
						schema: ApiDeviceSchema,
					},
				},
			},

			400: badRequestResponse(
				BadRequestErrorSchema,
				'Bad request. This can happen when the device id is missing or the update payload contains invalid or conflicting fields.',
			),

			403: forbiddenResponse(
				ForbiddenErrorSchema,
				'Invalid or missing JWT authorization.',
			),

			404: notFoundResponse(NotFoundErrorSchema, 'Device not found.'),

			500: internalServerErrorResponse(
				InternalServerErrorSchema,
				'Internal server error.',
			),
		},
	},

	delete: {
		tags: ['Devices'],
		summary: 'Delete device',
		description:
			'Deletes a device. Requires JWT authorization and the current user password.',
		security: [{ bearerAuth: [] }],

		requestParams: {
			path: DevicePathParamsSchema,
		},

		requestBody: {
			required: true,
			content: {
				'application/json': {
					schema: DeleteDeviceRequestSchema,
				},
			},
		},

		responses: {
			200: {
				description: 'Device deleted successfully.',
				content: {
					'application/json': {
						schema: z.null().meta({
							description: 'JSON null response indicating successful deletion.',
						}),
					},
				},
			},

			400: badRequestResponse(
				BadRequestErrorSchema,
				'Bad request. This can happen when the device id or deletion password is missing.',
			),

			401: unauthorizedResponse(
				UnauthorizedErrorSchema,
				'Unauthorized. The provided password is incorrect.',
			),

			403: forbiddenResponse(
				ForbiddenErrorSchema,
				'Invalid or missing JWT authorization.',
			),

			404: notFoundResponse(NotFoundErrorSchema, 'Device not found.'),

			500: internalServerErrorResponse(
				InternalServerErrorSchema,
				'Internal server error.',
			),
		},
	},
}

const parsePathParams = (params: Route.LoaderArgs['params']) => {
	const parsed = DevicePathParamsSchema.safeParse(params)

	if (!parsed.success) {
		return StandardResponse.badRequest(apiMessages.deviceIdRequired)
	}

	return parsed.data
}

const okDeviceResponse = async (device: unknown) => {
	const apiDevice = transformDeviceToApiFormat(device as any)
	const parsed = await ApiDeviceSchema.safeParseAsync(apiDevice)

	if (!parsed.success) {
		return StandardResponse.internalServerError()
	}

	return StandardResponse.ok(parsed.data)
}

export const middleware: Route.MiddlewareFunction[] = [
	requestContentTypeJson(['PUT', 'DELETE']),
	responseContentTypeJson,
]

export async function loader({ params }: Route.LoaderArgs) {
	const { deviceId } = params

	if (!deviceId) return StandardResponse.badRequest('Device ID is required.')

	try {
		const device = await getDevice({ id: deviceId })

		if (!device) return StandardResponse.notFound('Device not found.')

		return await okDeviceResponse(device)
	} catch (error) {
		if (error instanceof Response) {
			throw error
		}

		return StandardResponse.internalServerError(
			'Internal server error while fetching device',
		)
	}
}

export async function action({ request, params }: Route.ActionArgs) {
	const parsedParams = parsePathParams(params)
	if (parsedParams instanceof Response) return parsedParams

	if (request.method !== 'PUT' && request.method !== 'DELETE') {
		return StandardResponse.methodNotAllowed('Method Not Allowed')
	}

	return withAuthenticatedUser(request, async (user) => {
		if (request.method === 'PUT') {
			return await put(request, user, parsedParams.deviceId)
		}

		if (request.method === 'DELETE') {
			return await del(request, user, parsedParams.deviceId)
		}

		// was already checked, but it makes ts happy
		return StandardResponse.methodNotAllowed('Method Not Allowed')
	})
}

async function put(request: Request, user: User, deviceId: string) {
	let rawBody: unknown

	try {
		rawBody = await request.json()
	} catch {
		return StandardResponse.badRequest('Invalid JSON in request body')
	}

	const parsedBody = UpdateDeviceRequestSchema.safeParse(rawBody)

	if (!parsedBody.success) {
		console.warn('PUT /boxes/:deviceId request validation failed', {
			body: rawBody,
			issues: parsedBody.error.issues,
		})

		return StandardResponse.badRequest(
			parsedBody.error.issues[0]?.message ?? 'Invalid request data',
		)
	}

	const body = { ...parsedBody.data }

	const currentDevice = await getDevice({ id: deviceId })

	if (!currentDevice) {
		return StandardResponse.notFound(apiMessages.deviceNotFound)
	}

	if (currentDevice.userId !== user.id) {
		return StandardResponse.forbidden(messages.deviceNotOwned)
	}

	if (body.sensors && body.addons?.add) {
		return StandardResponse.badRequest(
			'sensors and addons can not appear in the same request.',
		)
	}

	if (body.addons?.add === 'feinstaub') {
		const homeModels = ['homeWifi', 'homeEthernet']

		if (currentDevice.model && homeModels.includes(currentDevice.model)) {
			body.model = `${currentDevice.model}Feinstaub`

			const currentSensors = currentDevice.sensors ?? []

			const hasPM10 = currentSensors.some(
				(sensor) => sensor.sensorType === 'SDS 011' && sensor.title === 'PM10',
			)

			const hasPM25 = currentSensors.some(
				(sensor) => sensor.sensorType === 'SDS 011' && sensor.title === 'PM2.5',
			)

			const sensorsToAdd: DeviceSensorUpdate[] = []

			if (!hasPM10) {
				sensorsToAdd.push({
					new: true,
					title: 'PM10',
					unit: 'µg/m³',
					sensorType: 'SDS 011',
				})
			}

			if (!hasPM25) {
				sensorsToAdd.push({
					new: true,
					title: 'PM2.5',
					unit: 'µg/m³',
					sensorType: 'SDS 011',
				})
			}

			if (sensorsToAdd.length > 0) {
				body.sensors = [...(body.sensors ?? []), ...sensorsToAdd]
			}
		}
	}

	// Handle addons (merge with grouptag)
	if (body.addons?.add) {
		const currentTags = Array.isArray(body.grouptag) ? body.grouptag : []
		body.grouptag = Array.from(new Set([...currentTags, body.addons.add]))
	}

	// Handle image deletion
	if (body.deleteImage === true) {
		body.image = ''
	}

	// Prepare location if provided
	let locationData: UpdateDeviceArgs['location']
	const mayLookupElevation =
		body.location || body.elevationLookupConsent !== undefined
			? await applyElevationConsentChoice(user.id, body.elevationLookupConsent)
			: false
	if (body.location) {
		locationData = {
			lat: body.location.lat,
			lng: body.location.lng,
		}

		const coordinatesChanged =
			body.location.lat !== currentDevice.latitude ||
			body.location.lng !== currentDevice.longitude
		const heightWasSupplied = body.location.height !== undefined
		const heightAboveGround = heightWasSupplied
			? body.location.height
			: currentDevice.heightAboveGround

		if (heightWasSupplied) {
			locationData.heightAboveGround = heightAboveGround ?? null
		}

		if (coordinatesChanged) {
			locationData.heightAboveGround = heightAboveGround ?? null
			locationData.terrainElevation = null
			locationData.terrainElevationDataset = null
		}

		const shouldLookupElevation =
			heightAboveGround !== null &&
			heightAboveGround !== undefined &&
			mayLookupElevation &&
			(coordinatesChanged || currentDevice.terrainElevation === null)

		if (shouldLookupElevation) {
			try {
				const elevationResult = await getTerrainElevation(
					body.location.lat,
					body.location.lng,
				)
				locationData.terrainElevation = elevationResult.elevation
				locationData.terrainElevationDataset = elevationResult.dataset
			} catch (error) {
				console.warn('PUT /boxes/:deviceId terrain elevation lookup failed', {
					error: error instanceof ElevationLookupError ? error.code : error,
					deviceId,
					latitude: body.location.lat,
					longitude: body.location.lng,
				})
			}
		}
	}

	const updateArgs: UpdateDeviceArgs = {
		name: body.name,
		exposure: body.exposure,
		description: body.description,
		image: body.image,
		model: body.model,
		useAuth: body.useAuth,
		link: body.weblink,
		location: locationData,
		grouptag: body.grouptag,
		sensors: body.sensors,
	}

	try {
		const updateResult = await updateDevice(user.id, currentDevice, updateArgs)

		if (updateResult === 'unauthorized') {
			return StandardResponse.forbidden(messages.deviceNotOwned)
		}

		if (updateResult === 'archived') {
			return StandardResponse.conflict(messages.deviceArchived)
		}

		const deviceWithSensors = await getDevice({ id: updateResult.id })

		if (!deviceWithSensors) {
			return StandardResponse.internalServerError()
		}

		const apiResponse = transformDeviceToApiFormat(deviceWithSensors)

		const responseParsed = await ApiDeviceSchema.safeParseAsync(apiResponse)

		if (!responseParsed.success) {
			return StandardResponse.internalServerError()
		}

		return StandardResponse.ok(responseParsed.data)
	} catch (error) {
		if (error instanceof DeviceUpdateError) {
			if (error.statusCode === 400) {
				return StandardResponse.badRequest(error.message)
			}

			if (error.statusCode === 404) {
				return StandardResponse.notFound(error.message)
			}
		}

		return StandardResponse.internalServerError()
	}
}

async function del(request: Request, user: User, deviceId: string) {
	const device = await getDevice({ id: deviceId })

	if (!device) {
		return StandardResponse.notFound('Device not found')
	}

	const parsedBody = await parseJsonBody(request, DeleteDeviceRequestSchema)
	if (parsedBody instanceof Response) return parsedBody

	try {
		const deleted = await deleteDevice(
			user,
			device as Device,
			parsedBody.password,
		)

		if (deleted === 'unauthorized') {
			return StandardResponse.unauthorized('Password incorrect')
		}

		return StandardResponse.ok(null)
	} catch {
		return StandardResponse.internalServerError()
	}
}

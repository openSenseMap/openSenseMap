import { type Route } from './+types/api.users.me.boxes.$deviceId'
import { getDevice } from '~/db/models/device.server'
import { withAuthenticatedUser } from '~/lib/jwt'
import { StandardResponse } from '~/lib/responses'

import * as z from 'zod/v4'
import { type ZodOpenApiPathItemObject } from 'zod-openapi'

import { DevicePathParamsSchema } from '~/lib/openapi/schemas/common'
import { ApiDeviceSchema } from '~/lib/openapi/schemas/device'

import {
	BadRequestErrorSchema,
	ForbiddenErrorSchema,
	InternalServerErrorSchema,
	badRequestResponse,
	forbiddenResponse,
	internalServerErrorResponse,
} from '~/lib/openapi/errors'

import { parsePathParams } from '~/lib/request-parsing'
import { transformDeviceToApiFormat } from '~/lib/device-transform'

const CurrentUserPrivateDeviceSchema = ApiDeviceSchema.meta({
	id: 'CurrentUserPrivateDevice',
	description:
		'Device owned by the authenticated user. This response may include private or secret fields.',
})

const GetCurrentUserDeviceResponseSchema = z
	.object({
		code: z.literal('Ok').default('Ok'),
		data: z.object({
			device: CurrentUserPrivateDeviceSchema,
		}),
	})
	.meta({
		id: 'GetCurrentUserDeviceResponse',
		description:
			'Response containing one device owned by the authenticated user.',
	})

export const openapi: ZodOpenApiPathItemObject = {
	get: {
		tags: ['User Management'],
		summary: 'Get one device of the current user',
		description:
			'Returns a specific device owned by the authenticated user. This endpoint may include private or secret fields that are not returned by public device endpoints.',
		security: [{ bearerAuth: [] }],

		requestParams: {
			path: DevicePathParamsSchema,
		},

		responses: {
			200: {
				description: 'Device returned successfully.',
				content: {
					'application/json': {
						schema: GetCurrentUserDeviceResponseSchema,
					},
				},
			},

			400: badRequestResponse(
				BadRequestErrorSchema,
				'Bad request. The device ID is missing, invalid, or no device exists for the given ID.',
			),

			403: forbiddenResponse(
				ForbiddenErrorSchema,
				'Invalid JWT authorization or the authenticated user does not own this device.',
			),

			500: internalServerErrorResponse(
				InternalServerErrorSchema,
				'Internal server error.',
			),
		},
	},
}

export const loader = async ({ request, params }: Route.LoaderArgs) => {
	try {
		const parsedParams = parsePathParams(params, DevicePathParamsSchema, {
			message: 'Invalid device id specified',
		})

		if (parsedParams instanceof Response) {
			return parsedParams
		}

		return await withAuthenticatedUser(request, async (user) => {
			const device = await getDevice({ id: parsedParams.deviceId })

			if (!device) {
				return StandardResponse.badRequest(
					'There is no such device with the given id',
				)
			}

			if (device.user.id !== user.id) {
				return StandardResponse.forbidden('User does not own this device')
			}

			const responseParsed =
				await GetCurrentUserDeviceResponseSchema.safeParseAsync({
					code: 'Ok',
					data: {
						device: transformDeviceToApiFormat(device),
					},
				})

			if (!responseParsed.success) {
				return StandardResponse.internalServerError()
			}

			return StandardResponse.ok(responseParsed.data)
		})
	} catch {
		return StandardResponse.internalServerError()
	}
}

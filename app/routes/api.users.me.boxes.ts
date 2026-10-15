import { type Route } from './+types/api.users.me.boxes'
import { getUserDevices } from '~/db/models/device.server'
import { enrichDevicesWithIntegrations } from '~/db/models/integration.server'
import { transformDeviceToApiFormat } from '~/lib/device-transform'
import { StandardResponse } from '~/lib/responses'

import * as z from 'zod/v4'

import { ApiDeviceSchema } from '~/lib/openapi/schemas/device'
import { type ZodOpenApiPathItemObject } from 'zod-openapi'
import {
	BadRequestErrorSchema,
	ForbiddenErrorSchema,
	badRequestResponse,
	forbiddenResponse,
	internalServerErrorResponse,
	InternalServerErrorSchema,
} from '~/lib/openapi/errors'
import { withAuthenticatedUser } from '~/lib/jwt'

const UserBoxSchema = ApiDeviceSchema.catchall(z.unknown()).meta({
	id: 'CurrentUserBox',
	description:
		'Device owned by the authenticated user. May include integration metadata.',
})

const GetCurrentUserBoxesQuerySchema = z.object({
	page: z.coerce.number().int().nonnegative().default(0).meta({
		description: 'Zero-based page number. Each page contains up to 3 boxes.',
		example: 0,
	}),
})

const GetCurrentUserBoxesResponseSchema = z
	.object({
		code: z.literal('Ok').default('Ok'),

		data: z.object({
			boxes: z.array(UserBoxSchema).meta({
				description: 'Devices owned by the authenticated user.',
			}),

			boxes_count: z.number().int().nonnegative().meta({
				description: 'Number of boxes returned.',
				example: 2,
			}),

			sharedBoxes: z.array(UserBoxSchema).meta({
				description:
					'Boxes shared with the authenticated user. Currently returned as an empty array.',
				example: [],
			}),
		}),
	})
	.meta({
		id: 'GetCurrentUserBoxesResponse',
		description:
			'Response containing the authenticated user’s own boxes and shared boxes.',
	})

export const openapi: ZodOpenApiPathItemObject = {
	get: {
		tags: ['User Management'],
		summary: 'Get current user boxes',
		description:
			'Returns one zero-based page of up to three boxes owned by the authenticated user. The response may include integration metadata for each box.',
		security: [{ bearerAuth: [] }],
		requestParams: {
			query: GetCurrentUserBoxesQuerySchema,
		},

		responses: {
			200: {
				description: 'User boxes returned successfully.',
				content: {
					'application/json': {
						schema: GetCurrentUserBoxesResponseSchema,
					},
				},
			},

			400: badRequestResponse(BadRequestErrorSchema, 'Invalid page parameter.'),

			403: forbiddenResponse(
				ForbiddenErrorSchema,
				'Invalid or missing JWT authorization.',
			),

			500: internalServerErrorResponse(
				InternalServerErrorSchema,
				'Internal server error.',
			),
		},
	},
}

export const loader = async ({ request }: Route.LoaderArgs) => {
	try {
		return await withAuthenticatedUser(request, async (user) => {
			const parsedQuery = GetCurrentUserBoxesQuerySchema.safeParse(
				Object.fromEntries(new URL(request.url).searchParams),
			)
			if (!parsedQuery.success) {
				return StandardResponse.badRequest('Invalid page parameter')
			}

			const userBoxes = await getUserDevices(user.id, {
				limit: 3,
				offset: parsedQuery.data.page * 3,
			})

			const transformedBoxes = userBoxes.map((box) =>
				transformDeviceToApiFormat(box),
			)

			const boxesWithIntegrations =
				await enrichDevicesWithIntegrations(transformedBoxes)

			const responseParsed =
				await GetCurrentUserBoxesResponseSchema.safeParseAsync({
					code: 'Ok',
					data: {
						boxes: boxesWithIntegrations,
						boxes_count: boxesWithIntegrations.length,
						sharedBoxes: [],
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

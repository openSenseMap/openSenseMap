import { type Route } from './+types/api.users.sign-out'
import { getUserFromJwt, revokeToken } from '~/lib/jwt'
import {
	InternalServerErrorSchema,
	internalServerErrorResponse,
	messageResponse,
} from '~/lib/openapi/errors'
import { apiMessages } from '~/lib/openapi/messages'
import { StandardResponse } from '~/lib/responses'
import { type ZodOpenApiPathItemObject } from 'zod-openapi'

export const openapi: ZodOpenApiPathItemObject = {
	post: {
		tags: ['Authentication'],
		summary: 'Sign out',
		description: 'Revokes the supplied JWT access token.',
		security: [{ bearerAuth: [] }],
		responses: {
			200: messageResponse('Successfully signed out.'),
			500: internalServerErrorResponse(
				InternalServerErrorSchema,
				'Internal server error.',
			),
		},
	},
}

export const action = async ({ request }: Route.ActionArgs) => {
	const user = await getUserFromJwt(request).catch(() => apiMessages.invalidJwt)
	const [, jwtString] = request.headers.get('authorization')?.split(' ') ?? []
	if (typeof user === 'string' || !jwtString) {
		return StandardResponse.forbidden(apiMessages.invalidJwt)
	}

	try {
		await revokeToken(user, jwtString)
		return StandardResponse.ok({
			code: 'Ok',
			message: 'Successfully signed out',
		})
	} catch {
		return StandardResponse.internalServerError()
	}
}

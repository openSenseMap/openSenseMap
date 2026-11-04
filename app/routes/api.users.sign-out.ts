import { type Route } from './+types/api.users.sign-out'
import { getUserFromJwt, revokeToken } from '~/lib/jwt'
import {
	ForbiddenErrorSchema,
	forbiddenResponse,
	InternalServerErrorSchema,
	internalServerErrorResponse,
	okMessageResponse,
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
			200: okMessageResponse('Successfully signed out.'),
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

export const action = async ({ request }: Route.ActionArgs) => {
	let user

	try {
		user = await getUserFromJwt(request)
	} catch {
		return StandardResponse.forbidden(apiMessages.invalidJwt)
	}

	if (typeof user === 'string') {
		return StandardResponse.forbidden(apiMessages.invalidJwt)
	}

	const rawAuthorizationHeader = request.headers.get('authorization')
	const [, jwtString] = rawAuthorizationHeader?.split(' ') ?? []

	if (!jwtString) {
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

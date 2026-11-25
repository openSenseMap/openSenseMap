import { type Route } from './+types/api.sign-out'
import { type User } from '~/db/schema'
import { getUserFromJwt, revokeToken } from '~/lib/jwt'
import {
	InternalServerErrorSchema,
	internalServerErrorResponse,
	messageResponse,
} from '~/lib/openapi/errors'
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
	try {
		// We deliberately make casts and stuff like that, so everything
		// but the happy path will result in an internal server error.
		// This is done s.t. we are not leaking information if someone
		// tries sending random token to see if users exist or similar
		const user = (await getUserFromJwt(request)) as User
		const rawAuthorizationHeader = request.headers
			.get('authorization')!
			.toString()
		const [, jwtString = ''] = rawAuthorizationHeader.split(' ')
		await revokeToken(user, jwtString)
		return StandardResponse.ok({
			code: 'Ok',
			message: 'Successfully signed out',
		})
	} catch {
		return StandardResponse.internalServerError()
	}
}

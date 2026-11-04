import { type Route } from './+types/api.users.refresh-auth'
import { getUserFromJwt, hashJwt, refreshJwt } from '~/lib/jwt'
import { StandardResponse } from '~/lib/responses'
import { z } from 'zod/v4'
import { type ZodOpenApiPathItemObject } from 'zod-openapi'
import {
	forbiddenResponse,
	internalServerErrorResponse,
	InternalServerErrorSchema,
	standardErrorResponseSchema,
} from '~/lib/openapi/errors'
import { UserSchema } from '~/lib/openapi/schemas/user'
import { transformUserToApiFormat } from '~/lib/user-transform'
import { parseBearerToken, parseRefreshAuthBody } from '~/lib/request-parsing'
import { AuthTokensSchema } from '~/lib/openapi/schemas/auth'

const errorMessages = {
	tokenRequired: 'You must specify a token to refresh',
	refreshTokenInvalid:
		'Refresh token invalid or too old. Please sign in with your username and password.',
}

export const RefreshAuthRequestSchema = z
	.object({
		token: z
			.string()
			.trim()
			.min(1, {
				error: errorMessages.tokenRequired,
			})
			.meta({
				description:
					'Refresh token bound to the current access token. This value is compared to the hash of the supplied bearer token.',
				example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
			}),
	})
	.meta({
		id: 'RefreshAuthRequest',
		description:
			'Refresh authentication request body. Can be submitted as JSON or form data.',
	})

const RefreshAuthResponseSchema = AuthTokensSchema.extend({
	code: z.literal('Authorized').default('Authorized'),
	message: z
		.literal('Successfully refreshed auth')
		.default('Successfully refreshed auth'),
	data: z.object({
		user: UserSchema,
	}),
}).meta({
	id: 'RefreshAuthResponse',
	description: 'Successfully refreshed authentication response.',
})

const RefreshAuthForbiddenErrorSchema = standardErrorResponseSchema(
	'Forbidden',
	z.union([
		z.literal(errorMessages.tokenRequired),
		z.literal(errorMessages.refreshTokenInvalid),
		z.string().startsWith('Invalid request format:').meta({
			example:
				'Invalid request format: Failed to parse request body as JSON or form data',
		}),
	]),
).meta({
	id: 'RefreshAuthForbiddenError',
	description:
		'Authentication failed because the refresh token is missing, invalid, expired, or the request body could not be parsed.',
})

export const openapi: ZodOpenApiPathItemObject = {
	post: {
		tags: ['Authentication'],
		summary: 'Refresh authentication token',
		description:
			'Refreshes the JWT access token using a valid refresh token. The current access token must be supplied via the Authorization bearer header, and the refresh token must be supplied in the request body.',
		security: [{ bearerAuth: [] }],

		requestBody: {
			required: true,
			content: {
				'application/json': {
					schema: RefreshAuthRequestSchema,
				},
				'application/x-www-form-urlencoded': {
					schema: RefreshAuthRequestSchema,
				},
			},
		},

		responses: {
			200: {
				description: 'Successfully refreshed authentication.',
				content: {
					'application/json': {
						schema: RefreshAuthResponseSchema,
					},
				},
			},

			403: forbiddenResponse(
				RefreshAuthForbiddenErrorSchema,
				'Authentication failed. The refresh token is missing, invalid, expired, or the request body could not be parsed.',
			),

			500: internalServerErrorResponse(
				InternalServerErrorSchema,
				'Internal server error.',
			),
		},
	},
}

export const action = async ({ request }: Route.ActionArgs) => {
	try {
		const body = await parseRefreshAuthBody(request)
		if (body instanceof Response) return body

		const jwtString = parseBearerToken(request)
		if (jwtString instanceof Response) return jwtString

		const jwtResponse = await getUserFromJwt(request)

		if (typeof jwtResponse === 'string') {
			return StandardResponse.forbidden(errorMessages.refreshTokenInvalid)
		}

		if (body.token !== hashJwt(jwtString)) {
			return StandardResponse.forbidden(errorMessages.refreshTokenInvalid)
		}

		const refreshed = await refreshJwt(jwtResponse, body.token)

		if (!refreshed?.token || !refreshed.refreshToken) {
			return StandardResponse.forbidden(errorMessages.refreshTokenInvalid)
		}

		const responseParsed = await RefreshAuthResponseSchema.safeParseAsync({
			code: 'Authorized',
			message: 'Successfully refreshed auth',
			data: {
				user: transformUserToApiFormat(jwtResponse),
			},
			token: refreshed.token,
			refreshToken: refreshed.refreshToken,
		})

		if (!responseParsed.success) {
			return StandardResponse.internalServerError()
		}

		return StandardResponse.ok(responseParsed.data)
	} catch {
		return StandardResponse.internalServerError()
	}
}

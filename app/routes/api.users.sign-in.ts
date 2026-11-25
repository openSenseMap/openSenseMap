import { z } from 'zod/v4'
import { type Route } from './+types/api.users.sign-in'
import { StandardResponse } from '~/lib/responses'
import { signIn } from '~/services/user-service.server'
import { type ZodOpenApiPathItemObject } from 'zod-openapi'
import {
	requestContentTypeJson,
	responseContentTypeJson,
} from '~/middleware/content-type-header.server'
import {
	InternalServerErrorSchema,
	UnsupportedMediaTypeErrorSchema,
	forbiddenResponse,
	internalServerErrorResponse,
	unsupportedMediaTypeResponse,
} from '~/lib/openapi/errors'
import { AuthTokensSchema } from '~/lib/openapi/schemas/auth'

const errorMessages = {
	email: 'You must specify either your email or your username',
	password: 'You must specify your password to sign in',
	userAndOrPassword: 'User and or password not valid!',
}

const SignInRequestSchema = z.object({
	email: z.string(errorMessages.email).trim().nonempty().meta({
		description: "User's email address or username",
		example: 'user@example.com',
	}),
	password: z.string(errorMessages.password).nonempty().min(8).meta({
		description: "User's password",
		example: 'mySecurePassword123',
	}),
})

const SignInResponseSchema = AuthTokensSchema.extend({
	data: z.object(
		{
			user: z.object({
				name: z.string(),
				email: z.email().meta({
					description: "User's email address",
					example: 'user@example.com',
				}),
				role: z.string(),
				language: z.string(),
				emailIsConfirmed: z.boolean(),
				boxes: z.array(z.string()).meta({
					description: 'A list of ids of the users devices',
					example: ['60a13611a877b3001b8ffd59', '5bdbe70f55d0ad001a04edc9'],
				}),
			}),
		},
		errorMessages.userAndOrPassword,
	),
	code: z.literal('Authorized').default('Authorized'),
	message: z
		.literal('Successfully signed in')
		.default('Successfully signed in'),
})

const SignInForbiddenErrorSchema = z
	.object({
		code: z.literal('Forbidden'),
		message: z.xor([
			z.literal(errorMessages.email),
			z.literal(errorMessages.password),
			z.literal(errorMessages.userAndOrPassword),
		]),
		error: z.xor([
			z.literal(errorMessages.email),
			z.literal(errorMessages.password),
			z.literal(errorMessages.userAndOrPassword),
		]),
	})
	.meta({
		id: 'SignInForbiddenError',
		description: 'Sign-in validation or authentication failure.',
	})

export const openapi: ZodOpenApiPathItemObject = {
	post: {
		tags: ['Auth'],
		summary: 'Sign in using email or name and password',
		requestBody: {
			required: true,
			content: {
				'application/json': { schema: SignInRequestSchema },
			},
		},
		responses: {
			200: {
				description: 'Signed in',
				content: {
					'application/json': { schema: SignInResponseSchema },
				},
			},
			403: forbiddenResponse(
				SignInForbiddenErrorSchema,
				'Sign-in validation or authentication failed.',
			),
			415: unsupportedMediaTypeResponse(
				UnsupportedMediaTypeErrorSchema,
				'Unsupported content-type. Try application/json.',
			),
			500: internalServerErrorResponse(
				InternalServerErrorSchema,
				'Internal server error.',
			),
		},
	},
}

export const middleware: Route.MiddlewareFunction[] = [
	requestContentTypeJson(),
	responseContentTypeJson,
]

export const action = async ({ request }: Route.ActionArgs) => {
	try {
		const requestParsed = await SignInRequestSchema.safeParseAsync(
			await request.json(),
		)
		if (!requestParsed.success)
			return StandardResponse.forbidden(requestParsed.error.issues[0].message)

		const { email, password } = requestParsed.data
		const signInResult = await signIn(email, password)

		if (!signInResult) {
			return StandardResponse.forbidden(errorMessages.userAndOrPassword)
		}

		const { user, jwt, refreshToken } = signInResult

		const responseParsed = await SignInResponseSchema.safeParseAsync({
			data: { user },
			token: jwt,
			refreshToken,
		})
		if (!responseParsed.success) return StandardResponse.internalServerError()

		return StandardResponse.ok(responseParsed.data)
	} catch {
		return StandardResponse.internalServerError()
	}
}

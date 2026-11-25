import { type Route } from './+types/api.users.register'
import { createToken } from '~/lib/jwt'
import { parseUserRegistrationData } from '~/lib/request-parsing'
import { StandardResponse } from '~/lib/responses'
import { registerUser } from '~/services/user-service.server'

import * as z from 'zod/v4'
import { type ZodOpenApiPathItemObject } from 'zod-openapi'

import { UserSchema, UserLanguageSchema } from '~/lib/openapi/schemas/user'

import {
	BadRequestErrorSchema,
	InternalServerErrorSchema,
	MethodNotAllowedErrorSchema,
	badRequestResponse,
	internalServerErrorResponse,
	methodNotAllowedResponse,
} from '~/lib/openapi/errors'

import {
	requestContentTypeJsonOrForm,
	responseContentTypeJson,
} from '~/middleware/content-type-header.server'
import { AuthTokensSchema, NewPasswordSchema } from '~/lib/openapi/schemas/auth'
import { transformUserToApiFormat } from '~/lib/user-transform'

const RegistrationNameSchema = z
	.string()
	.trim()
	.min(3)
	.max(40)
	.regex(/^[a-zA-Z0-9](?:[a-zA-Z0-9._ -]*[a-zA-Z0-9])?$/)
	.meta({
		description:
			'Full name or nickname of the user. Must be 3 to 40 characters long. Allows letters, numbers, dots, dashes, underscores, and spaces. The first and last character must be a letter or number.',
		example: 'Jane Doe',
	})

const RegisterUserRequestSchema = z
	.object({
		name: RegistrationNameSchema,

		email: z.string().trim().pipe(z.email()).meta({
			description: 'Email address used for signing in and user-related emails.',
			example: 'jane@example.com',
		}),

		password: NewPasswordSchema,

		language: UserLanguageSchema.optional().default('en_US').meta({
			description:
				'Preferred user language. Used for the website and emails. Defaults to `en_US`.',
			example: 'en_US',
		}),

		newsletterOptIn: z.boolean().optional().default(false).meta({
			description:
				'Whether to request a newsletter subscription. If true, a double opt-in confirmation email is sent before the user is subscribed.',
			example: true,
		}),
	})
	.meta({
		id: 'RegisterUserRequest',
		description: 'Payload for registering a new user.',
	})

const RegisterUserResponseSchema = AuthTokensSchema.extend({
	code: z.literal('Created').default('Created'),

	message: z
		.literal('Successfully registered new user')
		.default('Successfully registered new user'),

	data: z.object({
		user: UserSchema,
	}),
}).meta({
	id: 'RegisterUserResponse',
	description: 'Successfully registered user response.',
})

export const openapi: ZodOpenApiPathItemObject = {
	post: {
		tags: ['Authentication'],
		summary: 'Register a new user',
		description:
			'Registers a new openSenseMap user and returns an access token and refresh token. The user can sign in with the registered email address.',

		requestBody: {
			required: true,
			content: {
				'application/json': {
					schema: RegisterUserRequestSchema,
				},
				'application/x-www-form-urlencoded': {
					schema: RegisterUserRequestSchema,
				},
			},
		},

		responses: {
			201: {
				description: 'User registered successfully.',
				content: {
					'application/json': {
						schema: RegisterUserResponseSchema,
					},
				},
			},

			400: badRequestResponse(
				BadRequestErrorSchema,
				'Bad request. This can happen when the request body cannot be parsed or the submitted registration data is invalid.',
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

function mapRegistrationError(code: string): string {
	switch (code) {
		case 'username_required':
			return 'Username is required.'
		case 'username_length':
			return 'Username must be at least 3 characters long and not more than 40.'
		case 'username_invalid':
			return 'Username may only contain alphanumeric characters or single hyphens, and cannot begin or end with a hyphen.'
		case 'username_already_taken':
			return 'Username is already taken.'
		case 'email_required':
			return 'Email is required.'
		case 'email_invalid':
			return 'Invalid email format.'
		case 'email_already_taken':
			return 'User already exists.'
		case 'password_required':
			return 'Password is required.'
		case 'password_too_short':
			return 'Password must be at least 8 characters long.'
		case 'registration_failed':
		default:
			return 'Bad Request'
	}
}

export const middleware: Route.MiddlewareFunction[] = [
	requestContentTypeJsonOrForm(['POST']),
	responseContentTypeJson,
]

export const action = async ({ request }: Route.ActionArgs) => {
	if (request.method !== 'POST') {
		return StandardResponse.methodNotAllowed('')
	}

	try {
		const data = await parseUserRegistrationData(request)

		const username = data.name
		const email = data.email
		const password = data.password
		const language = data.language as 'de_DE' | 'en_US'
		const newsletterOptIn = data.newsletterOptIn

		const registration = await registerUser(
			username,
			email,
			password,
			language,
			true,
			newsletterOptIn,
		)

		if (!registration.ok) {
			return StandardResponse.badRequest(
				mapRegistrationError(registration.code),
			)
		}

		const user = registration.user

		try {
			const { token, refreshToken } = await createToken(user)

			const responseParsed = await RegisterUserResponseSchema.safeParseAsync({
				code: 'Created',
				message: 'Successfully registered new user',
				token,
				refreshToken,
				data: {
					user: transformUserToApiFormat(user),
				},
			})

			if (!responseParsed.success) {
				return StandardResponse.internalServerError()
			}

			return StandardResponse.created(responseParsed.data)
		} catch (err) {
			return StandardResponse.internalServerError(
				`Unable to create jwt for newly created user: ${(err as Error)?.message}`,
			)
		}
	} catch (error) {
		if (error instanceof Error && error.message.includes('Failed to parse')) {
			return StandardResponse.badRequest(
				`Invalid request format: ${error.message}`,
			)
		}

		return StandardResponse.internalServerError()
	}
}

import { z } from 'zod'
import { type ZodOpenApiPathItemObject } from 'zod-openapi'
import { getUserDeviceIds } from '~/db/models/device.server'
import { type User } from '~/db/schema/user'
import { withAuthenticatedUser } from '~/lib/jwt'
import { StandardResponse } from '~/lib/responses'
import { deleteUser, updateUserDetails } from '~/services/user-service.server'
import { type Route } from './+types/api.users.me'
import {
	UserLanguageSchema,
	UserSchema,
	UserWithBoxesSchema,
} from '~/lib/openapi/schemas/user'
import {
	BadRequestErrorSchema,
	badRequestResponse,
	ForbiddenErrorSchema,
	forbiddenResponse,
	internalServerErrorResponse,
	InternalServerErrorSchema,
	MethodNotAllowedErrorSchema,
	methodNotAllowedResponse,
	UnauthorizedErrorSchema,
	unauthorizedResponse,
} from '~/lib/openapi/errors'
import { apiMessages } from '~/lib/openapi/messages'
import { transformUserToApiFormat } from '~/lib/user-transform'
import {
	requestContentTypeJson,
	requestContentTypeJsonOrForm,
} from '~/middleware/content-type-header.server'
import { parseJsonBody, parseJsonOrFormRequest } from '~/lib/request-parsing'
import { NewPasswordSchema } from '~/lib/openapi/schemas/auth'
import { OkMessageResponseSchema } from '~/lib/openapi/schemas/common'

const messages = {
	noChanges: 'No changed properties supplied. User remains unchanged.',
	badRequest: 'Bad Request',
	currentPasswordRequired:
		'Current password is required when setting a new password',
	passwordIncorrect: 'Password incorrect',
} as const

const GetMeResponseSchema = z
	.object({
		code: z.literal('Ok').default('Ok'),
		data: z.object({
			me: UserWithBoxesSchema,
		}),
	})
	.meta({
		id: 'GetCurrentUserResponse',
		description: 'Current authenticated user including device ids.',
	})

const UpdateCurrentUserRequestSchema = z
	.object({
		email: z.email().optional().meta({
			description: 'New email address',
			example: 'newemail@example.com',
		}),
		language: UserLanguageSchema.optional(),
		name: z
			.string()
			.min(1)
			.refine((value) => value === value.trim(), {
				message: 'Name must not start or end with whitespace',
			})
			.optional(),
		currentPassword: z.string().min(1).optional().meta({
			description: 'Current password, required when setting a new password',
			example: 'currentPassword123',
			format: 'password',
		}),
		newPassword: NewPasswordSchema.optional(),
		newsletterOptIn: z.boolean().optional().meta({
			description:
				'Whether to request or disable newsletter messages. Enabling sends a double opt-in confirmation email before the subscription becomes active.',
			example: true,
		}),
	})
	.superRefine((data, ctx) => {
		if (data.email && data.newPassword) {
			ctx.addIssue({
				code: 'custom',
				message:
					'You cannot change your email address and password in the same request.',
			})
			return
		}

		if (data.newPassword && !data.currentPassword) {
			ctx.addIssue({
				code: 'custom',
				path: ['currentPassword'],
				message: messages.currentPasswordRequired,
			})
		}
	})
	.meta({
		id: 'UpdateCurrentUserRequest',
		description: 'Payload for updating the authenticated user profile.',
	})

const UpdateCurrentUserResponseSchema = z
	.object({
		code: z.literal('Ok').default('Ok'),
		message: z.string().meta({
			example: 'User successfully saved. Password updated.',
		}),
		data: z
			.object({
				me: UserSchema,
			})
			.optional(),
	})
	.meta({
		id: 'UpdateCurrentUserResponse',
		description:
			'Response returned after updating the current user. `data` is omitted when no changed properties are supplied.',
	})

const DeleteCurrentUserRequestSchema = z
	.object({
		password: z.string().min(1, messages.badRequest).meta({
			description: 'Current password for account deletion confirmation',
			example: 'myCurrentPassword123',
			format: 'password',
		}),
	})
	.meta({
		id: 'DeleteCurrentUserRequest',
		description: 'Payload for deleting the authenticated user account.',
	})

export const openapi: ZodOpenApiPathItemObject = {
	get: {
		tags: ['User Management'],
		summary: 'Get current user profile',
		description:
			"Retrieves the authenticated user's profile information, including the ids of the user's devices.",
		security: [{ bearerAuth: [] }],

		responses: {
			200: {
				description: 'Successfully retrieved user profile.',
				content: {
					'application/json': {
						schema: GetMeResponseSchema,
					},
				},
			},

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

	put: {
		tags: ['User Management'],
		summary: 'Update current user profile',
		description:
			"Updates the authenticated user's profile information. To change the password, `currentPassword` must be supplied together with `newPassword`.",
		security: [{ bearerAuth: [] }],

		requestBody: {
			required: true,
			content: {
				'application/json': {
					schema: UpdateCurrentUserRequestSchema,
				},
			},
		},

		responses: {
			200: {
				description:
					'User profile updated successfully, or no changed properties were supplied.',
				content: {
					'application/json': {
						schema: UpdateCurrentUserResponseSchema,
					},
				},
			},

			400: badRequestResponse(
				BadRequestErrorSchema,
				'Bad request. This can happen for invalid JSON, invalid request data, missing current password for password changes, or rejected update data.',
			),

			403: forbiddenResponse(
				ForbiddenErrorSchema,
				'Forbidden. The JWT is invalid or missing, or the supplied current password is incorrect.',
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

	delete: {
		tags: ['User Management'],
		summary: 'Delete current user account',
		description:
			"Permanently deletes the authenticated user's account. The current password may be supplied as JSON or form data.",
		security: [{ bearerAuth: [] }],

		requestBody: {
			required: true,
			content: {
				'application/json': {
					schema: DeleteCurrentUserRequestSchema,
				},
				'application/x-www-form-urlencoded': {
					schema: DeleteCurrentUserRequestSchema,
				},
				'multipart/form-data': {
					schema: DeleteCurrentUserRequestSchema,
				},
			},
		},

		responses: {
			200: {
				description: 'Account successfully deleted.',
				content: {
					'application/json': {
						schema: OkMessageResponseSchema,
					},
				},
			},

			400: badRequestResponse(
				BadRequestErrorSchema,
				'Bad request. This can happen when the body cannot be parsed or the password is missing.',
			),

			401: unauthorizedResponse(
				UnauthorizedErrorSchema,
				'Unauthorized. The provided password is incorrect.',
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

const getBearerToken = (request: Request) => {
	const rawAuthorizationHeader = request.headers.get('authorization')
	if (!rawAuthorizationHeader) return undefined

	const [scheme, token] = rawAuthorizationHeader.split(' ')
	if (scheme?.toLowerCase() !== 'bearer' || !token) return undefined

	return token
}

export const middleware: Route.MiddlewareFunction[] = [
	requestContentTypeJson(['PUT']),
	requestContentTypeJsonOrForm(['DELETE']),
]

export const loader = async ({ request }: Route.LoaderArgs) => {
	try {
		return await withAuthenticatedUser(request, async (user) => {
			const deviceIds = await getUserDeviceIds(user.id)

			const responseParsed = await GetMeResponseSchema.safeParseAsync({
				code: 'Ok',
				data: {
					me: {
						...transformUserToApiFormat(user),
						boxes: deviceIds,
					},
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

export const action = async ({ request }: Route.ActionArgs) => {
	return await withAuthenticatedUser(request, async (user) => {
		switch (request.method) {
			case 'PUT':
				return await put(user, request)

			case 'DELETE':
				return await del(user, request)

			default:
				return StandardResponse.methodNotAllowed('Method Not Allowed')
		}
	})
}

const put = async (user: User, request: Request): Promise<Response> => {
	try {
		const requestData = await parseJsonBody(
			request,
			UpdateCurrentUserRequestSchema,
		)

		if (requestData instanceof Response) {
			return requestData
		}

		const jwtString = getBearerToken(request)

		if (!jwtString) {
			return StandardResponse.forbidden(apiMessages.invalidJwt)
		}

		const {
			updated,
			messages: updateMessages,
			updatedUser,
		} = await updateUserDetails(user, jwtString, requestData)

		const messageText = updateMessages.join('.')

		if (updated === false || updateMessages.length === 0) {
			if (updated === false && updateMessages.length > 0) {
				if (updateMessages.includes(messages.passwordIncorrect)) {
					return StandardResponse.forbidden(messages.passwordIncorrect)
				}
				return StandardResponse.badRequest(messageText)
			}

			const responseParsed =
				await UpdateCurrentUserResponseSchema.safeParseAsync({
					code: 'Ok',
					message: messages.noChanges,
				})

			if (!responseParsed.success) {
				return StandardResponse.internalServerError()
			}

			return StandardResponse.ok(responseParsed.data)
		}

		const responseParsed = await UpdateCurrentUserResponseSchema.safeParseAsync(
			{
				code: 'Ok',
				message: `User successfully saved. ${messageText}`,
				data: { me: transformUserToApiFormat(updatedUser) },
			},
		)

		if (!responseParsed.success) {
			return StandardResponse.internalServerError()
		}

		return StandardResponse.ok(responseParsed.data)
	} catch {
		return StandardResponse.internalServerError()
	}
}

const del = async (user: User, request: Request): Promise<Response> => {
	try {
		const requestData = await parseJsonOrFormRequest(
			request,
			DeleteCurrentUserRequestSchema,
		)

		if (requestData instanceof Response) {
			return requestData
		}

		const jwtString = getBearerToken(request)

		if (!jwtString) {
			return StandardResponse.forbidden(apiMessages.invalidJwt)
		}

		const deleted = await deleteUser(user, requestData.password, jwtString)

		if (deleted === 'unauthorized') {
			return StandardResponse.unauthorized(apiMessages.passwordIncorrect)
		}

		if (!deleted) {
			return StandardResponse.internalServerError()
		}

		return StandardResponse.ok({
			code: 'Ok',
			message: `User and all boxes of user marked for deletion. Bye Bye ${user.name}!`,
		})
	} catch {
		return StandardResponse.internalServerError()
	}
}

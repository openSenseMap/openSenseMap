import { type Route } from './+types/api.users.password-reset'
import { parseJsonOrFormRequest } from '~/lib/request-parsing'
import { StandardResponse } from '~/lib/responses'
import { resetPassword } from '~/services/user-service.server'

import * as z from 'zod/v4'
import { type ZodOpenApiPathItemObject } from 'zod-openapi'

import {
	BadRequestErrorSchema,
	ForbiddenErrorSchema,
	InternalServerErrorSchema,
	UnsupportedMediaTypeErrorSchema,
	badRequestResponse,
	forbiddenResponse,
	internalServerErrorResponse,
	unsupportedMediaTypeResponse,
} from '~/lib/openapi/errors'
import { NewPasswordSchema } from '~/lib/openapi/schemas/auth'
import { OkMessageResponseSchema } from '~/lib/openapi/schemas/common'
import { requestContentTypeJsonOrForm } from '~/middleware/content-type-header.server'

const PasswordResetRequestSchema = z
	.object({
		password: NewPasswordSchema,

		token: z
			.string({
				error: 'No password reset token specified.',
			})
			.trim()
			.min(1, {
				error: 'No password reset token specified.',
			})
			.meta({
				description: 'Password reset token sent to the user by email.',
				example: 'pwreset_01jv7c9x8n0example',
			}),
	})
	.meta({
		id: 'PasswordResetRequest',
		description: 'Payload for resetting a password using an email token.',
	})

export const openapi: ZodOpenApiPathItemObject = {
	post: {
		tags: ['User Management'],
		summary: 'Reset password',
		description:
			'Resets a user password using a password reset token sent by email. The token is valid for the configured password-reset lifetime.',

		requestBody: {
			required: true,
			content: {
				'application/json': {
					schema: PasswordResetRequestSchema,
				},
				'application/x-www-form-urlencoded': {
					schema: PasswordResetRequestSchema,
				},
				'multipart/form-data': {
					schema: PasswordResetRequestSchema,
				},
			},
		},

		responses: {
			200: {
				description: 'Password changed successfully.',
				content: {
					'application/json': {
						schema: OkMessageResponseSchema,
					},
				},
			},

			400: badRequestResponse(
				BadRequestErrorSchema,
				'Bad request. The password or token is missing, or the new password does not meet the password requirements.',
			),

			403: forbiddenResponse(
				ForbiddenErrorSchema,
				'Password reset is not possible because the token is invalid, expired, or password reset is not possible for this user.',
			),

			415: unsupportedMediaTypeResponse(
				UnsupportedMediaTypeErrorSchema,
				'Unsupported content type. Use application/json, application/x-www-form-urlencoded, or multipart/form-data.',
			),

			500: internalServerErrorResponse(
				InternalServerErrorSchema,
				'Internal server error.',
			),
		},
	},
}

export const middleware: Route.MiddlewareFunction[] = [
	requestContentTypeJsonOrForm(['POST']),
]

export const action = async ({ request }: Route.ActionArgs) => {
	const requestParsed = await parseJsonOrFormRequest(
		request,
		PasswordResetRequestSchema,
	)

	if (requestParsed instanceof Response) {
		return requestParsed
	}

	try {
		const resetStatus = await resetPassword(
			requestParsed.token,
			requestParsed.password,
		)

		switch (resetStatus) {
			case 'forbidden':
				return StandardResponse.forbidden(
					'Password reset for this user not possible',
				)

			case 'expired':
				return StandardResponse.forbidden('Password reset token expired')

			case 'invalid_password_format':
				return StandardResponse.badRequest(
					'Password must be at least 8 characters.',
				)

			case 'success': {
				const responseParsed = await OkMessageResponseSchema.safeParseAsync({
					code: 'Ok',
					message:
						'Password successfully changed. You can now login with your new password',
				})

				if (!responseParsed.success) {
					return StandardResponse.internalServerError()
				}

				return StandardResponse.ok(responseParsed.data)
			}

			default:
				return StandardResponse.internalServerError()
		}
	} catch {
		return StandardResponse.internalServerError()
	}
}

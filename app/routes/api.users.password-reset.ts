import { type Route } from './+types/api.users.password-reset'
import { StandardResponse } from '~/lib/responses'
import { resetPassword } from '~/services/user-service.server'

import * as z from 'zod/v4'
import { type ZodOpenApiPathItemObject } from 'zod-openapi'

import {
	BadRequestErrorSchema,
	ForbiddenErrorSchema,
	InternalServerErrorSchema,
	badRequestResponse,
	forbiddenResponse,
	internalServerErrorResponse,
} from '~/lib/openapi/errors'
import { NewPasswordSchema } from '~/lib/openapi/schemas/auth'

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

const PasswordResetResponseSchema = z
	.object({
		code: z.literal('Ok').default('Ok'),
		message: z
			.literal(
				'Password successfully changed. You can now login with your new password',
			)
			.default(
				'Password successfully changed. You can now login with your new password',
			),
	})
	.meta({
		id: 'PasswordResetResponse',
		description: 'Password reset success response.',
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
						schema: PasswordResetResponseSchema,
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

			500: internalServerErrorResponse(
				InternalServerErrorSchema,
				'Internal server error.',
			),
		},
	},
}

const parsePasswordResetRequest = async (
	request: Request,
): Promise<z.output<typeof PasswordResetRequestSchema> | Response> => {
	let formData: FormData

	try {
		formData = await request.formData()
	} catch {
		return StandardResponse.badRequest('Bad Request')
	}

	const parsed = await PasswordResetRequestSchema.safeParseAsync(
		Object.fromEntries(formData.entries()),
	)

	if (!parsed.success) {
		return StandardResponse.badRequest(
			parsed.error.issues[0]?.message ?? 'Bad Request',
		)
	}

	return parsed.data
}

export const action = async ({ request }: Route.ActionArgs) => {
	const requestParsed = await parsePasswordResetRequest(request)

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

			case 'success':
				return await PasswordResetResponseSchema.safeParseAsync({
					code: 'Ok',
				})

			default:
				return StandardResponse.internalServerError()
		}
	} catch {
		return StandardResponse.internalServerError()
	}
}

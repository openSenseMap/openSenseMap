import { type Route } from './+types/api.users.request-password-reset'
import { parseJsonOrFormRequest } from '~/lib/request-parsing'
import { StandardResponse } from '~/lib/responses'
import { requestPasswordReset } from '~/services/user-service.server'

import * as z from 'zod/v4'
import { type ZodOpenApiPathItemObject } from 'zod-openapi'

import {
	BadRequestErrorSchema,
	InternalServerErrorSchema,
	badRequestResponse,
	internalServerErrorResponse,
} from '~/lib/openapi/errors'

import { requestContentTypeJsonOrForm } from '~/middleware/content-type-header.server'

const RequestPasswordResetRequestSchema = z
	.object({
		email: z
			.string({
				error: 'No email address specified.',
			})
			.trim()
			.min(1, {
				error: 'No email address specified.',
			})
			.pipe(
				z.email({
					error: 'Invalid email address.',
				}),
			)
			.meta({
				description: 'Email address of the user requesting a password reset.',
				example: 'user@example.com',
			}),
	})
	.meta({
		id: 'RequestPasswordResetRequest',
		description: 'Payload for requesting a password reset.',
	})

const RequestPasswordResetResponseSchema = z
	.object({
		code: z.literal('Ok').default('Ok'),
		message: z
			.literal('Password reset initiated')
			.default('Password reset initiated'),
	})
	.meta({
		id: 'RequestPasswordResetResponse',
		description:
			'Password reset initiation response. This response is returned regardless of whether the email address belongs to an existing user.',
	})

export const openapi: ZodOpenApiPathItemObject = {
	post: {
		tags: ['User Management'],
		summary: 'Request a password reset',
		description:
			'Requests a password reset for the given email address. If the email address belongs to a user, an email with reset instructions is sent. To avoid leaking whether an email address exists, a successful response is returned regardless of whether the address is known.',

		requestBody: {
			required: true,
			content: {
				'application/json': { schema: RequestPasswordResetRequestSchema },
				'application/x-www-form-urlencoded': {
					schema: RequestPasswordResetRequestSchema,
				},
				'multipart/form-data': {
					schema: RequestPasswordResetRequestSchema,
				},
			},
		},

		responses: {
			200: {
				description: 'Password reset initiated.',
				content: {
					'application/json': {
						schema: RequestPasswordResetResponseSchema,
					},
				},
			},

			400: badRequestResponse(
				BadRequestErrorSchema,
				'Bad request. The email field is missing or empty.',
			),

			500: internalServerErrorResponse(
				InternalServerErrorSchema,
				'Internal server error.',
			),
		},
	},
}

export const middleware: Route.MiddlewareFunction[] = [
	requestContentTypeJsonOrForm(),
]

export const action = async ({ request }: Route.ActionArgs) => {
	const parsedRequest = await parseJsonOrFormRequest(
		request,
		RequestPasswordResetRequestSchema,
	)

	if (parsedRequest instanceof Response) {
		return parsedRequest
	}

	try {
		await requestPasswordReset(parsedRequest.email)

		const responseParsed =
			await RequestPasswordResetResponseSchema.safeParseAsync({
				code: 'Ok',
				message: 'Password reset initiated',
			})

		if (!responseParsed.success) {
			return StandardResponse.internalServerError()
		}

		return StandardResponse.ok(responseParsed.data)
	} catch {
		return StandardResponse.internalServerError()
	}
}

import { type Route } from './+types/api.users.request-password-reset'
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

import { requestContentTypeForm } from '~/middleware/content-type-header.server'

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

const parsePasswordResetRequest = async (
	request: Request,
): Promise<z.output<typeof RequestPasswordResetRequestSchema> | Response> => {
	let formData: FormData

	try {
		formData = await request.formData()
	} catch {
		return StandardResponse.badRequest('Invalid form data.')
	}

	const parsed = await RequestPasswordResetRequestSchema.safeParseAsync(
		Object.fromEntries(formData.entries()),
	)

	if (!parsed.success) {
		const issue = parsed.error.issues[0]

		if (issue?.path.includes('email')) {
			return StandardResponse.badRequest(
				issue.code === 'invalid_format'
					? 'Invalid email address.'
					: 'No email address specified.',
			)
		}

		return StandardResponse.badRequest(
			issue?.message ?? 'Invalid password reset request.',
		)
	}

	return parsed.data
}

export const middleware: Route.MiddlewareFunction[] = [requestContentTypeForm()]

export const action = async ({ request }: Route.ActionArgs) => {
	const parsedRequest = await parsePasswordResetRequest(request)

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

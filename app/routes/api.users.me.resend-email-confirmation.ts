import { type Route } from './+types/api.users.me.resend-email-confirmation'
import { getUserFromJwt } from '~/lib/jwt'
import { StandardResponse } from '~/lib/responses'
import { resendEmailConfirmation } from '~/services/user-service.server'

import { type ZodOpenApiPathItemObject } from 'zod-openapi'
import { OkMessageResponseSchema } from '~/lib/openapi/schemas/common'

import {
	ForbiddenErrorSchema,
	InternalServerErrorSchema,
	UnprocessableContentErrorSchema,
	forbiddenResponse,
	internalServerErrorResponse,
	unprocessableContentResponse,
} from '~/lib/openapi/errors'

export const openapi: ZodOpenApiPathItemObject = {
	post: {
		tags: ['User Management'],
		summary: 'Resend email confirmation',
		description:
			'Requests another email confirmation message for the authenticated user. If the user has a pending unconfirmed email address, the confirmation email is sent to that pending address. Otherwise it is sent to the current user email address. If the email address is already confirmed and there is no pending email change, the request returns 422.',
		security: [{ bearerAuth: [] }],

		responses: {
			200: {
				description: 'Email confirmation sent successfully.',
				content: {
					'application/json': {
						schema: OkMessageResponseSchema,
					},
				},
			},

			403: forbiddenResponse(
				ForbiddenErrorSchema,
				'Invalid or missing JWT authorization.',
			),

			422: unprocessableContentResponse(
				UnprocessableContentErrorSchema,
				'Email address is already confirmed and there is no pending unconfirmed email address.',
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
		const jwtResponse = await getUserFromJwt(request)

		if (typeof jwtResponse === 'string') {
			return StandardResponse.forbidden(
				'Invalid JWT authorization. Please sign in to obtain new JWT.',
			)
		}

		const result = await resendEmailConfirmation(jwtResponse)
		if (result === 'already_confirmed') {
			return StandardResponse.unprocessableContent(
				`Email address ${jwtResponse.email} is already confirmed.`,
			)
		}

		const recipient = result.unconfirmedEmail?.trim() || result.email

		return StandardResponse.ok({
			code: 'Ok',
			message: `Email confirmation has been sent to ${recipient}`,
		})
	} catch {
		return StandardResponse.internalServerError()
	}
}

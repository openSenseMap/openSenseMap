import { type Route } from './+types/api.users.confirm-email'
import { z } from 'zod'
import { parseJsonOrFormRequest } from '~/lib/request-parsing'
import { StandardResponse } from '~/lib/responses'
import { confirmEmail } from '~/services/user-service.server'

const ConfirmEmailRequestSchema = z.object({
	email: z.string().optional(),
	token: z.string().trim().min(1, 'No email confirmation token specified.'),
})

export const action = async ({ request }: Route.ActionArgs) => {
	const requestData = await parseJsonOrFormRequest(
		request,
		ConfirmEmailRequestSchema,
	)
	if (requestData instanceof Response) return requestData

	try {
		const result = await confirmEmail(requestData.token)

		if (result === 'success') {
			return StandardResponse.ok({
				code: 'Ok',
				message: 'E-Mail successfully confirmed. Thank you',
			})
		}

		if (result === 'expired') {
			return StandardResponse.forbidden(
				'Invalid or expired confirmation token.',
			)
		}

		return StandardResponse.forbidden('Invalid or expired confirmation token.')
	} catch {
		return StandardResponse.internalServerError()
	}
}

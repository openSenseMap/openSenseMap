import { type Route } from './+types/api.mailgun.newsletter-webhook'
import { StandardResponse } from '~/lib/responses'
import {
	disableNewsletterForEmail,
	getNewsletterWebhookEmail,
	isMailgunUnsubscribeEvent,
	verifyMailgunWebhookSignature,
} from '~/services/newsletter-service.server'

type MailgunWebhookPayload = Parameters<typeof verifyMailgunWebhookSignature>[0]

export const action = async ({ request }: Route.ActionArgs) => {
	if (request.method !== 'POST') {
		return StandardResponse.methodNotAllowed('Method Not Allowed')
	}

	let payload: unknown
	try {
		payload = await request.json()
	} catch {
		return StandardResponse.badRequest('Invalid JSON payload')
	}

	if (typeof payload !== 'object' || payload === null) {
		return StandardResponse.badRequest('Invalid JSON payload')
	}

	const mailgunPayload = payload as MailgunWebhookPayload

	if (!verifyMailgunWebhookSignature(mailgunPayload)) {
		return StandardResponse.forbidden('Invalid Mailgun webhook signature')
	}

	if (!isMailgunUnsubscribeEvent(mailgunPayload)) {
		return StandardResponse.ok({ message: 'Ignored event' })
	}

	const email = getNewsletterWebhookEmail(mailgunPayload)
	if (!email) {
		return StandardResponse.badRequest('Missing recipient email')
	}

	await disableNewsletterForEmail(email)

	return StandardResponse.ok({ message: 'Newsletter opt-in disabled' })
}

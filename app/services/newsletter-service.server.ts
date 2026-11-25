import crypto from 'node:crypto'
import { and, eq, gt, sql } from 'drizzle-orm'
import {
	getUserByEmail,
	updateUserPreferencesById,
} from '~/db/models/user.server'
import {
	hashActionToken,
	hasPendingNewsletterConfirmationToken,
	issueNewsletterConfirmationToken,
	revokeNewsletterConfirmationToken,
} from '~/db/models/token.server'
import { actionToken, user, type User } from '~/db/schema'
import { drizzleClient } from '~/db.server'
import NewsletterConfirmationEmail, {
	subject as NewsletterConfirmationEmailSubject,
} from '~/emails/newsletter-confirmation'
import { sendMail } from '~/lib/mail.server'

type MailgunWebhookPayload = {
	signature?: {
		timestamp?: string
		token?: string
		signature?: string
	}
	'event-data'?: {
		event?: string
		recipient?: string
		message?: {
			headers?: {
				to?: string
			}
		}
	}
}

const getMailgunConfig = () => {
	const apiKey = process.env.MAILGUN_API_KEY
	const listAddress = process.env.MAILGUN_NEWSLETTER_LIST
	const baseUrl =
		process.env.MAILGUN_API_BASE_URL?.replace(/\/$/, '') ??
		'https://api.mailgun.net'

	if (!apiKey || !listAddress) {
		throw new Error(
			'Mailgun newsletter config missing. Set MAILGUN_API_KEY and MAILGUN_NEWSLETTER_LIST.',
		)
	}

	return { apiKey, listAddress, baseUrl }
}

const getAuthorizationHeader = (apiKey: string) =>
	`Basic ${Buffer.from(`api:${apiKey}`).toString('base64')}`

/** Sends a form-encoded request to the configured Mailgun API. */
async function mailgunRequest(
	path: string,
	method: 'DELETE' | 'POST' | 'PUT',
	body?: URLSearchParams,
	options?: {
		ignoreNotFound?: boolean
	},
) {
	const config = getMailgunConfig()

	const response = await fetch(`${config.baseUrl}${path}`, {
		method,
		headers: {
			Authorization: getAuthorizationHeader(config.apiKey),
			'Content-Type': 'application/x-www-form-urlencoded',
		},
		body,
	})

	if (response.status === 404 && options?.ignoreNotFound) {
		return 'not_found'
	}

	if (!response.ok) {
		const message = await response.text()
		throw new Error(
			`Mailgun newsletter sync failed: ${response.status} ${message}`,
		)
	}

	return 'synced'
}

/** Upserts the user as a Mailgun list member with their current opt-in state. */
export async function syncNewsletterSubscriptionWithMailgun(userToSync: User) {
	const config = getMailgunConfig()

	const body = new URLSearchParams({
		address: userToSync.email,
		name: userToSync.name,
		subscribed: String(userToSync.newsletterOptIn),
		upsert: 'yes',
	})

	return mailgunRequest(
		`/v3/lists/${encodeURIComponent(config.listAddress)}/members`,
		'POST',
		body,
	)
}

/** Removes an email address from the configured Mailgun newsletter list. */
export async function removeNewsletterMemberFromMailgun(email: string) {
	const config = getMailgunConfig()

	return mailgunRequest(
		`/v3/lists/${encodeURIComponent(config.listAddress)}/members/${encodeURIComponent(
			email,
		)}`,
		'DELETE',
		undefined,
		{ ignoreNotFound: true },
	)
}

/** Removes the old email and asks the new email address to confirm newsletter opt-in again. */
export async function triggerNewsletterReconfirmationAfterEmailChange(
	userToSync: User,
	previousEmail: string,
) {
	const oldEmail = previousEmail.trim().toLowerCase()
	const newEmail = userToSync.email.trim().toLowerCase()

	if (!userToSync.newsletterOptIn || oldEmail === newEmail) {
		return 'unchanged'
	}

	await removeNewsletterMemberFromMailgun(oldEmail)
	const updatedUser = await updateUserPreferencesById(userToSync.id, {
		newsletterOptIn: false,
	})
	await requestNewsletterConfirmation({
		...updatedUser,
		email: newEmail,
		newsletterOptIn: false,
	})

	return 'synced'
}

/** Sends the newsletter double-opt-in confirmation email for a user. */
export async function requestNewsletterConfirmation(userToConfirm: User) {
	if (userToConfirm.newsletterOptIn) return 'already_confirmed' as const

	const token = await issueNewsletterConfirmationToken(userToConfirm.id)
	const lng = (userToConfirm.language?.split('_')[0] as 'de' | 'en') ?? 'en'

	try {
		await sendMail({
			recipientAddress: userToConfirm.email,
			recipientName: userToConfirm.name,
			subject: NewsletterConfirmationEmailSubject[lng],
			body: NewsletterConfirmationEmail({
				user: {
					name: userToConfirm.name,
					email: userToConfirm.email,
				},
				token,
				language: lng,
			}),
		})
	} catch (err) {
		await revokeNewsletterConfirmationToken(userToConfirm.id)
		throw err
	}

	return 'confirmation_sent' as const
}

/** Returns whether a user has an unexpired newsletter confirmation pending. */
export async function hasPendingNewsletterConfirmation(userId: User['id']) {
	return hasPendingNewsletterConfirmationToken(userId)
}

/** Cancels pending confirmation or disables an active newsletter subscription. */
export async function disableNewsletterForUser(userToDisable: User) {
	await revokeNewsletterConfirmationToken(userToDisable.id)

	if (!userToDisable.newsletterOptIn) return userToDisable

	const updatedUser = await updateUserPreferencesById(userToDisable.id, {
		newsletterOptIn: false,
	})
	await syncNewsletterSubscriptionWithMailgun(updatedUser)

	return updatedUser
}

/** Confirms a pending newsletter opt-in token and subscribes the user in Mailgun. */
export async function confirmNewsletterSubscription(
	rawToken: string,
): Promise<'forbidden' | 'expired' | 'success'> {
	const now = new Date()
	const tokenHash = hashActionToken(rawToken)

	const token = await drizzleClient.query.actionToken.findFirst({
		where: (t) =>
			and(eq(t.purpose, 'newsletter_confirmation'), eq(t.tokenHash, tokenHash)),
	})

	if (!token) return 'forbidden'
	if (now.getTime() > token.expiresAt.getTime()) return 'expired'

	const currentUser = await drizzleClient.query.user.findFirst({
		where: (u) => eq(u.id, token.userId),
	})

	if (!currentUser) return 'forbidden'

	await syncNewsletterSubscriptionWithMailgun({
		...currentUser,
		newsletterOptIn: true,
	})

	return drizzleClient.transaction(async (tx) => {
		await tx
			.update(user)
			.set({
				newsletterOptIn: true,
				updatedAt: sql`NOW()`,
			})
			.where(eq(user.id, currentUser.id))

		const deleted = await tx
			.delete(actionToken)
			.where(
				and(
					eq(actionToken.id, token.id),
					eq(actionToken.tokenHash, tokenHash),
					gt(actionToken.expiresAt, now),
				),
			)
			.returning({ id: actionToken.id })

		if (deleted.length === 0) return 'forbidden' as const

		return 'success' as const
	})
}

/** Disables the local newsletter preference for a Mailgun recipient email. */
export async function disableNewsletterForEmail(email: string) {
	const existingUser = await getUserByEmail(email.toLowerCase())
	if (!existingUser) return null

	await revokeNewsletterConfirmationToken(existingUser.id)

	return updateUserPreferencesById(existingUser.id, { newsletterOptIn: false })
}

/** Verifies that a webhook payload was signed by Mailgun. */
export function verifyMailgunWebhookSignature(
	payload: MailgunWebhookPayload,
): boolean {
	const signingKey = process.env.MAILGUN_WEBHOOK_SIGNING_KEY
	const signature = payload.signature

	if (
		!signingKey ||
		!signature?.timestamp ||
		!signature.token ||
		!signature.signature
	) {
		return false
	}

	const digest = crypto
		.createHmac('sha256', signingKey)
		.update(`${signature.timestamp}${signature.token}`)
		.digest('hex')

	const expectedSignature = Buffer.from(digest)
	const receivedSignature = Buffer.from(signature.signature)

	return (
		expectedSignature.length === receivedSignature.length &&
		crypto.timingSafeEqual(expectedSignature, receivedSignature)
	)
}

/** Extracts the affected recipient email from a Mailgun webhook payload. */
export function getNewsletterWebhookEmail(payload: MailgunWebhookPayload) {
	return (
		payload['event-data']?.recipient ??
		payload['event-data']?.message?.headers?.to ??
		null
	)
}

/** Returns true when the Mailgun webhook event represents an unsubscribe. */
export function isMailgunUnsubscribeEvent(payload: MailgunWebhookPayload) {
	return payload['event-data']?.event === 'unsubscribed'
}

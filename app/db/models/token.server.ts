import { createHash, randomBytes } from 'node:crypto'
import { and, eq, gt } from 'drizzle-orm'
import { actionToken } from '~/db/schema'
import { drizzleClient } from '~/db.server'

export function generateRawActionToken() {
	return randomBytes(32).toString('base64url')
}

export function hashActionToken(token: string) {
	return createHash('sha256').update(token, 'utf8').digest('hex')
}

const EMAIL_CONFIRMATION_TTL_MS = 24 * 3600000 //* ONE_HOUR_MILLIS
const NEWSLETTER_CONFIRMATION_TTL_MS = 7 * 24 * 3600000 // 7 days

export async function issueEmailConfirmationToken(userId: string) {
	const rawToken = generateRawActionToken()
	const tokenHash = hashActionToken(rawToken)

	await drizzleClient
		.insert(actionToken)
		.values({
			userId,
			purpose: 'email_confirmation',
			tokenHash,
			expiresAt: new Date(Date.now() + EMAIL_CONFIRMATION_TTL_MS),
		})
		.onConflictDoUpdate({
			target: [actionToken.userId, actionToken.purpose],
			set: {
				tokenHash,
				expiresAt: new Date(Date.now() + EMAIL_CONFIRMATION_TTL_MS),
			},
		})

	return rawToken
}

export async function issueNewsletterConfirmationToken(userId: string) {
	const rawToken = generateRawActionToken()
	const tokenHash = hashActionToken(rawToken)

	await drizzleClient
		.insert(actionToken)
		.values({
			userId,
			purpose: 'newsletter_confirmation',
			tokenHash,
			expiresAt: new Date(Date.now() + NEWSLETTER_CONFIRMATION_TTL_MS),
		})
		.onConflictDoUpdate({
			target: [actionToken.userId, actionToken.purpose],
			set: {
				tokenHash,
				expiresAt: new Date(Date.now() + NEWSLETTER_CONFIRMATION_TTL_MS),
			},
		})

	return rawToken
}

export async function hasPendingNewsletterConfirmationToken(userId: string) {
	const token = await drizzleClient.query.actionToken.findFirst({
		where: (t) =>
			and(
				eq(t.userId, userId),
				eq(t.purpose, 'newsletter_confirmation'),
				gt(t.expiresAt, new Date()),
			),
	})

	return Boolean(token)
}

export async function revokeNewsletterConfirmationToken(userId: string) {
	await drizzleClient
		.delete(actionToken)
		.where(
			and(
				eq(actionToken.userId, userId),
				eq(actionToken.purpose, 'newsletter_confirmation'),
			),
		)
}

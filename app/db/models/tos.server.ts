import { and, eq, gt, isNull } from 'drizzle-orm'
import { generateRawActionToken, hashActionToken } from './token.server'
import { actionToken, user } from '~/db/schema'
import { tosUserState } from '~/db/schema/tos'
import { drizzleClient } from '~/db.server'

export async function getCurrentEffectiveTos(now = new Date()) {
	return drizzleClient.query.tosVersion.findFirst({
		where: (t, { lte }) => lte(t.effectiveFrom, now),
		orderBy: (t, { desc }) => [desc(t.effectiveFrom)],
	})
}

async function getUserAcceptance(userId: string, tosVersionId: string) {
	return drizzleClient.query.tosUserState.findFirst({
		where: (s, { and, eq }) =>
			and(eq(s.userId, userId), eq(s.tosVersionId, tosVersionId)),
		columns: { acceptedAt: true },
	})
}

export function getTosLocale(language: string | null | undefined): 'en' | 'de' {
	if (!language) return 'en'

	if (language.startsWith('de')) return 'de'
	return 'en'
}

export async function markTosAccepted({
	userId,
	tosId,
	now = new Date(),
}: {
	userId: string
	tosId: string
	now?: Date
}) {
	await drizzleClient
		.insert(tosUserState)
		.values({
			userId,
			tosVersionId: tosId,
			acceptedAt: now,
		})
		.onConflictDoUpdate({
			target: [tosUserState.userId, tosUserState.tosVersionId],
			set: { acceptedAt: now },
		})
}

export async function getTosRequirementForUser(
	userId: string,
	now = new Date(),
) {
	const current = await getCurrentEffectiveTos(now)
	if (!current) {
		return {
			tos: null,
			accepted: true,
			inGrace: false,
			mustBlock: false,
			acceptBy: null as Date | null,
		}
	}

	const state = await getUserAcceptance(userId, current.id)
	const accepted = !!state?.acceptedAt

	const acceptBy = new Date(current.acceptBy)
	const inGrace = !accepted && now < acceptBy
	const mustBlock = !accepted && now >= acceptBy

	return { tos: current, accepted, inGrace, mustBlock, acceptBy }
}

const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000

export async function issueTosAcceptanceToken(userId: string) {
	const rawToken = generateRawActionToken()
	const tokenHash = hashActionToken(rawToken)

	await drizzleClient
		.insert(actionToken)
		.values({
			userId,
			purpose: 'tos_acceptance',
			tokenHash,
			expiresAt: new Date(Date.now() + TWO_WEEKS_MS),
		})
		.onConflictDoUpdate({
			target: [actionToken.userId, actionToken.purpose],
			set: {
				tokenHash,
				expiresAt: new Date(Date.now() + TWO_WEEKS_MS),
			},
		})

	return rawToken
}

export async function getValidTosAcceptanceToken(
	rawToken: string,
	now = new Date(),
) {
	const tokenHash = hashActionToken(rawToken)

	return drizzleClient.query.actionToken.findFirst({
		where: (t, { and, eq, gt, isNull }) =>
			and(
				eq(t.purpose, 'tos_acceptance'),
				eq(t.tokenHash, tokenHash),
				gt(t.expiresAt, now),
			),
	})
}

export async function getActiveTosAcceptanceTokenById(
	tokenId: string,
	userId: string,
	now = new Date(),
) {
	return drizzleClient.query.actionToken.findFirst({
		where: (t, { and, eq, gt, isNull }) =>
			and(
				eq(t.id, tokenId),
				eq(t.userId, userId),
				eq(t.purpose, 'tos_acceptance'),
				gt(t.expiresAt, now),
			),
	})
}

export async function acceptCurrentTosViaEmailFlow({
	tokenId,
	userId,
	now = new Date(),
}: {
	tokenId: string
	userId: string
	now?: Date
}): Promise<'success' | 'forbidden' | 'not_configured'> {
	return drizzleClient.transaction(async (tx) => {
		const consumed = await tx
			.delete(actionToken)
			.where(
				and(
					eq(actionToken.id, tokenId),
					eq(actionToken.userId, userId),
					eq(actionToken.purpose, 'tos_acceptance'),
					gt(actionToken.expiresAt, now),
				),
			)
			.returning({ userId: actionToken.userId })

		if (consumed.length === 0) return 'forbidden'

		const current = await tx.query.tosVersion.findFirst({
			where: (t, { lte }) => lte(t.effectiveFrom, now),
			orderBy: (t, { desc }) => [desc(t.effectiveFrom)],
		})

		if (!current) return 'not_configured'

		await tx
			.insert(tosUserState)
			.values({
				userId,
				tosVersionId: current.id,
				acceptedAt: now,
			})
			.onConflictDoUpdate({
				target: [tosUserState.userId, tosUserState.tosVersionId],
				set: { acceptedAt: now },
			})

		await tx
			.update(user)
			.set({
				acceptedTosVersionId: current.id,
				acceptedTosAt: now,
			})
			.where(eq(user.id, userId))

		return 'success'
	})
}

import { and, eq, isNull } from 'drizzle-orm'
import { elevationConsent } from '~/db/schema/elevation-consent'
import { drizzleClient } from '~/db.server'

// Increment this when the displayed consent text changes.
export const CURRENT_ELEVATION_CONSENT_VERSION = 'gpxz-v1'

export async function hasCurrentElevationConsent(userId: string) {
	const consent = await drizzleClient.query.elevationConsent.findFirst({
		where: (record, { and, eq, isNull }) =>
			and(
				eq(record.userId, userId),
				eq(record.consentVersion, CURRENT_ELEVATION_CONSENT_VERSION),
				isNull(record.withdrawnAt),
			),
		columns: { id: true },
	})

	return consent !== undefined
}

export async function grantCurrentElevationConsent(
	userId: string,
	now = new Date(),
) {
	if (await hasCurrentElevationConsent(userId)) return

	await drizzleClient.transaction(async (tx) => {
		await tx
			.update(elevationConsent)
			.set({ withdrawnAt: now })
			.where(
				and(
					eq(elevationConsent.userId, userId),
					isNull(elevationConsent.withdrawnAt),
				),
			)

		await tx.insert(elevationConsent).values({
			userId,
			consentVersion: CURRENT_ELEVATION_CONSENT_VERSION,
			acceptedAt: now,
		})
	})
}

export async function withdrawElevationConsent(
	userId: string,
	now = new Date(),
) {
	await drizzleClient
		.update(elevationConsent)
		.set({ withdrawnAt: now })
		.where(
			and(
				eq(elevationConsent.userId, userId),
				isNull(elevationConsent.withdrawnAt),
			),
		)
}

export async function applyElevationConsentChoice(
	userId: string,
	choice: boolean | undefined,
) {
	if (choice === true) {
		await grantCurrentElevationConsent(userId)
		return true
	}

	if (choice === false) {
		await withdrawElevationConsent(userId)
		return false
	}

	return hasCurrentElevationConsent(userId)
}

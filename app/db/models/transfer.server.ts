import { randomBytes } from 'node:crypto'
import { eq, and } from 'drizzle-orm'
import { type Claim, claim, type Device } from '~/db/schema'
import { drizzleClient } from '~/db.server'

export interface TransferCode {
	id: string
	boxId: string
	token: string
	expiresAt: Date
	createdAt: Date
}

export const getDefaultExpirationDate = (): Date => {
	const now = new Date()
	now.setHours(now.getHours() + 24)
	return now
}

export const isClaimExpired = (expiresAt: Date | null): boolean => {
	if (!expiresAt) return false
	return expiresAt <= new Date()
}

export const createTransfer = async (
	boxId: string,
	expiresAt?: Date,
): Promise<Claim> => {
	const token = generateTransferCode()
	const expirationDate = expiresAt || getDefaultExpirationDate()

	const [newClaim] = await drizzleClient
		.insert(claim)
		.values({
			boxId,
			token,
			expiresAt: expirationDate,
		})
		.returning()

	if (!newClaim) {
		throw new Error('Failed to create transfer claim')
	}

	return newClaim
}

export const generateTransferCode = (): string => {
	return randomBytes(6).toString('hex')
}

export function getTransfer({ id }: Pick<Device, 'id'>) {
	return drizzleClient.query.claim.findFirst({
		where: (claim, { eq }) => eq(claim.boxId, id),
	})
}

export const getTransferByBoxId = async (
	boxId: string,
): Promise<Claim | null> => {
	const [result] = await drizzleClient
		.select()
		.from(claim)
		.where(eq(claim.boxId, boxId))
		.limit(1)

	return result || null
}

export const deleteClaimById = async (claimId: string): Promise<void> => {
	await drizzleClient.delete(claim).where(eq(claim.id, claimId))
}

export const removeTransfer = async (
	boxId: string,
	token: string,
): Promise<void> => {
	const [existingClaim] = await drizzleClient
		.select()
		.from(claim)
		.where(and(eq(claim.token, token), eq(claim.boxId, boxId)))

	if (!existingClaim) {
		throw new Error('Transfer token not found')
	}

	await drizzleClient.delete(claim).where(eq(claim.id, existingClaim.id))
}

export const updateTransferExpiration = async (
	claimId: string,
	expiresAt: Date,
): Promise<Claim> => {
	const [updated] = await drizzleClient
		.update(claim)
		.set({
			expiresAt,
			updatedAt: new Date(),
		})
		.where(eq(claim.id, claimId))
		.returning()

	if (!updated) {
		throw new Error('Failed to update transfer claim')
	}

	return updated
}

export const getTransferByToken = async (
	token: string,
): Promise<Claim | null> => {
	const [result] = await drizzleClient
		.select()
		.from(claim)
		.where(eq(claim.token, token))
		.limit(1)

	return result || null
}

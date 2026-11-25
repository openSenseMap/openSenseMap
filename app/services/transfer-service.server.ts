import { eq } from 'drizzle-orm'
import { getDevice } from '~/db/models/device.server'
import {
	createTransfer,
	getTransferByBoxId,
	isClaimExpired,
	removeTransfer,
	updateTransferExpiration,
} from '~/db/models/transfer.server'
import { claim, type Claim, device } from '~/db/schema'
import { drizzleClient } from '~/db.server'

export const createDeviceTransfer = async (
	userId: string,
	boxId: string,
	expiresAtStr?: string,
): Promise<Claim> => {
	const box = await getDevice({ id: boxId })

	if (!box) {
		throw new Error('Box not found')
	}

	if (box.user.id !== userId) {
		throw new Error("You don't have permission to transfer this box")
	}

	const existingTransfer = await getTransferByBoxId(boxId)
	if (existingTransfer) {
		throw new Error('Transfer already exists for this device')
	}

	let expirationDate: Date | undefined

	if (expiresAtStr) {
		expirationDate = new Date(expiresAtStr)

		if (isNaN(expirationDate.getTime())) {
			throw new Error('Invalid expiration date format')
		}

		if (expirationDate <= new Date()) {
			throw new Error('Expiration date must be in the future')
		}
	}

	const transferClaim = await createTransfer(boxId, expirationDate)

	return transferClaim
}

export const getDeviceTransfer = async (
	userId: string,
	boxId: string,
): Promise<Claim> => {
	const box = await getDevice({ id: boxId })

	if (!box) {
		throw new Error('Box not found')
	}

	if (box.user.id !== userId) {
		throw new Error("You don't have permission to view this transfer")
	}

	const transfer = await getTransferByBoxId(boxId)

	if (!transfer) {
		throw new Error('Transfer not found')
	}

	if (isClaimExpired(transfer.expiresAt)) {
		throw new Error('Transfer token has expired')
	}

	return transfer
}

export const removeDeviceTransfer = async (
	userId: string,
	boxId: string,
	token: string,
): Promise<void> => {
	const box = await getDevice({ id: boxId })
	if (!box) {
		throw new Error('Box not found')
	}

	if (box.user.id !== userId) {
		throw new Error("You don't have permission to remove this transfer")
	}

	await removeTransfer(boxId, token)
}

export const claimDevice = async (userId: string, token: string) => {
	const [activeClaim] = await drizzleClient
		.select()
		.from(claim)
		.where(eq(claim.token, token))
		.limit(1)

	if (!activeClaim) {
		throw new Error('Invalid or expired transfer token')
	}

	if (activeClaim.expiresAt && activeClaim.expiresAt <= new Date()) {
		throw new Error('Transfer token has expired')
	}

	const [box] = await drizzleClient
		.select()
		.from(device)
		.where(eq(device.id, activeClaim.boxId))
		.limit(1)

	if (!box) {
		throw new Error('Device not found')
	}

	if (box.userId === userId) {
		throw new Error('You already own this device')
	}

	await drizzleClient.transaction(async (tx) => {
		await tx
			.update(device)
			.set({ userId, updatedAt: new Date() })
			.where(eq(device.id, activeClaim.boxId))

		await tx.delete(claim).where(eq(claim.id, activeClaim.id))
	})

	return { message: 'Device successfully claimed!', boxId: activeClaim.boxId }
}

export const validateTransferParams = (
	boxId?: string,
	expiresAt?: string,
): { isValid: boolean; error?: string } => {
	if (!boxId || boxId.trim() === '') {
		return { isValid: false, error: 'Box ID is required' }
	}

	if (expiresAt) {
		const date = new Date(expiresAt)
		if (isNaN(date.getTime())) {
			return { isValid: false, error: 'Invalid date format' }
		}
		if (date <= new Date()) {
			return { isValid: false, error: 'Expiration date must be in the future' }
		}
	}

	return { isValid: true }
}

/**
 * Update transfer expiration date
 * Only the box owner can update their transfer expiration
 *
 * @param userId - ID of the requesting user
 * @param boxId - ID of the box
 * @param token - The transfer token (for verification)
 * @param newExpiresAtStr - New expiration date as ISO string
 * @returns The updated transfer claim
 */
export const updateDeviceTransferExpiration = async (
	userId: string,
	boxId: string,
	token: string,
	newExpiresAtStr: string,
): Promise<Claim> => {
	const box = await getDevice({ id: boxId })

	if (!box) {
		throw new Error('Box not found')
	}

	if (box.user.id !== userId) {
		throw new Error("You don't have permission to update this transfer")
	}

	const transfer = await getTransferByBoxId(boxId)

	if (!transfer) {
		throw new Error('Transfer not found')
	}

	if (transfer.token !== token) {
		throw new Error('Invalid transfer token')
	}

	if (isClaimExpired(transfer.expiresAt)) {
		throw new Error('Transfer token has expired')
	}

	const newExpiresAt = new Date(newExpiresAtStr)

	if (isNaN(newExpiresAt.getTime())) {
		throw new Error('Invalid expiration date format')
	}

	if (newExpiresAt <= new Date()) {
		throw new Error('Expiration date must be in the future')
	}

	const updated = await updateTransferExpiration(transfer.id, newExpiresAt)

	return updated
}

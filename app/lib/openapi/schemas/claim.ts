import * as z from 'zod/v4'
import { IsoDateTimeSchema } from './common'

export const DeviceTransferTokenSchema = z.string().min(1).meta({
	description: 'Transfer token.',
	example: 'transfer-token-example',
})

export const DeviceTransferClaimSchema = z
	.object({
		id: z.string().meta({
			description: 'Unique transfer claim id.',
			example: 'clm_01jv7c9x8n0example',
		}),

		boxId: z.string().meta({
			description: 'ID of the box marked for transfer.',
			example: '5bdbe70f55d0ad001a04edc9',
		}),

		token: DeviceTransferTokenSchema,

		expiresAt: IsoDateTimeSchema.nullable().optional().meta({
			description:
				'Expiration date of the transfer token. If omitted, the token does not have an explicit expiration date.',
			example: '2026-05-22T12:00:00.000Z',
		}),

		createdAt: IsoDateTimeSchema.meta({
			description: 'Transfer claim creation timestamp.',
			example: '2026-05-21T12:00:00.000Z',
		}),

		updatedAt: IsoDateTimeSchema.meta({
			description: 'Transfer claim update timestamp.',
			example: '2026-05-21T12:00:00.000Z',
		}),
	})
	.meta({
		id: 'DeviceTransferClaim',
		description: 'Transfer claim created for a box.',
	})

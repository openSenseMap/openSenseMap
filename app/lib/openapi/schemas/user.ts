import * as z from 'zod/v4'
import { IsoDateTimeSchema } from './common'

export const UserRoleSchema = z.enum(['admin', 'user']).meta({
	description: "User's role",
	example: 'user',
})

export const UserLanguageSchema = z.enum(['de_DE', 'en_US']).meta({
	description: "User's preferred language",
	example: 'en_US',
})

export const UserSchema = z
	.object({
		id: z.string().meta({
			description: 'Unique user identifier',
			example: 'user_123456',
		}),

		name: z.string().meta({
			description: "User's display name",
			example: 'John Doe',
		}),

		email: z.email().meta({
			description: "User's email address",
			example: 'user@example.com',
		}),

		unconfirmedEmail: z.email().nullable().optional().meta({
			description:
				'Pending email address that has not been confirmed yet, if one exists.',
			example: 'newemail@example.com',
		}),

		role: UserRoleSchema.nullable().optional(),

		language: UserLanguageSchema.nullable().optional(),

		emailIsConfirmed: z.boolean().nullable().optional().meta({
			description: "Whether the user's email address is confirmed",
			example: true,
		}),

		newsletterOptIn: z.boolean().meta({
			description:
				'Whether the user has confirmed the newsletter double opt-in and is actively subscribed.',
			example: false,
		}),

		createdAt: IsoDateTimeSchema.meta({
			description: 'Account creation timestamp',
			example: '2024-01-15T10:30:00.000Z',
		}),

		updatedAt: IsoDateTimeSchema.meta({
			description: 'Last account update timestamp',
			example: '2024-01-20T14:45:00.000Z',
		}),

		acceptedTosVersionId: z.string().nullable().optional().meta({
			description: 'ID of the Terms of Service version accepted by the user.',
			example: 'tos_2024_01',
		}),

		acceptedTosAt: IsoDateTimeSchema.nullable().optional().meta({
			description: 'Timestamp when the user accepted the Terms of Service.',
			example: '2024-01-15T10:30:00.000Z',
		}),
	})
	.meta({
		id: 'User',
		description: 'User profile information.',
	})

export const UserWithBoxesSchema = UserSchema.extend({
	boxes: z.array(z.string()).meta({
		description: 'A list of ids of the user’s devices',
		example: ['60a13611a877b3001b8ffd59', '5bdbe70f55d0ad001a04edc9'],
	}),
}).meta({
	id: 'UserWithBoxes',
	description: 'User profile information including device ids.',
})

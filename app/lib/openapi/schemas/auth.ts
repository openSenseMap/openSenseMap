import * as z from 'zod/v4'

import { apiMessages } from '~/lib/openapi/messages'

export const NewPasswordSchema = z
	.string({
		error: 'No new password specified.',
	})
	.min(1, {
		error: 'No new password specified.',
	})
	.min(8, {
		error: 'New password should have at least 8 characters',
	})
	.meta({
		description: 'Password. Must be at least 8 characters long.',
		example: 'correct-horse-battery-staple',
		format: 'password',
	})

export const PasswordConfirmationRequestSchema = z
	.object({
		password: z
			.string()
			.min(1, {
				error: apiMessages.passwordRequired,
			})
			.meta({
				description: 'Current user password required to confirm this action',
				example: 'myCurrentPassword123',
				format: 'password',
			}),
	})
	.meta({
		id: 'PasswordConfirmationRequest',
		description: 'Password confirmation payload.',
	})

export const JwtAccessTokenSchema = z.jwt({ alg: 'HS256' }).meta({
	id: 'JwtAccessToken',
	description: 'JWT access token',
	example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
})

export const RefreshTokenSchema = z.string().min(1).meta({
	id: 'RefreshToken',
	description: 'Refresh token bound to a JWT access token.',
	example: 'Wk9qVnlYNjdrMlBpcEVvWjZoZVVGUlQ4WURwRUc=',
})

export const AuthTokensSchema = z
	.object({
		token: JwtAccessTokenSchema,
		refreshToken: RefreshTokenSchema,
	})
	.meta({
		id: 'AuthTokens',
		description: 'Access token and refresh token pair.',
	})

export const BearerTokenSchema = z
	.string()
	.trim()
	.regex(/^Bearer\s+\S+$/, {
		error: apiMessages.refreshTokenInvalid,
	})
	.transform((header) => header.split(/\s+/)[1])

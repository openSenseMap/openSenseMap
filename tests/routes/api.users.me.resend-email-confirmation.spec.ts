import { generateTestUserCredentials } from 'tests/data/generate_test_user'
import { type Route } from '../../.react-router/types/app/routes/+types/api.users.me.resend-email-confirmation'
import { BASE_URL } from '../../vitest.setup'
import { deleteUserByEmail } from '~/db/models/user.server'
import { type User } from '~/db/schema'
import { createToken } from '~/lib/jwt'
import { action } from '~/routes/api.users.me.resend-email-confirmation'
import { registerUser } from '~/services/user-service.server'

const RESEND_EMAIL_USER = generateTestUserCredentials()

describe('openSenseMap API Routes: /users', () => {
	describe('/resend-email-confirmation', () => {
		describe('POST', () => {
			let jwt: string = ''

			beforeAll(async () => {
				const registration = await registerUser(
					RESEND_EMAIL_USER.name,
					RESEND_EMAIL_USER.email,
					RESEND_EMAIL_USER.password,
					'en_US',
					true,
				)
				expect(registration.ok).toBe(true)

				if (!registration.ok) {
					throw new Error(
						`Test setup failed: ${registration.field} -> ${registration.code}`,
					)
				}
				const user = registration.user
				const { token: t } = await createToken(user as User)
				jwt = t
			})

			it('should allow users to request a resend of the email confirmation', async () => {
				// Request resend email confirmation
				const resendRequest = new Request(
					`${BASE_URL}/users/me/resend-email-confirmation`,
					{
						method: 'POST',
						headers: {
							Authorization: `Bearer ${jwt}`,
							'Content-Type': 'application/x-www-form-urlencoded',
						},
						body: '', // No body required
					},
				)

				const resendResponse = (await action({
					request: resendRequest,
				} as Route.ActionArgs)) as Response

				expect(resendResponse.status).toBe(200)
				expect(resendResponse.headers.get('content-type')).toBe(
					'application/json; charset=utf-8',
				)
				const resendBody = await resendResponse.json()
				expect(resendBody).toMatchObject({
					code: 'Ok',
					message: `Email confirmation has been sent to ${RESEND_EMAIL_USER.email}`,
				})
			})

			afterAll(async () => {
				// delete the valid test user
				await deleteUserByEmail(RESEND_EMAIL_USER.email)
			})
		})
	})
})

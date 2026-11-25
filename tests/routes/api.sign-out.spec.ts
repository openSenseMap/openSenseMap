import { generateTestUserCredentials } from 'tests/data/generate_test_user'
import { type Route } from '../../.react-router/types/app/routes/+types/api.sign-out'
import { BASE_URL } from '../../vitest.setup'
import { deleteUserByEmail } from '~/db/models/user.server'
import { type User } from '~/db/schema'
import { createToken } from '~/lib/jwt'
import { action } from '~/routes/api.sign-out'
import { registerUser } from '~/services/user-service.server'

const VALID_SIGN_OUT_TEST_USER = generateTestUserCredentials()

describe('openSenseMap API Routes: /users', () => {
	describe('/sign-out', () => {
		let jwt: string = ''
		beforeAll(async () => {
			const registration = await registerUser(
				VALID_SIGN_OUT_TEST_USER.name,
				VALID_SIGN_OUT_TEST_USER.email,
				VALID_SIGN_OUT_TEST_USER.password,
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
			;({ token: jwt } = await createToken(user as User))
		})

		describe('/POST', () => {
			it('should allow to sign out with jwt', async () => {
				// Arrange
				const request = new Request(`${BASE_URL}/users/sign-out`, {
					method: 'POST',
					headers: {
						Authorization: `Bearer ${jwt}`,
						'Content-Type': 'application/x-www-form-urlencoded',
					},
					body: '', // No body needed, but must be present for POST
				})

				// Act
				const dataFunctionValue = await action({
					request,
				} as Route.ActionArgs)
				const response = dataFunctionValue as Response

				// Assert
				expect(dataFunctionValue).toBeInstanceOf(Response)
				expect(response.status).toBe(200)
				expect(response.headers.get('content-type')).toBe(
					'application/json; charset=utf-8',
				)
			})
		})

		afterAll(async () => {
			// delete the valid test user
			await deleteUserByEmail(VALID_SIGN_OUT_TEST_USER.email)
		})
	})
})

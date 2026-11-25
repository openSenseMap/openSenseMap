import { generateTestUserCredentials } from 'tests/data/generate_test_user'
import { type Route } from '../../.react-router/types/app/routes/+types/api.users.sign-in'
import { BASE_URL } from '../../vitest.setup'
import { deleteUserByEmail } from '~/db/models/user.server'
import { action } from '~/routes/api.users.sign-in'
import { registerUser } from '~/services/user-service.server'

const VALID_SIGN_IN_TEST_USER = generateTestUserCredentials()

export const createSignInRequest = (email: string, password: string) =>
	new Request(`${BASE_URL}/users/sign-in`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ email, password }),
	})

describe('openSenseMap API Routes: /users', () => {
	describe('/sign-in', () => {
		beforeAll(async () => {
			await registerUser(
				VALID_SIGN_IN_TEST_USER.name,
				VALID_SIGN_IN_TEST_USER.email,
				VALID_SIGN_IN_TEST_USER.password,
				'en_US',
				true,
			)
		})

		describe('/POST', () => {
			it('should deny to sign in with wrong password', async () => {
				// Arrange
				const request = createSignInRequest(
					VALID_SIGN_IN_TEST_USER.email,
					'wrong password',
				)

				// Act
				const dataFunctionValue = await action({
					request,
				} as Route.ActionArgs)
				const response = dataFunctionValue as Response

				// Assert
				expect(dataFunctionValue).toBeInstanceOf(Response)
				expect(response.status).toBe(403)
			})

			it('should allow to sign in a user with email and password', async () => {
				const request = createSignInRequest(
					VALID_SIGN_IN_TEST_USER.email,
					VALID_SIGN_IN_TEST_USER.password,
				)

				const dataFunctionValue = await action({
					request,
				} as Route.ActionArgs)

				const response = dataFunctionValue as Response
				const body = await response.json()

				expect(dataFunctionValue).toBeInstanceOf(Response)
				expect(response.status).toBe(200)
				expect(response.headers.get('content-type')).toBe(
					'application/json; charset=utf-8',
				)
				expect(body).toHaveProperty('token')
				expect(body).toHaveProperty('refreshToken')
			})

			it('should allow to sign in a user with name and password', async () => {
				// Arrange
				const request = createSignInRequest(
					VALID_SIGN_IN_TEST_USER.name,
					VALID_SIGN_IN_TEST_USER.password,
				)

				// Act
				const dataFunctionValue = await action({
					request,
				} as Route.ActionArgs)
				const response = dataFunctionValue as Response
				const body = await response?.json()

				// Assert
				expect(dataFunctionValue).toBeInstanceOf(Response)
				expect(response.status).toBe(200)
				expect(response.headers.get('content-type')).toBe(
					'application/json; charset=utf-8',
				)
				expect(body).toHaveProperty('token')
				expect(body).toHaveProperty('refreshToken')
			})

			it('should allow to sign in a user with email (different case) and password', async () => {
				// Arrange
				const request = createSignInRequest(
					VALID_SIGN_IN_TEST_USER.email.toUpperCase(),
					VALID_SIGN_IN_TEST_USER.password,
				)

				// Act
				const dataFunctionValue = await action({
					request,
				} as Route.ActionArgs)
				const response = dataFunctionValue as Response
				const body = await response?.json()

				// Assert
				expect(dataFunctionValue).toBeInstanceOf(Response)
				expect(response.status).toBe(200)
				expect(response.headers.get('content-type')).toBe(
					'application/json; charset=utf-8',
				)
				expect(body).toHaveProperty('token')
				expect(body).toHaveProperty('refreshToken')
			})

			it('should deny to sign in with name in different case', async () => {
				// Arrange
				const request = createSignInRequest(
					VALID_SIGN_IN_TEST_USER.name.toUpperCase(),
					VALID_SIGN_IN_TEST_USER.password,
				)

				// Act
				const dataFunctionValue = await action({
					request,
				} as Route.ActionArgs)
				const response = dataFunctionValue as Response

				// Assert
				expect(dataFunctionValue).toBeInstanceOf(Response)
				expect(response.status).toBe(403)
			})

			afterAll(async () => {
				// delete the valid test user
				await deleteUserByEmail(VALID_SIGN_IN_TEST_USER.email)
			})
		})
	})
})

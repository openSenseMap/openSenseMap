import { generateTestUserCredentials } from 'tests/data/generate_test_user'
import { type Route as SignOutRoute } from '../../.react-router/types/app/routes/+types/api.sign-out'
import { type Route as MeRoute } from '../../.react-router/types/app/routes/+types/api.users.me'
import { type Route } from '../../.react-router/types/app/routes/+types/api.users.refresh-auth'
import { type Route as SignInRoute } from '../../.react-router/types/app/routes/+types/api.users.sign-in'
import { BASE_URL } from '../../vitest.setup'
import { deleteUserByEmail } from '~/db/models/user.server'
import { type User } from '~/db/schema'
import { createToken } from '~/lib/jwt'
import { action as signOutAction } from '~/routes/api.sign-out'
import { action as meAction, loader as meLoader } from '~/routes/api.users.me'
import { action } from '~/routes/api.users.refresh-auth'
import { action as signInAction } from '~/routes/api.users.sign-in'
import { registerUser } from '~/services/user-service.server'
import { createSignInRequest } from './api.users.sign-in.spec'

const VALID_REFRESH_AUTH_TEST_USER = generateTestUserCredentials()
const CHANGED_PW_TO = 'some other very secure password'

describe('openSenseMap API Routes: /users', () => {
	describe('/refresh-auth', () => {
		let jwt: string = ''
		let newJwt: string = ''
		let refreshToken: string = ''
		beforeAll(async () => {
			const registration = await registerUser(
				VALID_REFRESH_AUTH_TEST_USER.name,
				VALID_REFRESH_AUTH_TEST_USER.email,
				VALID_REFRESH_AUTH_TEST_USER.password,
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
			;({ token: jwt, refreshToken } = await createToken(user as User))
		})

		describe('/POST', () => {
			it('should allow to refresh jwt using the refresh token', async () => {
				// Arrange
				const params = new URLSearchParams()
				params.append('token', refreshToken)
				const request = new Request(`${BASE_URL}/users/refresh-auth`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/x-www-form-urlencoded',
						Authorization: `Bearer ${jwt}`,
					},
					body: params.toString(),
				})

				// Act
				const dataFunctionValue = await action({
					request,
				} as Route.ActionArgs)
				const response = dataFunctionValue as Response
				const body = await response?.json()

				// Use the new JWT to get user info
				newJwt = body.token
				const meRequest = new Request(`${BASE_URL}/users/me`, {
					method: 'GET',
					headers: { Authorization: `Bearer ${newJwt}` },
				})
				const meResponse = (await meLoader({
					request: meRequest,
				} as Route.ActionArgs)) as Response
				const meBody = await meResponse?.json()

				// Assert
				expect(dataFunctionValue).toBeInstanceOf(Response)
				expect(response.status).toBe(200)
				expect(response.headers.get('content-type')).toBe(
					'application/json; charset=utf-8',
				)
				expect(body).toHaveProperty('token')
				expect(body).toHaveProperty('refreshToken')

				expect(meResponse).toBeInstanceOf(Response)
				expect(meResponse.status).toBe(200)
				expect(meResponse.headers.get('content-type')).toBe(
					'application/json; charset=utf-8',
				)
				expect(meBody).toMatchObject({
					code: 'Ok',
					data: { me: { email: VALID_REFRESH_AUTH_TEST_USER.email } },
				})
			})

			it('should allow to refresh jwt using JSON data', async () => {
				// Arrange - First sign in to get a fresh refresh token
				const signInRequest = createSignInRequest(
					VALID_REFRESH_AUTH_TEST_USER.email,
					VALID_REFRESH_AUTH_TEST_USER.password,
				)

				const signInResponse = (await signInAction({
					request: signInRequest,
				} as SignInRoute.ActionArgs)) as Response
				const signInBody = await signInResponse?.json()
				const freshJwt = signInBody.token
				const freshRefreshToken = signInBody.refreshToken

				// Now test JSON refresh
				const request = new Request(`${BASE_URL}/users/refresh-auth`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${freshJwt}`,
					},
					body: JSON.stringify({ token: freshRefreshToken }),
				})

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

			it('should deny to use a refresh token twice', async () => {
				// Arrange
				const params = new URLSearchParams()
				params.append('token', refreshToken)
				const request = new Request(`${BASE_URL}/users/refresh-auth`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/x-www-form-urlencoded',
						Authorization: `Bearer ${jwt}`,
					},
					body: params.toString(),
				})

				// Act
				const dataFunctionValue = await action({
					request,
				} as Route.ActionArgs)
				const response = dataFunctionValue as Response

				// Assert
				expect(dataFunctionValue).toBeInstanceOf(Response)
				expect(response.status).toBe(403)
			})

			it('should deny to request a fresh jwt using refresh token after changing the password', async () => {
				// Arrange
				const changePasswordRequest = new Request(`${BASE_URL}/users/me`, {
					method: 'PUT',
					headers: {
						'Content-Type': 'application/json; charset=utf-8',
						Authorization: `Bearer ${newJwt}`,
					},
					body: JSON.stringify({
						currentPassword: VALID_REFRESH_AUTH_TEST_USER.password,
						newPassword: CHANGED_PW_TO,
					}),
				})

				const params = new URLSearchParams()
				params.append('token', refreshToken)
				const request = new Request(`${BASE_URL}/users/refresh-auth`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/x-www-form-urlencoded',
						Authorization: `Bearer ${newJwt}`,
					},
					body: params.toString(),
				})

				// Act
				// Change password first
				const changePwFunctionValue = await meAction({
					request: changePasswordRequest,
				} as MeRoute.ActionArgs)
				const changePwResponse = changePwFunctionValue as Response
				const changePwJson = await changePwResponse.json()

				// Then try refreshing
				const dataFunctionValue = await action({
					request,
				} as Route.ActionArgs)
				const response = dataFunctionValue as Response

				// Assert
				expect(changePwFunctionValue).toBeInstanceOf(Response)
				expect(changePwResponse.status).toBe(200)
				expect(changePwJson).toHaveProperty(
					'message',
					'User successfully saved. Password changed. Please sign in with your new password',
				)
				expect(dataFunctionValue).toBeInstanceOf(Response)
				expect(response.status).toBe(403)
			})

			it('should deny to use the refreshToken after signing out', async () => {
				// Arrange
				const signInRequest = createSignInRequest(
					VALID_REFRESH_AUTH_TEST_USER.email,
					CHANGED_PW_TO,
				)

				const signOutParams = new URLSearchParams()
				const signOutRequest = new Request(`${BASE_URL}/users/sign-out`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/x-www-form-urlencoded',
					},
					body: signOutParams.toString(),
				})

				const params = new URLSearchParams()
				const request = new Request(`${BASE_URL}/users/refresh-auth`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/x-www-form-urlencoded',
					},
					body: params.toString(),
				})

				// Act
				// Make sure to be signed in
				const signInFunctionValue = await signInAction({
					request: signInRequest,
				} as SignInRoute.ActionArgs)
				const signInResponse = signInFunctionValue as Response
				const body = await signInResponse?.json()
				const localJwt = body.token
				const localRefreshToken = body.refreshToken

				signOutRequest.headers.append('Authorization', `Bearer ${localJwt}`)
				request.headers.append('Authorization', `Bearer ${localJwt}`)
				params.append('token', localRefreshToken)

				// Sign out
				const signOutFunctionValue = await signOutAction({
					request: signOutRequest,
				} as SignOutRoute.ActionArgs)
				const signOutResponse = signOutFunctionValue as Response

				// Then try refreshing
				const dataFunctionValue = await action({
					request,
				} as Route.ActionArgs)
				const response = dataFunctionValue as Response

				// Assert
				expect(signInFunctionValue).toBeInstanceOf(Response)
				expect(signInResponse.status).toBe(200)
				expect(signInResponse.headers.get('content-type')).toBe(
					'application/json; charset=utf-8',
				)
				expect(body).toHaveProperty('token')
				expect(body).toHaveProperty('refreshToken')

				expect(signOutFunctionValue).toBeInstanceOf(Response)
				expect(signOutResponse.status).toBe(200)
				expect(dataFunctionValue).toBeInstanceOf(Response)
				expect(response.status).toBe(403)
			})
		})

		afterAll(async () => {
			// delete the valid test user
			await deleteUserByEmail(VALID_REFRESH_AUTH_TEST_USER.email)
		})
	})
})

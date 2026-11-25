import { generateTestUserCredentials } from 'tests/data/generate_test_user'
import { type Route } from '../../.react-router/types/app/routes/+types/api.users.me'
import { BASE_URL } from '../../vitest.setup'
import { deleteUserByEmail } from '~/db/models/user.server'
import { type User } from '~/db/schema'
import { createToken } from '~/lib/jwt'
import { loader as meLoader, action as meAction } from '~/routes/api.users.me'
import { registerUser } from '~/services/user-service.server'

const ME_TEST_USER = generateTestUserCredentials()

const ME_UPDATE_EMAIL = 'test.updated@me.endpoint'
const ME_UPDATE_NAME = 'me2Test'

describe('openSenseMap API Routes: /users', () => {
	let jwt: string = ''

	beforeAll(async () => {
		const registration = await registerUser(
			ME_TEST_USER.name,
			ME_TEST_USER.email,
			ME_TEST_USER.password,
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

	describe('/me', () => {
		describe('GET', () => {
			it('should allow users to request their details', async () => {
				// Arrange
				const request = new Request(`${BASE_URL}/users/me`, {
					method: 'GET',
					headers: { Authorization: `Bearer ${jwt}` },
				})

				// Act
				const dataFunctionValue = await meLoader({
					request: request,
				} as Route.LoaderArgs)
				const response = dataFunctionValue as Response
				const body = await response?.json()

				// Assert
				expect(response.status).toBe(200)
				expect(response.headers.get('content-type')).toBe(
					'application/json; charset=utf-8',
				)
				expect(body).toMatchObject({
					code: 'Ok',
					data: { me: { email: ME_TEST_USER.email } },
				})
			})
		})

		describe('PUT', () => {
			it('should deny to change email and password at the same time', async () => {
				const request = new Request(`${BASE_URL}/users/me`, {
					method: 'PUT',
					headers: {
						Authorization: `Bearer ${jwt}`,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						email: 'new-email@email.www',
						newPassword: '87654321',
					}),
				})

				const response = (await meAction({
					request,
				} as Route.ActionArgs)) as Response
				const body = await response.json()

				expect(response.status).toBe(400)
				expect(body).toHaveProperty(
					'message',
					'You cannot change your email address and password in the same request.',
				)
			})

			it('should deny to change email without current passsword', async () => {
				const request = new Request(`${BASE_URL}/users/me`, {
					method: 'PUT',
					headers: {
						Authorization: `Bearer ${jwt}`,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({ email: 'new-email@email.www' }),
				})

				const response = (await meAction({
					request,
				} as Route.ActionArgs)) as Response
				const body = await response.json()

				expect(response.status).toBe(400)
				expect(body).toHaveProperty(
					'message',
					'To change your password or email address, please supply your current password.',
				)
			})

			it('should deny to change email with wrong current passsword', async () => {
				const request = new Request(`${BASE_URL}/users/me`, {
					method: 'PUT',
					headers: {
						Authorization: `Bearer ${jwt}`,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						email: 'new-email@email.www',
						currentPassword: 'wrongpassword',
					}),
				})

				const response = (await meAction({
					request,
				} as Route.ActionArgs)) as Response
				const body = await response.json()

				expect(response.status).toBe(400)
				expect(response.headers.get('content-type')).toBe(
					'application/json; charset=utf-8',
				)
				expect(body).toHaveProperty('message', 'Password incorrect')
			})

			it('should allow to change email with correct current passsword', async () => {
				// Change email
				const putRequest = new Request(`${BASE_URL}/users/me`, {
					method: 'PUT',
					headers: {
						Authorization: `Bearer ${jwt}`,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						email: ME_UPDATE_EMAIL,
						currentPassword: ME_TEST_USER.password,
					}),
				})
				const putResponse = (await meAction({
					request: putRequest,
				} as Route.ActionArgs)) as Response
				const putBody = await putResponse.json()

				expect(putResponse.status).toBe(200)
				expect(putBody).toHaveProperty(
					'message',
					'User successfully saved. E-Mail changed. Please confirm your new address. Until confirmation, sign in using your old address',
				)

				// Fetch updated user
				const getRequest = new Request(`${BASE_URL}/users/me`, {
					method: 'GET',
					headers: { Authorization: `Bearer ${jwt}` },
				})
				const getResponse = (await meLoader({
					request: getRequest,
				} as Route.LoaderArgs)) as Response
				const getBody = await getResponse.json()

				expect(getResponse.status).toBe(200)
				expect(getBody.data.me.email).toBe(ME_TEST_USER.email)
			})

			it('should allow to change name', async () => {
				// Change name
				const putRequest = new Request(`${BASE_URL}/users/me`, {
					method: 'PUT',
					headers: {
						Authorization: `Bearer ${jwt}`,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({ name: ME_UPDATE_NAME }),
				})
				const putResponse = (await meAction({
					request: putRequest,
				} as Route.ActionArgs)) as Response
				const putBody = await putResponse.json()

				expect(putResponse.status).toBe(200)
				expect(putBody).toHaveProperty(
					'message',
					'User successfully saved. Name changed.',
				)

				// Fetch updated user
				const getRequest = new Request(`${BASE_URL}/users/me`, {
					method: 'GET',
					headers: { Authorization: `Bearer ${jwt}` },
				})
				const getResponse = (await meLoader({
					request: getRequest,
				} as Route.LoaderArgs)) as Response
				const getBody = await getResponse.json()

				expect(getResponse.status).toBe(200)
				expect(getBody.data.me.name).toBe(ME_UPDATE_NAME)
			})

			it('should return that no changed properties are applied and user remains unchanged', async () => {
				const request = new Request(`${BASE_URL}/users/me`, {
					method: 'PUT',
					headers: {
						Authorization: `Bearer ${jwt}`,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({ name: ME_UPDATE_NAME }),
				})

				const response = (await meAction({
					request,
				} as Route.ActionArgs)) as Response
				const body = await response.json()

				expect(response.status).toBe(200)
				expect(body).toHaveProperty(
					'message',
					'No changed properties supplied. User remains unchanged.',
				)
			})

			it('should deny to change name to existing name', async () => {
				const request = new Request(`${BASE_URL}/users/me`, {
					method: 'PUT',
					headers: {
						Authorization: `Bearer ${jwt}`,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						name: ME_UPDATE_NAME,
						currentPassword: ME_TEST_USER.password,
					}),
				})

				const response = (await meAction({
					request,
				} as Route.ActionArgs)) as Response
				const body = await response.json()

				expect(response.status).toBe(200)
				expect(body).toHaveProperty(
					'message',
					'No changed properties supplied. User remains unchanged.',
				)
			})

			it('should deny to change password with too short new password', async () => {
				const request = new Request(`${BASE_URL}/users/me`, {
					method: 'PUT',
					headers: {
						Authorization: `Bearer ${jwt}`,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						newPassword: 'short',
						currentPassword: ME_TEST_USER.password,
					}),
				})

				const response = (await meAction({
					request,
				} as Route.ActionArgs)) as Response
				const body = await response.json()

				expect(response.status).toBe(400)
				expect(body).toHaveProperty(
					'message',
					'New password should have at least 8 characters',
				)
			})

			it('should deny to change email to invalid email', async () => {
				const request = new Request(`${BASE_URL}/users/me`, {
					method: 'PUT',
					headers: {
						Authorization: `Bearer ${jwt}`,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						email: 'invalid email',
						currentPassword: ME_TEST_USER.password,
					}),
				})

				const response = (await meAction({
					request,
				} as Route.ActionArgs)) as Response

				expect(response.status).toBe(400)
			})

			it('should deny to change name to invalid name', async () => {
				const request = new Request(`${BASE_URL}/users/me`, {
					method: 'PUT',
					headers: {
						Authorization: `Bearer ${jwt}`,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						name: ' invalid name',
						currentPassword: ME_TEST_USER.password,
					}),
				})

				const response = (await meAction({
					request,
				} as Route.ActionArgs)) as Response

				expect(response.status).toBe(400)
			})
		})

		describe('DELETE', () => {
			it('should deny to delete user without jwt', async () => {
				// Arrange
				const deleteRequest = new Request(`${BASE_URL}/users/me`, {
					method: 'DELETE',
				})

				// Act
				const deleteResponse = (await meAction({
					request: deleteRequest,
				} as Route.ActionArgs)) as Response

				// Assert
				expect(deleteResponse.status).toBe(403)
			})

			it('should deny to delete user without password parameter', async () => {
				// Attempt to delete user without password parameter
				const deleteRequest = new Request(`${BASE_URL}/users/me`, {
					method: 'DELETE',
					headers: { Authorization: `Bearer ${jwt}` },
					// No body
				})
				const deleteResponse = (await meAction({
					request: deleteRequest,
				} as Route.ActionArgs)) as Response

				// Assert: Should return 400 Bad Request
				expect(deleteResponse.status).toBe(400)
			})

			it('should deny to delete user with empty password parameter', async () => {
				// Prepare the body with an empty password
				const deleteParams = new URLSearchParams()
				deleteParams.append('password', '')

				// Attempt to delete user with empty password
				const deleteRequest = new Request(`${BASE_URL}/users/me`, {
					method: 'DELETE',
					headers: {
						'Content-Type': 'application/x-www-form-urlencoded',
						Authorization: `Bearer ${jwt}`,
					},
					body: deleteParams.toString(),
				})

				const deleteResponse = (await meAction({
					request: deleteRequest,
				} as Route.ActionArgs)) as Response

				expect(deleteResponse.status).toBe(400)
			})

			it('should deny to delete user with wrong password parameter', async () => {
				// Prepare the body with an incorrect password
				const deleteParams = new URLSearchParams()
				deleteParams.append('password', `${ME_TEST_USER.password}hallo`)

				// Attempt to delete user with wrong password
				const deleteRequest = new Request(`${BASE_URL}/users/me`, {
					method: 'DELETE',
					headers: {
						'Content-Type': 'application/x-www-form-urlencoded',
						Authorization: `Bearer ${jwt}`,
					},
					body: deleteParams.toString(),
				})

				const deleteResponse = (await meAction({
					request: deleteRequest,
				} as Route.ActionArgs)) as Response
				const deleteBody = await deleteResponse.json()

				// Assertions
				expect(deleteResponse.status).toBe(401)
				expect(deleteResponse.headers.get('content-type')).toBe(
					'application/json; charset=utf-8',
				)
				expect(deleteBody).toHaveProperty('message', 'Password incorrect')
			})

			it('should allow to delete user with correct password parameter', async () => {
				// Prepare the body with the correct password
				const deleteParams = new URLSearchParams()
				deleteParams.append('password', ME_TEST_USER.password)

				// Attempt to delete user with correct password
				const deleteRequest = new Request(`${BASE_URL}/users/me`, {
					method: 'DELETE',
					headers: {
						'Content-Type': 'application/x-www-form-urlencoded',
						Authorization: `Bearer ${jwt}`,
					},
					body: deleteParams.toString(),
				})

				const deleteResponse = (await meAction({
					request: deleteRequest,
				} as Route.ActionArgs)) as Response
				expect(deleteResponse.status).toBe(200)
			})
		})

		afterAll(async () => {
			// delete the valid test user
			await deleteUserByEmail(ME_TEST_USER.email)
			await deleteUserByEmail(ME_UPDATE_EMAIL)
		})
	})
})

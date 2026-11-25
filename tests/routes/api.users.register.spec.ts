import { randomUUID } from 'crypto'
import { generateTestUserCredentials } from 'tests/data/generate_test_user'
import { type Route } from '../../.react-router/types/app/routes/+types/api.users.register'
import { BASE_URL } from '../../vitest.setup'
import { deleteUserByEmail } from '~/db/models/user.server'
import { action as registerAction } from '~/routes/api.users.register'

const VALID_USER = generateTestUserCredentials()
const VALID_SECOND_USER = generateTestUserCredentials()

describe('openSenseMap API Routes: /users/register', () => {
	describe('/POST', () => {
		it('should allow to register a user via POST', async () => {
			// Arrange
			const params = new URLSearchParams()
			for (const [key, value] of Object.entries(VALID_USER))
				params.append(key, value)
			params.append('tosAccepted', 'true')
			const request = new Request(`${BASE_URL}/users/register`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
				body: params.toString(),
			})

			// Act
			const dataFunctionValue = await registerAction({
				request: request,
			} as Route.ActionArgs)
			const response = dataFunctionValue as Response
			const body = await response?.json()

			// Assert
			expect(dataFunctionValue).toBeInstanceOf(Response)
			expect(body).toHaveProperty('message', 'Successfully registered new user')
			expect(response.status).toBe(201)
			expect(response.headers.get('content-type')).toBe(
				'application/json; charset=utf-8',
			)
			expect(body).toHaveProperty('token')
			expect(body).toHaveProperty('refreshToken')
		})

		it('should deny registering a user with the same email', async () => {
			// Arrange
			const params = new URLSearchParams({
				...VALID_USER,
				name: randomUUID().toString(), // fresh username, same email
			})
			params.append('tosAccepted', 'true')
			const request = new Request(`${BASE_URL}/users/register`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
				body: params.toString(),
			})

			// Act
			const response = (await registerAction({
				request,
			} as Route.ActionArgs)) as Response
			const body = await response.json()

			// Assert
			expect(response.status).toBe(400)
			expect(response.headers.get('content-type')).toBe(
				'application/json; charset=utf-8',
			)
			expect(body).toHaveProperty('message', 'User already exists.')
		})

		it('should deny registering a user with too short password', async () => {
			const params = new URLSearchParams({
				name: 'tester123',
				password: 'short',
				email: 'addresstesting@email.com',
			})
			const request = new Request(`${BASE_URL}/users/register`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
				body: params.toString(),
			})

			const response = (await registerAction({
				request,
			} as Route.ActionArgs)) as Response
			const body = await response.json()

			expect(response.status).toBe(400)
			expect(response.headers.get('content-type')).toBe(
				'application/json; charset=utf-8',
			)
			expect(body).toHaveProperty(
				'message',
				'Password must be at least 8 characters long.',
			)
		})

		it('should deny registering a user with no name', async () => {
			const params = new URLSearchParams({
				name: '',
				password: 'longenough',
				email: 'address@email.com',
			})
			const request = new Request(`${BASE_URL}/users/register`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
				body: params.toString(),
			})

			const response = (await registerAction({
				request,
			} as Route.ActionArgs)) as Response
			const body = await response.json()

			expect(response.status).toBe(400)
			expect(response.headers.get('content-type')).toBe(
				'application/json; charset=utf-8',
			)
			expect(body).toHaveProperty('message', 'Username is required.')
		})

		it('should deny registering a user with missing name parameter', async () => {
			const params = new URLSearchParams({
				password: 'longenough',
				email: 'address@email.com',
			})
			const request = new Request(`${BASE_URL}/users/register`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
				body: params.toString(),
			})

			const response = (await registerAction({
				request,
			} as Route.ActionArgs)) as Response
			const body = await response.json()

			expect(response.status).toBe(400)
			expect(response.headers.get('content-type')).toBe(
				'application/json; charset=utf-8',
			)
			expect(body).toHaveProperty('message', 'Username is required.')
		})

		it('should deny registering a user with invalid email address', async () => {
			const params = new URLSearchParams({
				name: 'testmann',
				password: 'longenough',
				email: 'invalid',
			})
			const request = new Request(`${BASE_URL}/users/register`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
				body: params.toString(),
			})

			const response = (await registerAction({
				request,
			} as Route.ActionArgs)) as Response
			const body = await response.json()

			expect(response.status).toBe(400)
			expect(response.headers.get('content-type')).toBe(
				'application/json; charset=utf-8',
			)
			expect(body).toHaveProperty('message', 'Invalid email format.')
		})

		it('should deny registering a too short username', async () => {
			const params = new URLSearchParams({
				name: 't',
				password: 'longenough',
				email: 'address@email.com',
			})
			const request = new Request(`${BASE_URL}/users/register`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
				body: params.toString(),
			})

			const response = (await registerAction({
				request,
			} as Route.ActionArgs)) as Response
			const body = await response.json()

			expect(response.status).toBe(400)
			expect(response.headers.get('content-type')).toBe(
				'application/json; charset=utf-8',
			)
			expect(body).toHaveProperty(
				'message',
				'Username must be at least 3 characters long and not more than 40.',
			)
		})

		it('should deny registering a user with username not starting with a letter or number', async () => {
			const params = new URLSearchParams({
				name: '-username',
				password: 'longenough',
				email: 'address@email.com',
			})
			const request = new Request(`${BASE_URL}/users/register`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
				body: params.toString(),
			})

			const response = (await registerAction({
				request,
			} as Route.ActionArgs)) as Response
			const body = await response.json()

			expect(response.status).toBe(400)
			expect(response.headers.get('content-type')).toBe(
				'application/json; charset=utf-8',
			)
			expect(body).toHaveProperty(
				'message',
				'Username may only contain alphanumeric characters or single hyphens, and cannot begin or end with a hyphen.',
			)
		})

		it('should deny registering a user with username with invalid characters', async () => {
			const params = new URLSearchParams({
				name: 'user () name',
				password: 'longenough',
				email: 'address@email.com',
			})
			const request = new Request(`${BASE_URL}/users/register`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
				body: params.toString(),
			})

			const response = (await registerAction({
				request,
			} as Route.ActionArgs)) as Response
			const body = await response.json()

			expect(response.status).toBe(400)
			expect(response.headers.get('content-type')).toBe(
				'application/json; charset=utf-8',
			)
			expect(body).toHaveProperty(
				'message',
				'Username may only contain alphanumeric characters or single hyphens, and cannot begin or end with a hyphen.',
			)
		})

		it('should deny registering a too long username', async () => {
			const params = new URLSearchParams({
				name: 'Really Long User Name which is definetely too long to be accepted',
				password: 'longenough',
				email: 'address@email.com',
			})
			const request = new Request(`${BASE_URL}/users/register`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
				body: params.toString(),
			})

			const response = (await registerAction({
				request,
			} as Route.ActionArgs)) as Response
			const body = await response.json()

			expect(response.status).toBe(400)
			expect(response.headers.get('content-type')).toBe(
				'application/json; charset=utf-8',
			)
			expect(body).toHaveProperty(
				'message',
				'Username must be at least 3 characters long and not more than 40.',
			)
		})

		it('should allow registering a second user via POST', async () => {
			// Arrange
			const params = new URLSearchParams()
			for (const [key, value] of Object.entries(VALID_SECOND_USER))
				params.append(key, value)
			params.append('tosAccepted', 'true')
			const request = new Request(`${BASE_URL}/users/register`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
				body: params.toString(),
			})

			// Act
			const dataFunctionValue = await registerAction({
				request: request,
			} as Route.ActionArgs)
			const response = dataFunctionValue as Response
			const body = await response?.json()

			// Assert
			expect(dataFunctionValue).toBeInstanceOf(Response)
			expect(body).toHaveProperty('message', 'Successfully registered new user')
			expect(response.status).toBe(201)
			expect(response.headers.get('content-type')).toBe(
				'application/json; charset=utf-8',
			)
			expect(body).toHaveProperty('token')
			expect(body).toHaveProperty('refreshToken')
		})
	})

	afterAll(async () => {
		// delete the valid test user
		await deleteUserByEmail(VALID_USER.email)
		await deleteUserByEmail(VALID_SECOND_USER.email)
	})
})

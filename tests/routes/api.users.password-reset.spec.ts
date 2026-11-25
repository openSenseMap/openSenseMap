import { type Route } from '../../.react-router/types/app/routes/+types/api.users.password-reset'
import { BASE_URL } from '../../vitest.setup'
import { action } from '~/routes/api.users.password-reset'

describe('openSenseMap API Routes: /users', () => {
	describe('/password-reset', () => {
		describe('POST', () => {
			it('should deny password request with wrong token', async () => {
				const params = new URLSearchParams({
					password: 'ignored_anyway',
					token: 'invalid_password-reset_token',
					email: 'tester@test.test',
				})
				const request = new Request(`${BASE_URL}/users/password-reset`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
					body: params.toString(),
				})
				const response = (await action({
					request,
				} as Route.ActionArgs)) as Response
				const body = await response.json()
				expect(response.status).toBe(403)
				expect(response.headers.get('content-type')).toBe(
					'application/json; charset=utf-8',
				)
				expect(body).toMatchObject({
					code: 'Forbidden',
					message: 'Password reset for this user not possible',
				})
			})
			it('should deny password change with empty token parameter', async () => {
				const params = new URLSearchParams({
					password: 'ignored_anyway',
					token: '   ',
					email: 'tester@test.test',
				})
				const request = new Request(`${BASE_URL}/users/password-reset`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
					body: params.toString(),
				})
				const response = (await action({
					request,
				} as Route.ActionArgs)) as Response
				expect(response.status).toBe(400)
			})
		})
	})
})

import { type Params } from 'react-router'
import { generateTestUserCredentials } from 'tests/data/generate_test_user'
import { type Route } from '../../.react-router/types/app/routes/+types/api.users.me.boxes.$deviceId'
import { BASE_URL } from '../../vitest.setup'
import { createDevice } from '~/db/models/device.server'
import { deleteUserByEmail } from '~/db/models/user.server'
import { type User } from '~/db/schema'
import { createToken } from '~/lib/jwt'
import { loader } from '~/routes/api.users.me.boxes.$deviceId'
import { registerUser } from '~/services/user-service.server'

const BOX_TEST_USER = generateTestUserCredentials()
const BOX_TEST_USER_BOX = {
	name: `${BOX_TEST_USER.name}s Box`,
	exposure: 'outdoor',
	expiresAt: null,
	tags: [],
	latitude: 0,
	longitude: 0,
	model: 'luftdaten.info',
	sensorTemplates: ['sds011_pm10'],
	mqttEnabled: false,
	ttnEnabled: false,
}

const OTHER_TEST_USER = generateTestUserCredentials()

describe('openSenseMap API Routes: /users', () => {
	describe('/me/boxes/:deviceId', () => {
		describe('GET', () => {
			let jwt: string = ''
			let otherJwt: string = ''
			let deviceId: string = ''

			beforeAll(async () => {
				const registration = await registerUser(
					BOX_TEST_USER.name,
					BOX_TEST_USER.email,
					BOX_TEST_USER.password,
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
				const { token: t } = await createToken(user)
				jwt = t

				const otherRegistration = await registerUser(
					OTHER_TEST_USER.name,
					OTHER_TEST_USER.email,
					OTHER_TEST_USER.password,
					'en_US',
					true,
				)
				expect(otherRegistration.ok).toBe(true)

				if (!otherRegistration.ok) {
					throw new Error(
						`Test setup failed: ${otherRegistration.field} -> ${otherRegistration.code}`,
					)
				}
				const otherUser = otherRegistration.user
				const { token: t2 } = await createToken(otherUser)
				otherJwt = t2

				const device = await createDevice(BOX_TEST_USER_BOX, (user as User).id)
				deviceId = device.id
			})

			it('should let users retrieve one of their boxes with all fields', async () => {
				// Act: Get single box
				const singleBoxRequest = new Request(
					`${BASE_URL}/users/me/boxes/${deviceId}`,
					{ method: 'GET', headers: { Authorization: `Bearer ${jwt}` } },
				)
				const params: Params<string> = { deviceId: deviceId }
				const singleBoxResponse = (await loader({
					request: singleBoxRequest,
					params,
				} as Route.LoaderArgs)) as Response
				await singleBoxResponse.json()
				// Assert: Response for single box
				expect(singleBoxResponse.status).toBe(200)
			})

			it('should deny to retrieve a box of other user', async () => {
				// Arrange
				const forbiddenRequest = new Request(
					`${BASE_URL}/users/me/boxes/${deviceId}`,
					{
						headers: { Authorization: `Bearer ${otherJwt}` },
					},
				)
				const params: Params<string> = { deviceId: deviceId }

				// Act: Try to get the original users box with the other user's JWT
				const forbiddenResponse = (await loader({
					request: forbiddenRequest,
					params,
				} as Route.LoaderArgs)) as Response
				const forbiddenBody = await forbiddenResponse.json()
				// Assert: Forbidden response
				expect(forbiddenResponse.status).toBe(403)
				expect(forbiddenBody.code).toBe('Forbidden')
				expect(forbiddenBody.message).toBe('User does not own this device')
			})

			afterAll(async () => {
				// delete the valid test user
				await deleteUserByEmail(BOX_TEST_USER.email)
				await deleteUserByEmail(OTHER_TEST_USER.email)
			})
		})
	})
})

import { generateTestUserCredentials } from 'tests/data/generate_test_user'
import { type Route } from '../../.react-router/types/app/routes/+types/api.users.me.boxes'
import { BASE_URL } from '../../vitest.setup'
import { createDevice, deleteDevice } from '~/db/models/device.server'
import { deleteUserByEmail } from '~/db/models/user.server'
import { integration, type User } from '~/db/schema'
import { drizzleClient } from '~/db.server'
import { createToken } from '~/lib/jwt'
import { loader } from '~/routes/api.users.me.boxes'
import { registerUser } from '~/services/user-service.server'

const BOXES_TEST_USER = generateTestUserCredentials()
const TEST_BOX = {
	name: `'${BOXES_TEST_USER.name}'s Box`,
	exposure: 'outdoor',
	expiresAt: null,
	tags: [],
	latitude: 0,
	longitude: 0,
	model: 'luftdaten.info',
	sensorTemplates: ['sds011_pm10'],
}

describe('openSenseMap API Routes: /users', () => {
	let jwt: string = ''
	let deviceId = ''

	describe('/me/boxes', () => {
		describe('GET', async () => {
			beforeAll(async () => {
				// seed integrations if they dont exist
				await drizzleClient
					.insert(integration)
					.values([
						{
							name: 'MQTT',
							slug: 'mqtt',
							serviceUrl: 'http://mqtt-test-service',
							serviceKey: 'MQTT_SERVICE_KEY',
							icon: 'message-square-text',
							order: 1,
						},
						{
							name: 'The Things Network',
							slug: 'ttn',
							serviceUrl: 'http://ttn-test-service',
							serviceKey: 'TTN_SERVICE_KEY',
							icon: 'antenna',
							order: 2,
						},
					])
					.onConflictDoNothing()
				const registration = await registerUser(
					BOXES_TEST_USER.name,
					BOXES_TEST_USER.email,
					BOXES_TEST_USER.password,
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
				const { token } = await createToken(user)
				jwt = token
				const device = await createDevice(TEST_BOX, (user as User).id)
				deviceId = device.id
			})
			it('should let users retrieve their boxes and sharedBoxes with all fields', async () => {
				// Arrange
				const request = new Request(`${BASE_URL}/users/me/boxes`, {
					method: 'GET',
					headers: { Authorization: `Bearer ${jwt}` },
				})

				// Act
				const response = (await loader({
					request,
				} as Route.LoaderArgs)) as Response
				const body = await response?.json()

				expect(response.status).toBe(200)
				expect(response.headers.get('content-type')).toBe(
					'application/json; charset=utf-8',
				)

				expect(body).toHaveProperty('code', 'Ok')
				expect(body).toHaveProperty('data')
				expect(body.data).toHaveProperty('boxes')
				expect(body.data).toHaveProperty('boxes_count')
				expect(body.data).toHaveProperty('sharedBoxes')

				expect(Array.isArray(body.data.boxes)).toBe(true)
				expect(body.data.boxes_count).toBe(body.data.boxes.length)
				expect(Array.isArray(body.data.sharedBoxes)).toBe(true)

				if (body.data.boxes.length > 0) {
					const box = body.data.boxes[0]

					expect(box).toHaveProperty('_id')
					expect(box).toHaveProperty('name')
					expect(box).toHaveProperty('exposure')
					expect(box).toHaveProperty('model')
					expect(box).toHaveProperty('grouptag')
					expect(box).toHaveProperty('createdAt')
					expect(box).toHaveProperty('updatedAt')
					expect(box).toHaveProperty('useAuth')
					expect(box).toHaveProperty('access_token') // kept for backwards compatibility, now called apiKey

					expect(box).toHaveProperty('currentLocation')
					expect(box.currentLocation).toHaveProperty('type', 'Point')
					expect(box.currentLocation).toHaveProperty('coordinates')
					expect(box.currentLocation).toHaveProperty('timestamp')
					expect(Array.isArray(box.currentLocation.coordinates)).toBe(true)
					expect(box.currentLocation.coordinates).toHaveLength(2)

					expect(box).toHaveProperty('lastMeasurementAt')
					expect(box).toHaveProperty('loc')
					expect(Array.isArray(box.loc)).toBe(true)
					expect(box.loc[0]).toHaveProperty('geometry')
					expect(box.loc[0]).toHaveProperty('type', 'Feature')

					expect(box).toHaveProperty('integrations')
					expect(box.integrations).toHaveProperty('mqtt')
					expect(box.integrations.mqtt).toHaveProperty('enabled', false)

					expect(box).toHaveProperty('sensors')
					expect(Array.isArray(box.sensors)).toBe(true)
				}
			})

			it('should return empty boxes array for user with no devices', async () => {
				const registration = await registerUser(
					'NoDevicesUser',
					'nodevices@test.com',
					'password123',
					'en_US',
					true,
				)

				expect(registration.ok).toBe(true)
				if (!registration.ok) {
					throw new Error(
						`Test setup failed: ${registration.field} -> ${registration.code}`,
					)
				}

				const userWithNoDevices = registration.user

				const { token: noDevicesJwt } = await createToken(
					userWithNoDevices as User,
				)

				const request = new Request(`${BASE_URL}/users/me/boxes`, {
					method: 'GET',
					headers: { Authorization: `Bearer ${noDevicesJwt}` },
				})

				const response = (await loader({
					request,
				} as Route.LoaderArgs)) as Response
				const body = await response?.json()

				expect(response.status).toBe(200)
				expect(body.data.boxes).toHaveLength(0)
				expect(body.data.boxes_count).toBe(0)
				expect(body.data.sharedBoxes).toHaveLength(0)

				await deleteUserByEmail('nodevices@test.com')
			})

			it('should handle invalid JWT token', async () => {
				const request = new Request(`${BASE_URL}/users/me/boxes`, {
					method: 'GET',
					headers: { Authorization: `Bearer invalid-token` },
				})

				const response = (await loader({
					request,
				} as Route.LoaderArgs)) as Response
				const body = await response?.json()

				expect(response.status).toBe(403)
				expect(body.code).toBe('Forbidden')
				expect(body.message).toContain('Invalid JWT authorization')
			})

			it('should handle missing authorization header', async () => {
				const request = new Request(`${BASE_URL}/users/me/boxes`, {
					method: 'GET',
				})

				const response = (await loader({
					request,
				} as Route.LoaderArgs)) as Response
				const body = await response?.json()

				expect(response.status).toBe(403)
				expect(body.code).toBe('Forbidden')
			})

			afterAll(async () => {
				await deleteUserByEmail(BOXES_TEST_USER.email)
				await deleteDevice({ id: deviceId })
			})
		})
	})
})

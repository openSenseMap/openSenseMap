import { generateTestUserCredentials } from 'tests/data/generate_test_user'
import { type Route } from '../../.react-router/types/app/routes/+types/api.tags'
import { BASE_URL } from '../../vitest.setup'
import { createDevice, deleteDevice } from '~/db/models/device.server'
import { deleteUserByEmail } from '~/db/models/user.server'
import { loader } from '~/routes/api.tags'
import { registerUser } from '~/services/user-service.server'

const TAGS_TEST_USER = generateTestUserCredentials()
const TEST_TAGS = [
	`tag-${TAGS_TEST_USER.name}-1`,
	`tag-${TAGS_TEST_USER.name}-2`,
	`tag-${TAGS_TEST_USER.name}-3`,
]
const TEST_TAG_BOX = {
	name: `'${TAGS_TEST_USER.name}'s Box`,
	exposure: 'outdoor',
	expiresAt: null,
	tags: TEST_TAGS,
	latitude: 0,
	longitude: 0,
	model: 'luftdaten.info',
	sensorTemplates: ['sds011_pm10'],
	mqttEnabled: false,
	ttnEnabled: false,
}

describe('openSenseMap API Routes: /tags', () => {
	let userId: string = ''
	let deviceId: string = ''

	beforeAll(async () => {
		const registration = await registerUser(
			TAGS_TEST_USER.name,
			TAGS_TEST_USER.email,
			TAGS_TEST_USER.password,
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
		userId = user.id
	})

	it('should not return tags from a device that has not been created', async () => {
		// Arrange
		const request = new Request(`${BASE_URL}/tags`, {
			method: 'GET',
			headers: { Accept: 'application/json' },
		})

		// Act
		const dataFunctionValue = await loader({
			request: request,
		} as Route.LoaderArgs)
		const response = dataFunctionValue as Response
		const body = await response.json()

		// Assert
		expect(response.status).toBe(200)
		expect(response.headers.get('content-type')).toBe(
			'application/json; charset=utf-8',
		)
		expect(Array.isArray(body.data)).toBe(true)
		expect(body.data).not.toEqual(expect.arrayContaining(TEST_TAGS))
	})

	it('should return distinct grouptags of boxes', async () => {
		// Arrange
		const request = new Request(`${BASE_URL}/tags`, {
			method: 'GET',
			headers: { Accept: 'application/json' },
		})
		const device = await createDevice(TEST_TAG_BOX, userId)
		deviceId = device.id

		// Act
		const dataFunctionValue = await loader({
			request: request,
		} as Route.LoaderArgs)
		const response = dataFunctionValue as Response
		const body = await response.json()

		// Assert
		expect(response.status).toBe(200)
		expect(response.headers.get('content-type')).toBe(
			'application/json; charset=utf-8',
		)
		expect(Array.isArray(body.data)).toBe(true)
		expect(body.data).toEqual(expect.arrayContaining(TEST_TAGS))
	})

	afterAll(async () => {
		// delete the valid test user
		await deleteUserByEmail(TAGS_TEST_USER.email)
		await deleteDevice({ id: deviceId })
	})
})

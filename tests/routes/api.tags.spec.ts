import { generateTestUserCredentials } from 'tests/data/generate_test_user'
import { type Route } from '../../.react-router/types/app/routes/+types/api.tags'
import { BASE_URL } from '../../vitest.setup'
import { createDevice, deleteDevice } from '~/db/models/device.server'
import { deleteUserByEmail } from '~/db/models/user.server'
import { loader } from '~/routes/api.tags'
import { registerUser } from '~/services/user-service.server'

const TAGS_TEST_USER = generateTestUserCredentials()
const TEST_TAG_BOX = {
	name: `'${TAGS_TEST_USER.name}'s Box`,
	exposure: 'outdoor',
	expiresAt: null,
	tags: ['tag1', 'tag2', 'testgrouptag'],
	latitude: 0,
	longitude: 0,
	model: 'luftdaten.info',
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

	it('should return empty array of tags when none are there', async () => {
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
		expect(body.data).toHaveLength(0)
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
		expect(
			body.data.filter((t: string) => TEST_TAG_BOX.tags.includes(t)),
		).toHaveLength(3)
	})

	afterAll(async () => {
		// delete the valid test user
		await deleteUserByEmail(TAGS_TEST_USER.email)
		await deleteDevice({ id: deviceId })
	})
})

import { type Params } from 'react-router'
import { generateTestUserCredentials } from 'tests/data/generate_test_user'
import { type Route } from '../../.react-router/types/app/routes/+types/api.boxes.$deviceId.script'
import { BASE_URL } from '../../vitest.setup'
import { createDevice, deleteDevice } from '~/db/models/device.server'
import { deleteUserByEmail } from '~/db/models/user.server'
import { type User } from '~/db/schema'
import { loader } from '~/routes/api.boxes.$deviceId.script'
import { registerUser } from '~/services/user-service.server'

const DEVICE_SENSORS_USER = generateTestUserCredentials()

const DEVICE_SENSOR_BOX = {
	name: `${DEVICE_SENSORS_USER.name}s Box`,
	exposure: 'outdoor',
	expiresAt: null,
	tags: [],
	latitude: 0,
	longitude: 0,
	// model: 'homeV2Wifi', //maybe readd this later?
	mqttEnabled: false,
	ttnEnabled: false,
	sensors: [
		{
			title: 'Temp',
			unit: '°C',
			sensorType: 'dummy',
		},
		{
			title: 'CO2',
			unit: 'mol/L',
			sensorType: 'dummy',
		},
		{
			title: 'Air Pressure',
			unit: 'kPa',
			sensorType: 'dummy',
		},
	],
}

const { generateSketchMock } = vi.hoisted(() => ({
	generateSketchMock: vi.fn().mockReturnValue('ok'),
}))
vi.mock('@sensebox/sketch-templater', () => {
	return {
		default: class {
			generateSketch = generateSketchMock
		},
	}
})

describe('openSenseMap API Routes: /boxes/:deviceId/script', () => {
	let deviceId = ''

	beforeAll(async () => {
		const registration = await registerUser(
			DEVICE_SENSORS_USER.name,
			DEVICE_SENSORS_USER.email,
			DEVICE_SENSORS_USER.password,
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

		const device = await createDevice(DEVICE_SENSOR_BOX, (user as User).id)
		deviceId = device.id
	})

	afterAll(async () => {
		await deleteUserByEmail(DEVICE_SENSORS_USER.email)
		await deleteDevice({ id: deviceId })
	})

	it('should generate a sketch for a valid deviceId', async () => {
		const request = new Request(
			`${BASE_URL}/boxes/${deviceId}/script?enable_debug=true&display_enabled=false`,
			{ method: 'GET' },
		)

		const dataFunctionValue = await loader({
			request,
			params: { deviceId: `${deviceId}` } as Params<string>,
		} as Route.LoaderArgs)
		const response = dataFunctionValue as Response

		expect(response.status).toBe(200)
		expect(await response.text()).toBe('ok')
		expect(generateSketchMock).toHaveBeenCalled()
	})

	it('should return 400 if deviceId is missing', async () => {
		const request = new Request(`${BASE_URL}/boxes//script?enable_debug=true`, {
			method: 'GET',
		})

		const dataFunctionValue = await loader({
			request,
			params: {} as Params<string>,
		} as Route.LoaderArgs)

		const response = dataFunctionValue as Response
		expect(response.status).toBe(400)
	})
})

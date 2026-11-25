import { type Params } from 'react-router'
import { generateTestUserCredentials } from 'tests/data/generate_test_user'
import { type Route } from '../../.react-router/types/app/routes/+types/api.boxes.$deviceId.sensors.$sensorId'
import { BASE_URL } from '../../vitest.setup'
import { createDevice, deleteDevice } from '~/db/models/device.server'
import { getSensors } from '~/db/models/sensor.server'
import { deleteUserByEmail } from '~/db/models/user.server'
import { type Sensor, type Device } from '~/db/schema'
import { loader } from '~/routes/api.boxes.$deviceId.sensors.$sensorId'
import { registerUser } from '~/services/user-service.server'

const DEVICE_SENSORS_ID_USER = generateTestUserCredentials()

const DEVICE_SENSOR_ID_BOX = {
	name: `${DEVICE_SENSORS_ID_USER}s Box`,
	exposure: 'outdoor',
	expiresAt: null,
	tags: [],
	latitude: 0,
	longitude: 0,
	//model: 'luftdaten.info',
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

describe('openSenseMap API Routes: /boxes/:deviceId/sensors/:sensorId', () => {
	let device: Device
	let deviceId: string = ''
	let sensors: Sensor[] = []

	beforeAll(async () => {
		const registration = await registerUser(
			DEVICE_SENSORS_ID_USER.name,
			DEVICE_SENSORS_ID_USER.email,
			DEVICE_SENSORS_ID_USER.password,
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

		device = await createDevice(DEVICE_SENSOR_ID_BOX, user.id)
		deviceId = device.id
		sensors = await getSensors(deviceId)
	})

	describe('GET', () => {
		it('should return a single sensor of a box', async () => {
			// Arrange
			const request = new Request(
				`${BASE_URL}/boxes/${deviceId}/sensors/${sensors[0].id}`,
				{ method: 'GET' },
			)

			// Act
			const dataFunctionValue = await loader({
				request,
				params: {
					deviceId: `${deviceId}`,
					sensorId: `${sensors[0].id}`,
				} as Params<string>,
			} as Route.LoaderArgs) // Assuming a separate loader for single sensor
			const response = dataFunctionValue as Response
			const body = await response?.json()

			// Assert
			expect(response.status).toBe(200)
			expect(response.headers.get('content-type')).toBe(
				'application/json; charset=utf-8',
			)
			expect(body).toHaveProperty('_id')
		})

		it('should return only value of a single sensor of a box', async () => {
			// Arrange
			const request = new Request(
				`${BASE_URL}/boxes/${deviceId}/sensors/${sensors[0].id}?onlyValue=true`,
				{ method: 'GET' },
			)

			// Act
			const dataFunctionValue = await loader({
				request,
				params: {
					deviceId: `${deviceId}`,
					sensorId: `${sensors[0].id}`,
				} as Params<string>,
			} as Route.LoaderArgs) // Assuming a separate loader for single sensor
			const response = dataFunctionValue as Response
			const body = await response?.json()

			// Assert
			expect(response.status).toBe(200)
			expect(response.headers.get('content-type')).toBe(
				'application/json; charset=utf-8',
			)

			if (isNaN(Number.parseFloat(body))) expect(body).toBeNull()
			else expect(typeof body).toBe('number')
		})
	})

	afterAll(async () => {
		// delete the valid test user
		await deleteUserByEmail(DEVICE_SENSORS_ID_USER.email)

		// delete the box
		await deleteDevice({ id: deviceId })
	})
})

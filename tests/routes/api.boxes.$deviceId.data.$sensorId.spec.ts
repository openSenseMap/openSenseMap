import { type Params } from 'react-router'
import { generateTestUserCredentials } from 'tests/data/generate_test_user'
import { type Route } from '../../.react-router/types/app/routes/+types/api.boxes.$deviceId.data.$sensorId'
import { BASE_URL } from '../../vitest.setup'
import { createDevice, deleteDevice } from '~/db/models/device.server'
import {
	deleteMeasurementsForSensor,
	deleteMeasurementsForTime,
	insertMeasurements,
} from '~/db/models/measurement.server'
import { getSensors } from '~/db/models/sensor.server'
import { deleteUserByEmail } from '~/db/models/user.server'
import { type Sensor, type Device, type User } from '~/db/schema'
import { loader } from '~/routes/api.boxes.$deviceId.data.$sensorId'
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

const MEASUREMENTS = [
	{
		value: 1589625,
		createdAt: new Date('1954-06-07 12:00:00+00'),
		sensor_id: '',
	},
	{
		value: 3.14159,
		createdAt: new Date('1988-03-14 1:59:26+00'),
		sensor_id: '',
	},
]

describe('openSenseMap API Routes: /api/boxes/:deviceId/data/:sensorId', () => {
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

		device = await createDevice(DEVICE_SENSOR_ID_BOX, (user as User).id)
		deviceId = device.id
		sensors = await getSensors(deviceId)

		MEASUREMENTS.forEach((meas) => (meas.sensor_id = sensors[0].id))
		await insertMeasurements(MEASUREMENTS)
	})

	describe('GET', () => {
		it('should return measurements for a single sensor of a box in json format', async () => {
			// Arrange
			const request = new Request(
				`${BASE_URL}/api/boxes/${deviceId}/data/${sensors[0].id}?from-date=${new Date('1954-06-07 11:00:00+00')}&to-date=${new Date('1988-03-14 1:59:27+00')}`,
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
			expect(body).toHaveLength(2)
			expect(body[0].sensor_id).toBe(sensors[0].id)
			expect(body[1].sensor_id).toBe(sensors[0].id)
			expect(body[0].time).toBe('1988-03-14 01:59:26+00')
			expect(body[1].time).toBe('1954-06-07 12:00:00+00')
			expect(body[0].value).toBeCloseTo(3.14159)
			expect(body[1].value).toBe(1589625)
		})

		it('should return measurements for a single sensor of a box in csv format', async () => {
			// Arrange
			const request = new Request(
				`${BASE_URL}/api/boxes/${deviceId}/data/${sensors[0].id}?from-date=${new Date('1954-06-07 11:00:00+00')}&to-date=${new Date('1988-03-14 1:59:27+00')}&format=csv`,
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
			const body = await response?.text()

			// Assert
			expect(response.status).toBe(200)
			expect(response.headers.get('content-type')).toBe(
				'text/csv; charset=utf-8',
			)
			expect(body).toBe(
				'createdAt,value\n1988-03-14 01:59:26+00,3.14159\n1954-06-07 12:00:00+00,1589625',
			)
		})
	})

	afterAll(async () => {
		//delete measurements
		if (sensors.length > 0) {
			await deleteMeasurementsForSensor(sensors[0].id)
			await deleteMeasurementsForTime(MEASUREMENTS[0].createdAt)
			await deleteMeasurementsForTime(MEASUREMENTS[1].createdAt)
		}
		// delete the valid test user
		await deleteUserByEmail(DEVICE_SENSORS_ID_USER.email)
		// delete the box
		await deleteDevice({ id: deviceId })
	})
})

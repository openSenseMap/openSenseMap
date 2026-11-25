import { or, sql } from 'drizzle-orm'
import { type Params } from 'react-router'
import { generateTestUserCredentials } from 'tests/data/generate_test_user'
import { type Route } from '../../.react-router/types/app/routes/+types/api.boxes.$deviceId.locations'
import { BASE_URL } from '../../vitest.setup'
import { createDevice, deleteDevice } from '~/db/models/device.server'
import {
	deleteMeasurementsForSensor,
	deleteMeasurementsForTime,
	saveMeasurements,
} from '~/db/models/measurement.server'
import { getSensors } from '~/db/models/sensor.server'
import { deleteUserByEmail } from '~/db/models/user.server'
import { type Sensor, location } from '~/db/schema'
import { drizzleClient } from '~/db.server'
import { loader } from '~/routes/api.boxes.$deviceId.locations'
import { registerUser } from '~/services/user-service.server'

const DEVICE_SENSORS_ID_USER = generateTestUserCredentials()

const DEVICE_SENSOR_ID_BOX = {
	name: `${DEVICE_SENSORS_ID_USER}s Box`,
	exposure: 'outdoor',
	expiresAt: null,
	tags: [],
	latitude: 0,
	longitude: 0,
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
		location: {
			lng: -179.65,
			lat: 89.76,
			height: 3.123,
		},
	},
	{
		value: 3.14159,
		createdAt: new Date('1988-03-14 1:59:26+00'),
		sensor_id: '',
		location: {
			lng: 56.78123,
			lat: 32.198,
		},
	},
	{
		value: 0,
		createdAt: new Date('2000-05-25 11:11:11+00'),
		sensor_id: '',
		location: {
			lng: 123.456789,
			lat: 0.12345,
			height: 8.71,
		},
	},
]

describe('openSenseMap API Routes: /api/boxes/:deviceId/locations', () => {
	let device
	let deviceId: string = ''
	let sensors: Sensor[]

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

		MEASUREMENTS.forEach((meas) => (meas.sensor_id = sensors[0].id))
		await saveMeasurements(device, MEASUREMENTS)
	})

	describe('GET', () => {
		it('should return locations of a box in json format', async () => {
			// Arrange
			const request = new Request(
				`${BASE_URL}/api/boxes/${deviceId}/locations?from-date=${new Date('1954-06-07 11:00:00+00')}&to-date=${new Date('1988-03-14 1:59:27+00')}`,
				{ method: 'GET' },
			)

			// Act
			const dataFunctionValue = await loader({
				request,
				params: {
					deviceId: `${deviceId}`,
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
			expect(body[0].coordinates).toHaveLength(2)
			expect(body[1].coordinates).toHaveLength(2)
			expect(body[0].coordinates[0]).toBe(56.78123)
			expect(body[0].coordinates[1]).toBe(32.198)
			expect(body[1].coordinates[0]).toBe(-179.65)
			expect(body[1].coordinates[1]).toBe(89.76)
			expect(body[0].type).toBe('Point')
			expect(body[1].type).toBe('Point')
			expect(body[0].timestamp).toBe('1988-03-14T01:59:26.000Z')
			expect(body[1].timestamp).toBe('1954-06-07T12:00:00.000Z')
		})

		it('should return locations of a box in geojson format', async () => {
			// Arrange
			const request = new Request(
				`${BASE_URL}/api/boxes/${deviceId}/locations?from-date=${new Date('1954-06-07 11:00:00+00')}&to-date=${new Date('1988-03-14 1:59:27+00')}&format=geojson`,
				{ method: 'GET' },
			)

			// Act
			const dataFunctionValue = await loader({
				request,
				params: {
					deviceId: `${deviceId}`,
				} as Params<string>,
			} as Route.LoaderArgs) // Assuming a separate loader for single sensor
			const response = dataFunctionValue as Response
			const body = await response?.json()

			// Assert
			expect(response.status).toBe(200)
			expect(response.headers.get('content-type')).toBe(
				'application/geo+json; charset=utf-8',
			)
			expect(body.type).toBe('Feature')
			expect(body.geometry.type).toBe('LineString')
			expect(body.geometry.coordinates).toHaveLength(2)
			expect(body.geometry.coordinates[0]).toHaveLength(2)
			expect(body.geometry.coordinates[1]).toHaveLength(2)
			expect(body.geometry.coordinates[0][0]).toBe(56.78123)
			expect(body.geometry.coordinates[0][1]).toBe(32.198)
			expect(body.geometry.coordinates[1][0]).toBe(-179.65)
			expect(body.geometry.coordinates[1][1]).toBe(89.76)
			expect(body.properties.timestamps).toHaveLength(2)
			expect(body.properties.timestamps[0]).toBe('1988-03-14T01:59:26.000Z')
			expect(body.properties.timestamps[1]).toBe('1954-06-07T12:00:00.000Z')
		})
	})

	afterAll(async () => {
		//delete measurements
		if (sensors?.length > 0) {
			await deleteMeasurementsForSensor(sensors[0].id)
			MEASUREMENTS.forEach(
				async (measurement) =>
					await deleteMeasurementsForTime(measurement.createdAt),
			)
		}
		// delete the valid test user
		await deleteUserByEmail(DEVICE_SENSORS_ID_USER.email)
		// delete the box
		await deleteDevice({ id: deviceId })
		// delete created locations
		await deleteLocations()
	})
})

async function deleteLocations() {
	await drizzleClient.delete(location).where(
		or(
			...MEASUREMENTS.map(
				(measurement) =>
					sql`ST_EQUALS(
            ${location.location},
            ST_SetSRID(ST_MakePoint(${measurement.location.lng}, ${measurement.location.lat}), 4326)
          )`,
			),
		),
	)
}

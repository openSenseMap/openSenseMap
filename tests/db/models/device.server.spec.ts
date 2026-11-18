import { createDevice, deleteDevice } from '~/db/models/device.server'
import { deleteUserByEmail } from '~/db/models/user.server'
import { type User } from '~/db/schema'
import { registerUser } from '~/services/user-service.server'

const DEVICE_MODEL_TEST_USER = {
	name: 'device-model-tester',
	email: 'test@devicemodel.me',
	password: 'some secure password',
}

describe('Device Model: createDevice', () => {
	let userId: string = ''
	let createdDeviceIds: string[] = []

	beforeAll(async () => {
		const registration = await registerUser(
			DEVICE_MODEL_TEST_USER.name,
			DEVICE_MODEL_TEST_USER.email,
			DEVICE_MODEL_TEST_USER.password,
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
		userId = (user as User).id
	})

	afterAll(async () => {
		// Clean up created devices
		for (const deviceId of createdDeviceIds) {
			try {
				await deleteDevice({ id: deviceId })
			} catch (error) {
				console.error(`Failed to delete device ${deviceId}:`, error)
			}
		}
		// Clean up test user
		await deleteUserByEmail(DEVICE_MODEL_TEST_USER.email)
	})

	it('should create a device and return it with multiple sensors', async () => {
		const deviceData = {
			name: 'Test Device with Sensors',
			latitude: 51.969,
			longitude: 7.596,
			exposure: 'outdoor',
			// model: "homeV2Wifi",
			sensors: [
				{ title: 'Temperature', unit: '°C', sensorType: 'HDC1080' },
				{ title: 'Humidity', unit: '%', sensorType: 'HDC1080' },
				{ title: 'Pressure', unit: 'hPa', sensorType: 'BMP280' },
			],
		}

		const result = await createDevice(deviceData, userId)

		createdDeviceIds.push(result.id)

		expect(result).toBeDefined()
		expect(result).toHaveProperty('id')
		expect(result).toHaveProperty('name', 'Test Device with Sensors')
		expect(result).toHaveProperty('latitude', 51.969)
		expect(result).toHaveProperty('longitude', 7.596)
		expect(result).toHaveProperty('userId', userId)

		expect(result).toHaveProperty('sensors')
		expect(Array.isArray(result.sensors)).toBe(true)
		expect(result.sensors).toHaveLength(3)

		expect(result.sensors[0]).toHaveProperty('id')
		expect(result.sensors[0]).toHaveProperty('title', 'Temperature')
		expect(result.sensors[0]).toHaveProperty('unit', '°C')
		expect(result.sensors[0]).toHaveProperty('sensorType', 'HDC1080')
		expect(result.sensors[0]).toHaveProperty('deviceId', result.id)

		expect(result.sensors[1]).toHaveProperty('title', 'Humidity')
		expect(result.sensors[2]).toHaveProperty('title', 'Pressure')

		result.sensors.forEach((sensor) => {
			expect(sensor.deviceId).toBe(result.id)
			expect(sensor).toHaveProperty('createdAt')
			expect(sensor).toHaveProperty('updatedAt')
		})
	})

	it('should create a device with empty sensors array when no sensors provided', async () => {
		const deviceData = {
			name: 'Device Without Sensors',
			latitude: 52.0,
			longitude: 8.0,
			exposure: 'indoor',
			model: 'custom',
		}

		const result = await createDevice(deviceData, userId)

		createdDeviceIds.push(result.id)
		expect(result).toBeDefined()
		expect(result).toHaveProperty('id')
		expect(result).toHaveProperty('name', 'Device Without Sensors')
		expect(result).toHaveProperty('sensors')
		expect(Array.isArray(result.sensors)).toBe(true)
		expect(result.sensors).toHaveLength(0)
	})

	it('should persist the sensor definition ID in sensor data', async () => {
		const result = await createDevice(
			{
				name: 'Device with catalog sensor',
				latitude: 52.0,
				longitude: 8.0,
				exposure: 'indoor',
				model: 'homeV2Wifi',
				sensorTemplates: ['sps30_pm1'],
			},
			userId,
		)

		createdDeviceIds.push(result.id)
		expect(result.sensors).toHaveLength(1)
		expect(result.sensors[0].data).toEqual({
			sensorDefinitionId: 'sps30_pm1',
		})
	})

	it('should create device with tags/grouptag', async () => {
		const deviceData = {
			name: 'Tagged Device',
			latitude: 51.5,
			longitude: 7.5,
			exposure: 'outdoor',
			// model: 'Custom',
			tags: ['weather', 'city', 'test'],
			sensors: [{ title: 'Temperature', unit: '°C', sensorType: 'DHT22' }],
		}

		const result = await createDevice(deviceData, userId)

		createdDeviceIds.push(result.id)
		expect(result).toHaveProperty('tags')
		expect(Array.isArray(result.tags)).toBe(true)
		expect(result.tags).toEqual(['weather', 'city', 'test'])
		expect(result.sensors).toHaveLength(1)
	})

	it('should create device with optional fields', async () => {
		const deviceData = {
			name: 'Full Featured Device',
			latitude: 51.0,
			longitude: 7.0,
			exposure: 'mobile',
			description: 'A comprehensive test device',
			image: 'https://example.com/device.jpg',
			link: 'https://example.com',
			public: true,
			tags: ['test'],
			sensors: [{ title: 'Temperature', unit: '°C', sensorType: 'SHT31' }],
		}

		const result = await createDevice(deviceData, userId)

		createdDeviceIds.push(result.id)
		expect(result).toHaveProperty('description', 'A comprehensive test device')
		expect(result).toHaveProperty('image', 'https://example.com/device.jpg')
		expect(result).toHaveProperty('link', 'https://example.com')
		expect(result).toHaveProperty('public', true)
		expect(result).toHaveProperty('exposure', 'mobile')
		expect(result.sensors).toHaveLength(1)
	})

	it('should set default values for optional fields when not provided', async () => {
		const deviceData = {
			name: 'Minimal Device',
			latitude: 50.0,
			longitude: 7.0,
			sensors: [],
		}

		const result = await createDevice(deviceData, userId)

		createdDeviceIds.push(result.id)
		expect(result).toHaveProperty('public', false)
		expect(result).toHaveProperty('useAuth', true)
		expect(result).toHaveProperty('expiresAt', null)
		expect(result.sensors).toHaveLength(0)
	})
})

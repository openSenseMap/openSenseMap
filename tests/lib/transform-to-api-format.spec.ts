import { transformDeviceToApiFormat } from '~/lib/device-transform'

describe('transformDeviceToApiFormat', () => {
	beforeAll(() => {
		vi.useFakeTimers()
		vi.setSystemTime(new Date('2024-01-02T00:00:00Z'))
	})

	afterAll(() => {
		vi.useRealTimers()
	})

	const mockDevice = {
		id: 'test-device-id',
		name: 'Test Device',
		description: 'A test device',
		image: 'https://example.com/image.jpg',
		link: 'https://example.com',
		tags: ['bike', 'outdoor'],
		exposure: 'mobile',
		model: 'custom',
		latitude: 37.7749,
		longitude: -122.4194,
		heightAboveGround: 3.25,
		terrainElevation: 15,
		terrainElevationDataset: 'eudem25m',
		useAuth: true,
		public: false,
		status: 'active',
		createdAt: new Date('2024-01-01T00:00:00Z'),
		updatedAt: new Date('2024-01-01T12:00:00Z'),
		expiresAt: new Date('2024-12-31T23:59:59Z'),
		userId: 'user-123',
		sensors: [
			{
				id: 'sensor-1',
				title: 'Temperature',
				unit: '°C',
				sensorType: 'HDC1080',
				lastMeasurement: {
					createdAt: '2024-01-01T12:00:00Z',
					value: '25.5',
				},
			},
			{
				id: 'sensor-2',
				title: 'Humidity',
				unit: '%',
				sensorType: 'HDC1080',
				lastMeasurement: null,
			},
		],
	}

	test('transforms device with all fields', () => {
		const result = transformDeviceToApiFormat(mockDevice as any)

		expect(result).toEqual({
			_id: 'test-device-id',
			grouptag: ['bike', 'outdoor'],
			name: 'Test Device',
			description: 'A test device',
			image: 'https://example.com/image.jpg',
			link: 'https://example.com',
			exposure: 'mobile',
			model: 'custom',
			latitude: 37.7749,
			longitude: -122.4194,
			heightAboveGround: 3.25,
			heightAboveSeaLevel: 18.25,
			terrainElevation: 15,
			terrainElevationDataset: 'eudem25m',
			height: 18.25,
			useAuth: true,
			public: false,
			status: 'active',
			createdAt: new Date('2024-01-01T00:00:00Z').toISOString(),
			updatedAt: new Date('2024-01-01T12:00:00Z').toISOString(),
			expiresAt: new Date('2024-12-31T23:59:59Z').toISOString(),
			userId: 'user-123',
			currentLocation: {
				type: 'Point',
				coordinates: [-122.4194, 37.7749, 18.25],
				timestamp: '2024-01-01T12:00:00.000Z',
			},
			lastMeasurementAt: '2024-01-01T12:00:00.000Z',
			loc: [
				{
					geometry: {
						type: 'Point',
						coordinates: [-122.4194, 37.7749, 18.25],
						timestamp: '2024-01-01T12:00:00.000Z',
					},
					type: 'Feature',
				},
			],
			integrations: {
				mqtt: {
					enabled: false,
				},
			},
			sensors: [
				{
					_id: 'sensor-1',
					title: 'Temperature',
					unit: '°C',
					sensorType: 'HDC1080',
					lastMeasurement: {
						createdAt: '2024-01-01T12:00:00Z',
						value: '25.5',
					},
				},
				{
					_id: 'sensor-2',
					title: 'Humidity',
					unit: '%',
					sensorType: 'HDC1080',
					lastMeasurement: null,
				},
			],
		})
	})

	test('handles null tags by defaulting to empty array', () => {
		const deviceWithNullTags = { ...mockDevice, tags: null }
		const result = transformDeviceToApiFormat(deviceWithNullTags as any)

		expect(result.grouptag).toEqual([])
	})

	test('handles undefined tags by defaulting to empty array', () => {
		const deviceWithUndefinedTags = { ...mockDevice, tags: undefined }
		const result = transformDeviceToApiFormat(deviceWithUndefinedTags as any)

		expect(result.grouptag).toEqual([])
	})

	test('handles missing sensors by defaulting to empty array', () => {
		const deviceWithoutSensors = { ...mockDevice, sensors: undefined }
		const result = transformDeviceToApiFormat(deviceWithoutSensors as any)

		expect(result.sensors).toEqual([])
	})

	test('handles null sensors by defaulting to empty array', () => {
		const deviceWithNullSensors = { ...mockDevice, sensors: null }
		const result = transformDeviceToApiFormat(deviceWithNullSensors as any)

		expect(result.sensors).toEqual([])
	})

	test('transforms sensors correctly', () => {
		const result = transformDeviceToApiFormat(mockDevice as any)

		expect(result.sensors).toHaveLength(2)
		expect(result.sensors[0]).toEqual({
			_id: 'sensor-1',
			title: 'Temperature',
			unit: '°C',
			sensorType: 'HDC1080',
			lastMeasurement: {
				createdAt: '2024-01-01T12:00:00Z',
				value: '25.5',
			},
		})
		expect(result.sensors[1]).toEqual({
			_id: 'sensor-2',
			title: 'Humidity',
			unit: '%',
			sensorType: 'HDC1080',
			lastMeasurement: null,
		})
	})

	test('generates correct currentLocation structure', () => {
		const result = transformDeviceToApiFormat(mockDevice as any)

		expect(result.currentLocation).toEqual({
			type: 'Point',
			coordinates: [-122.4194, 37.7749, 18.25], // [longitude, latitude, height]
			timestamp: '2024-01-01T12:00:00.000Z',
		})
	})

	test('generates correct loc array structure', () => {
		const result = transformDeviceToApiFormat(mockDevice as any)

		expect(result.loc).toEqual([
			{
				geometry: {
					type: 'Point',
					coordinates: [-122.4194, 37.7749, 18.25], // [longitude, latitude, height]
					timestamp: '2024-01-01T12:00:00.000Z',
				},
				type: 'Feature',
			},
		])
	})

	test('preserves zero height in both location coordinate formats', () => {
		const result = transformDeviceToApiFormat({
			...mockDevice,
			terrainElevation: -3.25,
		} as any)

		expect(result.height).toBe(0)
		expect(result.currentLocation.coordinates).toEqual([-122.4194, 37.7749, 0])
		expect(result.loc[0].geometry.coordinates).toEqual([-122.4194, 37.7749, 0])
	})

	test.each([null, undefined])(
		'omits the third coordinate when terrain elevation is %s',
		(height) => {
			const result = transformDeviceToApiFormat({
				...mockDevice,
				terrainElevation: height,
			} as any)

			expect(result.currentLocation.coordinates).toEqual([-122.4194, 37.7749])
			expect(result.loc[0].geometry.coordinates).toEqual([-122.4194, 37.7749])
		},
	)

	test('sets correct integrations structure', () => {
		const result = transformDeviceToApiFormat(mockDevice as any)

		expect(result.integrations).toEqual({
			mqtt: {
				enabled: false,
			},
		})
	})

	test('handles minimal device data', () => {
		const minimalDevice = {
			id: 'minimal-id',
			name: 'Minimal Device',
			latitude: 0,
			longitude: 0,
			updatedAt: new Date('2024-01-01T00:00:00Z'),
		}

		const result = transformDeviceToApiFormat(minimalDevice as any)

		expect(result._id).toBe('minimal-id')
		expect(result.name).toBe('Minimal Device')
		expect(result.grouptag).toEqual([])
		expect(result.sensors).toEqual([])
		expect(result.currentLocation.coordinates).toEqual([0, 0])
		expect(result.loc[0].geometry.coordinates).toEqual([0, 0])
	})

	test('preserves original device fields except derived status', () => {
		const result = transformDeviceToApiFormat(mockDevice as any)

		// Check that all original fields are preserved
		expect(result.name).toBe(mockDevice.name)
		expect(result.description).toBe(mockDevice.description)
		expect(result.image).toBe(mockDevice.image)
		expect(result.link).toBe(mockDevice.link)
		expect(result.exposure).toBe(mockDevice.exposure)
		expect(result.model).toBe(mockDevice.model)
		expect(result.latitude).toBe(mockDevice.latitude)
		expect(result.longitude).toBe(mockDevice.longitude)
		expect(result.height).toBe(18.25)
		expect(result.heightAboveGround).toBe(mockDevice.heightAboveGround)
		expect(result.heightAboveSeaLevel).toBe(18.25)
		expect(result.terrainElevation).toBe(mockDevice.terrainElevation)
		expect(result.terrainElevationDataset).toBe(
			mockDevice.terrainElevationDataset,
		)
		expect(result.useAuth).toBe(mockDevice.useAuth)
		expect(result.public).toBe(mockDevice.public)
		expect(result.status).toBe(mockDevice.status)
		expect(result.createdAt).toBe(mockDevice.createdAt.toISOString())
		expect(result.updatedAt).toBe(mockDevice.updatedAt.toISOString())
		expect(result.expiresAt).toBe(mockDevice.expiresAt.toISOString())
		expect(result.userId).toBe(mockDevice.userId)
	})

	test.each([
		['active', '2023-12-31T00:00:00Z'],
		['inactive', '2023-12-20T00:00:00Z'],
		['old', '2023-11-01T00:00:00Z'],
	] as const)(
		'derives %s status from the latest measurement',
		(status, createdAt) => {
			const result = transformDeviceToApiFormat({
				...mockDevice,
				status: status === 'active' ? 'old' : 'active',
				sensors: [
					{
						...mockDevice.sensors[0],
						lastMeasurement: { value: '1', createdAt },
					},
				],
			} as any)

			expect(result.status).toBe(status)
		},
	)

	test('uses the newest measurement across all sensors', () => {
		const result = transformDeviceToApiFormat({
			...mockDevice,
			status: 'old',
			sensors: [
				{
					...mockDevice.sensors[0],
					lastMeasurement: {
						value: '1',
						createdAt: '2023-11-01T00:00:00Z',
					},
				},
				{
					...mockDevice.sensors[1],
					lastMeasurement: {
						value: '2',
						createdAt: '2024-01-01T00:00:00Z',
					},
				},
			],
		} as any)

		expect(result.status).toBe('active')
	})

	test('returns old for a device without valid measurements', () => {
		const result = transformDeviceToApiFormat({
			...mockDevice,
			status: 'active',
			sensors: [],
		} as any)

		expect(result.status).toBe('old')
	})

	test('converts numeric lastMeasurement values to strings', () => {
		const deviceWithNumericMeasurement = {
			...mockDevice,
			sensors: [
				{
					id: 'sensor-1',
					title: 'Temperature',
					unit: '°C',
					sensorType: 'HDC1080',
					lastMeasurement: {
						createdAt: '2024-01-01T12:00:00Z',
						value: 25.5,
					},
				},
			],
		}

		const result = transformDeviceToApiFormat(
			deviceWithNumericMeasurement as any,
		)

		expect(result.sensors[0].lastMeasurement).toEqual({
			createdAt: '2024-01-01T12:00:00Z',
			value: '25.5',
		})
		expect(typeof result.sensors[0].lastMeasurement?.value).toBe('string')
	})

	test('preserves string lastMeasurement values', () => {
		const result = transformDeviceToApiFormat(mockDevice as any)

		expect(result.sensors[0].lastMeasurement?.value).toBe('25.5')
		expect(typeof result.sensors[0].lastMeasurement?.value).toBe('string')
	})
})

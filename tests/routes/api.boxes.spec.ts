import { generateTestUserCredentials } from 'tests/data/generate_test_user'
import invariant from 'tiny-invariant'
import { type Route } from '../../.react-router/types/app/routes/+types/api.boxes'
import { BASE_URL } from '../../vitest.setup'
import { createDevice, deleteDevice } from '~/db/models/device.server'
import { deleteUserByEmail } from '~/db/models/user.server'
import { type Device, type User } from '~/db/schema'
import { createToken } from '~/lib/jwt'
import { loader, action } from '~/routes/api.boxes'
import { registerUser } from '~/services/user-service.server'
import { getTerrainElevation } from '~/services/elevation-service.server'
import { applyElevationConsentChoice } from '~/db/models/elevation-consent.server'

const TEST_TERRAIN_ELEVATION = vi.hoisted(() => 250)
const TEST_ELEVATION_DATASET = vi.hoisted(() => 'eudem25m')

vi.mock('~/db/models/elevation-consent.server', () => ({
	applyElevationConsentChoice: vi.fn(async () => true),
}))

vi.mock('~/services/elevation-service.server', async (importOriginal) => {
	const actual =
		await importOriginal<typeof import('~/services/elevation-service.server')>()

	return {
		...actual,
		getTerrainElevation: vi.fn(async (latitude: number, longitude: number) => ({
			elevation: TEST_TERRAIN_ELEVATION,
			dataset: TEST_ELEVATION_DATASET,
			datum: null,
			attribution: null,
			latitude,
			longitude,
		})),
	}
})

const BOXES_TEST_USER = generateTestUserCredentials()
const generateMinimalDevice = (
	location: number[] | {} = [123, 12, 34],
	exposure = 'mobile',
	name = 'senseBox' + new Date().getTime(),
) => ({
	exposure,
	location,
	name,
	model: 'homeV2Ethernet',
})

describe('openSenseMap API Routes: /boxes', () => {
	let user: User | null = null
	let jwt: string = ''
	let createdDeviceIds: string[] = []
	let queryableDevice: Device | null = null
	const grouptag = 'testgroup' + Math.random()

	beforeAll(async () => {
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
		user = registration.user
		const { token } = await createToken(user)
		jwt = token

		queryableDevice = await createDevice(
			{
				...generateMinimalDevice(),
				latitude: 123,
				longitude: 12,
				tags: [grouptag],
				useAuth: false,
			},
			user.id,
		)
		createdDeviceIds.push(queryableDevice.id)
	})

	afterAll(async () => {
		for (const deviceId of createdDeviceIds) {
			try {
				await deleteDevice({ id: deviceId })
			} catch (error) {
				console.error(`Failed to delete device ${deviceId}:`, error)
			}
		}
		if (user) {
			await deleteUserByEmail(BOXES_TEST_USER.email)
		}
	})

	describe('GET', () => {
		it('should search for boxes with a specific name and limit the results', async () => {
			const searchParams = new URLSearchParams({
				format: 'geojson',
				name: queryableDevice?.name ?? '',
				limit: '2',
			})

			const request = new Request(`${BASE_URL}?${searchParams}`, {
				method: 'GET',
				headers: { 'Content-Type': 'application/json' },
			})

			const response = (await loader({
				request,
			} as Route.LoaderArgs)) as Response

			const body = await response.json()

			expect(response.status).toBe(200)
			expect(response.headers.get('Content-Type')).toContain(
				'application/geo+json',
			)

			expect(body).toBeDefined()
			expect(body.type).toBe('FeatureCollection')
			expect(Array.isArray(body.features)).toBe(true)
			expect(body.features.length).lessThanOrEqual(2)
		})

		it('should include a non-null height in device GeoJSON coordinates', async () => {
			invariant(user, 'Test user must be registered')

			const heightDevice = await createDevice(
				{
					name: `GeoJSON Height Device ${Date.now()}`,
					latitude: 51.969,
					longitude: 7.596,
					heightAboveGround: 2.5,
					terrainElevation: -15,
					exposure: 'outdoor',
					model: 'custom',
					sensors: [],
				},
				user.id,
			)
			createdDeviceIds.push(heightDevice.id)

			const searchParams = new URLSearchParams({
				format: 'geojson',
				name: heightDevice.name,
				limit: '1',
			})
			const request = new Request(`${BASE_URL}?${searchParams}`, {
				method: 'GET',
			})

			const response = (await loader({
				request,
			} as Route.LoaderArgs)) as Response
			const body = await response.json()
			const feature = body.features.find(
				(candidate: any) => candidate.properties.id === heightDevice.id,
			)

			expect(response.status).toBe(200)
			expect(feature).toBeDefined()
			expect(feature.properties.height).toBe(-12.5)
			expect(feature.properties.heightAboveGround).toBeUndefined()
			expect(feature.properties.terrainElevation).toBeUndefined()
			expect(feature.properties.terrainElevationDataset).toBeUndefined()
			expect(feature.properties.heightAboveSeaLevel).toBe(-12.5)
			expect(feature.geometry.coordinates).toEqual([7.596, 51.969, -12.5])
		})

		it('should deny searching for a name if limit is greater than max value', async () => {
			// Arrange
			const request = new Request(
				`${BASE_URL}?format=geojson&name=${queryableDevice?.name}&limit=21`,
				{
					method: 'GET',
					headers: { 'Content-Type': 'application/json' },
				},
			)

			// Act
			await expect(async () => {
				await loader({
					request: request,
				} as Route.LoaderArgs)
			}).rejects.toThrow()
		})

		it('should deny searching for a name if limit is lower than min value', async () => {
			// Arrange
			const request = new Request(
				`${BASE_URL}?format=geojson&name=sensebox&limit=0`,
				{
					method: 'GET',
					headers: { 'Content-Type': 'application/json' },
				},
			)

			// Act
			await expect(async () => {
				await loader({
					request: request,
				} as Route.LoaderArgs)
			}).rejects.toThrow()
		})

		it('should allow to request minimal boxes', async () => {
			// Arrange
			const request = new Request(`${BASE_URL}?minimal=true&format=geojson`, {
				method: 'GET',
				headers: { 'Content-Type': 'application/json' },
			})

			// Act
			const response = (await loader({
				request,
			} as Route.LoaderArgs)) as Response

			const body = await response.json()

			// Assert
			expect(response).toBeDefined()
			expect(response.status).toBe(200)
			expect(response.headers.get('Content-Type')).toContain(
				'application/geo+json',
			)

			expect(body.type).toBe('FeatureCollection')
			expect(Array.isArray(body.features)).toBe(true)

			if (body.features.length > 0) {
				const feature = body.features[0]

				expect(feature.type).toBe('Feature')
				expect(feature.properties).toBeDefined()

				const props = feature.properties

				// Should have minimal fields
				expect(props?._id || props?.id).toBeDefined()
				expect(props?.name).toBeDefined()

				// Should NOT include these fields in minimal mode
				expect(props?.loc).toBeUndefined()
				expect(props?.locations).toBeUndefined()
				expect(props?.weblink).toBeUndefined()
				expect(props?.image).toBeUndefined()
				expect(props?.description).toBeUndefined()
				expect(props?.model).toBeUndefined()
				expect(props?.sensors).toBeUndefined()
			}
		})

		it('should return the correct schema of boxes for /boxes GET with date parameter', async () => {
			const tenDaysAgoIso = new Date(
				Date.now() - 10 * 24 * 60 * 60 * 1000,
			).toISOString()

			const searchParams = new URLSearchParams({
				format: 'geojson',
				date: tenDaysAgoIso,
			})

			// Arrange
			const request = new Request(`${BASE_URL}?${searchParams}`, {
				method: 'GET',
				headers: { 'Content-Type': 'application/json' },
			})

			// Act
			const response = (await loader({
				request,
			} as Route.LoaderArgs)) as Response

			const geojsonData = await response.json()

			// Assert
			expect(response).toBeDefined()
			expect(response.status).toBe(200)
			expect(response.headers.get('Content-Type')).toContain(
				'application/geo+json',
			)

			expect(geojsonData.type).toBe('FeatureCollection')
			expect(Array.isArray(geojsonData.features)).toBe(true)

			for (const feature of geojsonData.features) {
				expect(feature.type).toBe('Feature')
				expect(feature.geometry).toBeDefined()
				expect(feature.properties).toBeDefined()

				if (
					feature.properties?.sensors &&
					Array.isArray(feature.properties.sensors)
				) {
					const sensorsWithMeasurements = feature.properties.sensors.filter(
						(sensor: any) => sensor.lastMeasurement?.createdAt,
					)

					for (const sensor of sensorsWithMeasurements) {
						const measurementDate = new Date(sensor.lastMeasurement.createdAt)
						const filterDate = new Date(tenDaysAgoIso)

						expect(measurementDate.getTime()).toBeGreaterThanOrEqual(
							filterDate.getTime(),
						)
					}
				}
			}
		})

		it('should reject filtering boxes near a location with wrong parameter values', async () => {
			// Arrange
			const request = new Request(`${BASE_URL}?near=test,60`, {
				method: 'GET',
				headers: { 'Content-Type': 'application/json' },
			})

			// Act & Assert
			await expect(async () => {
				await loader({
					request: request,
				} as Route.LoaderArgs)
			}).rejects.toThrow()
		})

		it('should return 422 error on wrong format parameter', async () => {
			// Arrange
			const request = new Request(`${BASE_URL}?format=potato`, {
				method: 'GET',
				headers: { 'Content-Type': 'application/json' },
			})

			try {
				await loader({
					request: request,
				} as Route.LoaderArgs)
				expect(true).toBe(false)
			} catch (error) {
				expect(error).toBeInstanceOf(Response)
				expect((error as Response).status).toBe(422)

				const errorData = await (error as Response).json()
				expect(errorData.error).toBe('Invalid format parameter')
			}
		})

		it('should return geojson format when requested', async () => {
			// Arrange
			const request = new Request(`${BASE_URL}?format=geojson`, {
				method: 'GET',
				headers: { 'Content-Type': 'application/json' },
			})

			// Act
			const response = (await loader({
				request,
			} as Route.LoaderArgs)) as Response

			const geojsonData = await response.json()

			// Assert
			expect(response).toBeDefined()
			expect(response.status).toBe(200)
			expect(response.headers.get('Content-Type')).toContain(
				'application/geo+json',
			)

			expect(geojsonData.type).toBe('FeatureCollection')
			expect(Array.isArray(geojsonData.features)).toBe(true)

			if (geojsonData.features.length > 0) {
				const feature = geojsonData.features[0]

				expect(feature.type).toBe('Feature')
				expect(feature.geometry).toBeDefined()
				expect(feature.geometry.type).toBe('Point')
				expect(Array.isArray(feature.geometry.coordinates)).toBe(true)
				expect(feature.geometry.coordinates.length).toBe(
					feature.properties.height === null ? 2 : 3,
				)
				expect(feature.geometry.coordinates[0]).toBeDefined()
				expect(feature.geometry.coordinates[1]).toBeDefined()
				expect(feature.properties).toBeDefined()
			}
		})

		it('should allow to filter boxes by grouptag', async () => {
			// Arrange
			const request = new Request(`${BASE_URL}?grouptag=${grouptag}`, {
				method: 'GET',
				headers: { 'Content-Type': 'application/json' },
			})

			// Act
			const response = await loader({ request } as Route.LoaderArgs)

			// Handle case where loader returned a Response (e.g. validation error)
			const data =
				response instanceof Response ? await response.json() : response

			expect(data).toBeDefined()
			expect(Array.isArray(data)).toBe(true)

			expect(data).toHaveLength(1)

			if (response instanceof Response) {
				expect(response.status).toBe(200)
				expect(response.headers.get('content-type')).toMatch(
					/application\/json/,
				)
			}
		})

		it('should allow filtering boxes by bounding box', async () => {
			// Arrange
			const request = new Request(
				`${BASE_URL}?format=geojson&bbox=120,60,121,61`,
				{
					method: 'GET',
					headers: { 'Content-Type': 'application/json' },
				},
			)

			// Act
			const response = (await loader({
				request,
			} as Route.LoaderArgs)) as Response

			const body = await response.json()

			if (body) {
				// Assert
				expect(body.type).toBe('FeatureCollection')
				expect(Array.isArray(body.features)).toBe(true)

				if (body.features.length > 0) {
					body.features.forEach((feature: any) => {
						expect(feature.type).toBe('Feature')
						expect(feature.geometry).toBeDefined()
						expect(feature.geometry.coordinates).toBeDefined()

						const [longitude, latitude] = feature.geometry.coordinates

						// Verify coordinates are within the bounding box [120,60,121,61]
						expect(longitude).toBeGreaterThanOrEqual(120)
						expect(longitude).toBeLessThanOrEqual(121)
						expect(latitude).toBeGreaterThanOrEqual(60)
						expect(latitude).toBeLessThanOrEqual(61)
					})
				}
			}
		})

		it('should reject filtering boxes near a location with wrong parameter values', async () => {
			// Arrange
			const request = new Request(`${BASE_URL}?near=test,60`, {
				method: 'GET',
				headers: { 'Content-Type': 'application/json' },
			})

			// Act & Assert
			await expect(async () => {
				await loader({
					request: request,
				} as Route.LoaderArgs)
			}).rejects.toThrow()
		})

		it('should return 422 error on wrong format parameter', async () => {
			// Arrange
			const request = new Request(`${BASE_URL}?format=potato`, {
				method: 'GET',
				headers: { 'Content-Type': 'application/json' },
			})

			try {
				await loader({
					request: request,
				} as Route.LoaderArgs)
				expect(true).toBe(false)
			} catch (error) {
				expect(error).toBeInstanceOf(Response)
				expect((error as Response).status).toBe(422)

				const errorData = await (error as Response).json()
				expect(errorData.error).toBe('Invalid format parameter')
			}
		})
	})

	describe('POST', () => {
		it('should create a new box with sensors', async () => {
			const requestBody = {
				name: 'Test Weather Station',
				location: [7.596, 51.969],
				exposure: 'outdoor',
				// model: 'custom',
				grouptag: ['weather', 'test'],
				sensors: [
					{
						id: '0',
						title: 'Temperature',
						unit: '°C',
						sensorType: 'HDC1080',
					},
					{
						id: '1',
						title: 'Humidity',
						unit: '%',
						sensorType: 'HDC1080',
					},
				],
			}

			const request = new Request(`${BASE_URL}/boxes`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${jwt}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(requestBody),
			})

			const response = (await action({
				request,
			} as Route.ActionArgs)) as Response
			const body = await response.json()

			if (body._id) {
				createdDeviceIds.push(body._id)
			}

			expect(response.status).toBe(201)
			expect(body).toHaveProperty('_id')
			expect(body).toHaveProperty('name', 'Test Weather Station')
			expect(body.sensors).toHaveLength(2)
			expect(body).toHaveProperty('sensors')
			expect(body.sensors[0]).toHaveProperty('title', 'Temperature')
			expect(body.sensors[1]).toHaveProperty('title', 'Humidity')
			expect(body).toHaveProperty('access_token')
			expect(body.access_token).not.toBeNull()
		})

		it('should create a box with minimal data (no sensors)', async () => {
			const requestBody = {
				name: 'Minimal Test Box',
				location: [7.5, 51.9],
			}

			const request = new Request(`${BASE_URL}/boxes`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${jwt}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(requestBody),
			})

			const response = (await action({
				request,
			} as Route.ActionArgs)) as Response
			const body = await response.json()

			if (body._id) {
				createdDeviceIds.push(body._id)
			}

			expect(response.status).toBe(201)
			expect(body).toHaveProperty('_id')
			expect(body).toHaveProperty('name', 'Minimal Test Box')
			expect(body).toHaveProperty('sensors')
			expect(Array.isArray(body.sensors)).toBe(true)
			expect(body.sensors).toHaveLength(0)
			expect(body.height).toBeNull()
			expect(body.heightAboveGround).toBeNull()
			expect(body.heightAboveSeaLevel).toBeNull()
			expect(body.currentLocation.coordinates).toEqual([7.5, 51.9])
		})

		it('should reject creation without authentication', async () => {
			const requestBody = {
				name: 'Unauthorized Box',
				location: [7.5, 51.9],
			}

			const request = new Request(`${BASE_URL}/boxes`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(requestBody),
			})

			const response = (await action({
				request,
			} as Route.ActionArgs)) as Response
			const body = await response.json()

			expect(response.status).toBe(403)
			expect(body).toHaveProperty('code', 'Forbidden')
			expect(body).toHaveProperty('message')
		})

		it('should reject creation with invalid JWT', async () => {
			const requestBody = {
				name: 'Invalid JWT Box',
				location: [7.5, 51.9],
			}

			const request = new Request(`${BASE_URL}/boxes`, {
				method: 'POST',
				headers: {
					Authorization: 'Bearer invalid_jwt_token',
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(requestBody),
			})

			const response = (await action({
				request,
			} as Route.ActionArgs)) as Response
			const body = await response.json()

			expect(response.status).toBe(403)
			expect(body).toHaveProperty('code', 'Forbidden')
		})

		it('should reject creation with missing required fields', async () => {
			const requestBody = {
				location: [7.5, 51.9],
			}

			const request = new Request(`${BASE_URL}/boxes`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${jwt}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(requestBody),
			})

			const response = (await action({
				request,
			} as Route.ActionArgs)) as Response
			const body = await response.json()

			expect(response.status).toBe(400)
			expect(body).toHaveProperty('code', 'Bad Request')
		})

		it('should reject creation with invalid location format', async () => {
			const requestBody = {
				name: 'Invalid Location Box',
				location: [7.5],
			}

			const request = new Request(`${BASE_URL}/boxes`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${jwt}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(requestBody),
			})

			const response = (await action({
				request,
			} as Route.ActionArgs)) as Response
			const body = await response.json()

			expect(response.status).toBe(400)
			expect(body).toHaveProperty('code', 'Bad Request')
		})

		it('should reject creation with invalid JSON', async () => {
			const request = new Request(`${BASE_URL}/boxes`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${jwt}`,
					'Content-Type': 'application/json',
				},
				body: 'invalid json {',
			})

			const response = (await action({
				request,
			} as Route.ActionArgs)) as Response
			const body = await response.json()

			expect(response.status).toBe(400)
			expect(body).toHaveProperty('code', 'Bad Request')
			expect(body).toHaveProperty('message', 'Invalid JSON in request body')
		})

		it('should create box with default values for optional fields', async () => {
			const requestBody = {
				name: 'Default Values Box',
				location: [7.5, 51.9],
			}

			const request = new Request(`${BASE_URL}/boxes`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${jwt}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(requestBody),
			})

			const response = (await action({
				request,
			} as Route.ActionArgs)) as Response
			const body = await response.json()

			if (body._id) {
				createdDeviceIds.push(body._id)
			}

			expect(response.status).toBe(201)
			expect(body).toHaveProperty('exposure', 'unknown')
			expect(body).toHaveProperty('model', 'custom')
			expect(body).toHaveProperty('grouptag')
			expect(body.grouptag).toEqual([])
		})

		it('should allow to set the location for a new box as array', async () => {
			// Arrange
			const loc = [7.123456, 51.654321, 123.4]
			const requestBody = generateMinimalDevice(loc)

			const request = new Request(`${BASE_URL}/boxes`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${jwt}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(requestBody),
			})

			// Act
			const response = (await action({
				request: request,
			} as Route.ActionArgs)) as Response
			const responseData = await response.json()
			await deleteDevice({ id: responseData._id })
			const expectedHeight = TEST_TERRAIN_ELEVATION + loc[2]

			// Assert
			expect(response.status).toBe(201)
			expect(responseData.latitude).toBeDefined()
			expect(responseData.longitude).toBeDefined()
			expect(responseData.latitude).toBe(loc[1])
			expect(responseData.longitude).toBe(loc[0])
			expect(responseData.height).toBe(expectedHeight)
			expect(responseData.heightAboveGround).toBe(loc[2])
			expect(responseData.heightAboveSeaLevel).toBe(expectedHeight)
			expect(responseData.terrainElevation).toBe(TEST_TERRAIN_ELEVATION)
			expect(responseData.terrainElevationDataset).toBe(TEST_ELEVATION_DATASET)
			expect(responseData.currentLocation.coordinates).toEqual([
				loc[0],
				loc[1],
				expectedHeight,
			])
			expect(responseData.loc[0].geometry.coordinates).toEqual([
				loc[0],
				loc[1],
				expectedHeight,
			])
			expect(responseData.createdAt).toBeDefined()

			// Check that createdAt is recent (within 5 minutes)
			const now = new Date()
			const createdAt = new Date(responseData.createdAt)
			const diffInMs = now.getTime() - createdAt.getTime()
			expect(diffInMs).toBeLessThan(300000) // 5 minutes in milliseconds
		})

		it('should allow to set the location for a new box as latLng object', async () => {
			// Arrange
			const loc = { lng: 120.123456, lat: 60.654321, height: 0 }
			const requestBody = generateMinimalDevice(loc)

			const request = new Request(BASE_URL, {
				method: 'POST',
				headers: { Authorization: `Bearer ${jwt}` },
				body: JSON.stringify(requestBody),
			})

			// Act
			const response = (await action({
				request: request,
			} as Route.ActionArgs)) as Response
			const responseData = await response.json()
			await deleteDevice({ id: responseData._id })

			// Assert
			expect(response.status).toBe(201)
			expect(responseData.latitude).toBeDefined()
			expect(responseData.latitude).toBe(loc.lat)
			expect(responseData.longitude).toBeDefined()
			expect(responseData.longitude).toBe(loc.lng)
			expect(responseData.height).toBe(TEST_TERRAIN_ELEVATION)
			expect(responseData.heightAboveGround).toBe(0)
			expect(responseData.heightAboveSeaLevel).toBe(TEST_TERRAIN_ELEVATION)
			expect(responseData.terrainElevation).toBe(TEST_TERRAIN_ELEVATION)
			expect(responseData.terrainElevationDataset).toBe(TEST_ELEVATION_DATASET)
			expect(responseData.currentLocation.coordinates).toEqual([
				loc.lng,
				loc.lat,
				TEST_TERRAIN_ELEVATION,
			])
			expect(responseData.loc[0].geometry.coordinates).toEqual([
				loc.lng,
				loc.lat,
				TEST_TERRAIN_ELEVATION,
			])
			expect(responseData.createdAt).toBeDefined()

			// Check that createdAt is recent (within 5 minutes)
			const now = new Date()
			const createdAt = new Date(responseData.createdAt)
			const diffInMs = now.getTime() - createdAt.getTime()
			expect(diffInMs).toBeLessThan(300000) // 5 minutes in milliseconds
		})

		it('should retain height above ground when elevation lookup fails', async () => {
			vi.mocked(getTerrainElevation).mockRejectedValueOnce(
				new Error('Elevation unavailable'),
			)
			const request = new Request(BASE_URL, {
				method: 'POST',
				headers: { Authorization: `Bearer ${jwt}` },
				body: JSON.stringify(
					generateMinimalDevice({ lng: 7.6, lat: 51.9, height: 5 }),
				),
			})

			const response = (await action({
				request,
			} as Route.ActionArgs)) as Response
			const responseData = await response.json()
			if (responseData._id) createdDeviceIds.push(responseData._id)

			expect(response.status).toBe(201)
			expect(responseData.heightAboveGround).toBe(5)
			expect(responseData.heightAboveSeaLevel).toBeNull()
			expect(responseData.terrainElevation).toBeNull()
			expect(responseData.terrainElevationDataset).toBeNull()
			expect(responseData.height).toBeNull()
			expect(responseData.currentLocation.coordinates).toEqual([7.6, 51.9])
		})

		it('should not request elevation without consent', async () => {
			vi.mocked(applyElevationConsentChoice).mockResolvedValueOnce(false)
			const elevationLookup = vi.mocked(getTerrainElevation)
			elevationLookup.mockClear()

			const request = new Request(BASE_URL, {
				method: 'POST',
				headers: { Authorization: `Bearer ${jwt}` },
				body: JSON.stringify(
					generateMinimalDevice({ lng: 7.6, lat: 51.9, height: 5 }),
				),
			})

			const response = (await action({
				request,
			} as Route.ActionArgs)) as Response
			const responseData = await response.json()
			if (responseData._id) createdDeviceIds.push(responseData._id)

			expect(response.status).toBe(201)
			expect(elevationLookup).not.toHaveBeenCalled()
			expect(responseData.heightAboveGround).toBe(5)
			expect(responseData.heightAboveSeaLevel).toBeNull()
			expect(responseData.terrainElevation).toBeNull()
			expect(responseData.terrainElevationDataset).toBeNull()
		})

		it('should reject a new box with invalid coords', async () => {
			function minimalSensebox(coords: number[]) {
				return {
					name: 'Test Box',
					location: coords,
					sensors: [],
				}
			}

			const requestBody = minimalSensebox([52])

			const request = new Request(BASE_URL, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${jwt}`,
				},
				body: JSON.stringify(requestBody),
			})

			try {
				await action({ request } as Route.ActionArgs)
			} catch (error) {
				if (error instanceof Response) {
					expect(error.status).toBe(422)

					const errorData = await error.json()
					expect(errorData.message).toBe(
						'Illegal value for parameter location. missing latitude or longitude in location [52]',
					)
				} else {
					throw error
				}
			}
		})

		it('should reject a new box without location field', async () => {
			// Arrange
			function minimalSensebox(coords: number[]): {
				name: string
				location?: number[]
				sensors: any[]
			} {
				return {
					name: 'Test Box',
					location: coords,
					sensors: [],
				}
			}

			const requestBody = minimalSensebox([52])
			delete requestBody.location

			const request = new Request(BASE_URL, {
				method: 'POST',
				headers: { Authorization: `Bearer ${jwt}` },

				body: JSON.stringify(requestBody),
			})

			// Act & Assert
			try {
				await action({
					request: request,
				} as Route.ActionArgs)
			} catch (error) {
				if (error instanceof Response) {
					expect(error.status).toBe(400)
					const errorData = await error.json()
					expect(errorData.message).toBe('missing required parameter location')
				} else {
					throw error
				}
			}
		})
	})

	describe('Method Not Allowed', () => {
		it('should return 405 for GET requests', async () => {
			const request = new Request(`${BASE_URL}/boxes`, {
				method: 'GET',
				headers: {
					Authorization: `Bearer ${jwt}`,
				},
			})

			const response = (await action({
				request,
			} as Route.ActionArgs)) as Response
			const body = await response.json()

			expect(response.status).toBe(405)
			expect(body).toHaveProperty('message', 'Method Not Allowed')
		})

		it('should return 405 for PUT requests', async () => {
			const request = new Request(`${BASE_URL}/boxes`, {
				method: 'PUT',
				headers: {
					Authorization: `Bearer ${jwt}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ name: 'Test' }),
			})

			const response = (await action({
				request,
			} as Route.ActionArgs)) as Response
			const body = await response.json()

			expect(response.status).toBe(405)
			expect(body).toHaveProperty('message', 'Method Not Allowed')
		})

		it('should return 405 for DELETE requests', async () => {
			const request = new Request(`${BASE_URL}/boxes`, {
				method: 'DELETE',
				headers: {
					Authorization: `Bearer ${jwt}`,
				},
			})

			const response = (await action({
				request,
			} as Route.ActionArgs)) as Response
			const body = await response.json()

			expect(response.status).toBe(405)
			expect(body).toHaveProperty('message', 'Method Not Allowed')
		})

		it('should return 405 for PATCH requests', async () => {
			const request = new Request(`${BASE_URL}/boxes`, {
				method: 'PATCH',
				headers: {
					Authorization: `Bearer ${jwt}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ name: 'Test' }),
			})

			const response = (await action({
				request,
			} as Route.ActionArgs)) as Response
			const body = await response.json()

			expect(response.status).toBe(405)
			expect(body).toHaveProperty('message', 'Method Not Allowed')
		})
	})
})

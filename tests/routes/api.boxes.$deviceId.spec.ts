import { generateTestUserCredentials } from 'tests/data/generate_test_user'
import invariant from 'tiny-invariant'
import { type Route } from '../../.react-router/types/app/routes/+types/api.boxes.$deviceId'
import { BASE_URL } from '../../vitest.setup'
import {
	createDevice,
	deleteDevice,
	updateDeviceLocation,
} from '~/db/models/device.server'
import { deleteUserByEmail } from '~/db/models/user.server'
import { type User, type Device } from '~/db/schema'
import { createToken } from '~/lib/jwt'
import {
	loader as deviceLoader,
	action as deviceAction,
} from '~/routes/api.boxes.$deviceId'
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

const DEVICE_TEST_USER = generateTestUserCredentials()

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

describe('openSenseMap API Routes: /boxes/:deviceId', () => {
	let user: User | null = null
	let jwt: string = ''
	let queryableDevice: Device

	beforeAll(async () => {
		const registration = await registerUser(
			DEVICE_TEST_USER.name,
			DEVICE_TEST_USER.email,
			DEVICE_TEST_USER.password,
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
		const { token: t } = await createToken(user as User)
		jwt = t

		queryableDevice = await createDevice(
			{
				...generateMinimalDevice(),
				latitude: 12,
				longitude: 123,
				tags: ['testgroup'],
				useAuth: false,
			},
			(user as User).id,
		)

		invariant(queryableDevice, 'Failed to create test device')
	})

	describe('GET', () => {
		let result: any

		beforeAll(async () => {
			// Arrange
			const request = new Request(`${BASE_URL}/${queryableDevice!.id}`, {
				method: 'GET',
				headers: { 'Content-Type': 'application/json' },
			})

			// Act
			const dataFunctionValue = await deviceLoader({
				params: {
					deviceId: queryableDevice.id,
				},
			} as Route.LoaderArgs)
			const response = dataFunctionValue as Response

			// Assert initial response
			expect(dataFunctionValue).toBeInstanceOf(Response)
			expect(response.status).toBe(200)
			expect(response.headers.get('content-type')).toBe(
				'application/json; charset=utf-8',
			)

			// Get the body for subsequent tests
			result = await response.json()
		})

		it('should return the device with correct location data', () => {
			expect(result).toBeDefined()
			expect(result._id || result.id).toBe(queryableDevice?.id)
			expect(result.latitude).toBeDefined()
			expect(result.longitude).toBeDefined()
			expect(result.latitude).toBe(queryableDevice?.latitude)
			expect(result.longitude).toBe(queryableDevice?.longitude)
		})

		it('should return the device name and model', () => {
			expect(result.name).toBe(queryableDevice?.name)
			expect(result.model).toBe('homeV2Ethernet')
			expect(result.exposure).toBe('mobile')
		})

		it('should return the creation timestamp', () => {
			expect(result.createdAt).toBeDefined()
			expect(result.createdAt).toBe(queryableDevice?.createdAt.toISOString())
		})

		it('should NOT return sensitive data (if any)', () => {
			// Add assertions for fields that shouldn't be returned
			// For example, if there are internal fields that shouldn't be exposed:
			// expect(result.internalField).toBeUndefined()
		})
	})

	describe('PUT', () => {
		it('should allow to update the device via PUT', async () => {
			const update_payload = {
				name: 'neuername',
				exposure: 'indoor',
				grouptag: 'testgroup',
				description: 'total neue beschreibung',
				location: { lat: 54.2, lng: 21.1, height: 45.75 },
				weblink: 'http://www.google.de',
				useAuth: true,
				image:
					'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVQYV2NgYAAAAAMAAWgmWQ0AAAAASUVORK5CYII=',
			}

			const request = new Request(`${BASE_URL}/${queryableDevice?.id}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${jwt}`,
				},
				body: JSON.stringify(update_payload),
			})

			const response = await deviceAction({
				request,
				params: { deviceId: queryableDevice?.id },
			} as Route.ActionArgs as Route.ActionArgs)
			const data = await response.json()
			const expectedHeight =
				TEST_TERRAIN_ELEVATION + update_payload.location.height

			expect(response.status).toBe(200)
			expect(data.name).toBe(update_payload.name)
			expect(data.exposure).toBe(update_payload.exposure)
			expect(Array.isArray(data.grouptag)).toBe(true)
			expect(data.grouptag).toContain(update_payload.grouptag)
			expect(data.description).toBe(update_payload.description)
			expect(data.access_token).not.toBeNull()
			expect(data.height).toBe(expectedHeight)
			expect(data.heightAboveGround).toBe(update_payload.location.height)
			expect(data.heightAboveSeaLevel).toBe(expectedHeight)
			expect(data.terrainElevation).toBe(TEST_TERRAIN_ELEVATION)
			expect(data.terrainElevationDataset).toBe(TEST_ELEVATION_DATASET)
			expect(data.currentLocation).toEqual({
				type: 'Point',
				coordinates: [
					update_payload.location.lng,
					update_payload.location.lat,
					expectedHeight,
				],
				timestamp: expect.any(String),
			})

			expect(data.loc).toEqual([
				{
					type: 'Feature',
					geometry: {
						type: 'Point',
						coordinates: [
							update_payload.location.lng,
							update_payload.location.lat,
							expectedHeight,
						],
						timestamp: expect.any(String),
					},
				},
			])
		})

		it('should preserve above-ground height and recalculate sea-level height when coordinates change', async () => {
			await updateDeviceLocation({
				id: queryableDevice.id,
				latitude: queryableDevice.latitude,
				longitude: queryableDevice.longitude,
				heightAboveGround: 7.5,
				terrainElevation: 25,
				terrainElevationDataset: 'mapzen',
			})

			const update_payload = {
				name: 'neuername',
				exposure: 'outdoor',
				grouptag: ['testgroup'],
				description: 'total neue beschreibung',
				location: { lat: 54.2, lng: 21.1 },
				weblink: 'http://www.google.de',
				image:
					'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVQYV2NgYAAAAAMAAWgmWQ0AAAAASUVORK5CYII=',
			}

			const request = new Request(`${BASE_URL}/${queryableDevice?.id}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${jwt}`,
				},
				body: JSON.stringify(update_payload),
			})

			const response = await deviceAction({
				request,
				params: { deviceId: queryableDevice?.id },
			} as Route.ActionArgs as Route.ActionArgs)

			expect(response.status).toBe(200)

			const data = await response.json()
			expect(data.name).toBe(update_payload.name)
			expect(data.exposure).toBe(update_payload.exposure)

			expect(Array.isArray(data.grouptag)).toBe(true)
			expect(data.grouptag).toEqual(update_payload.grouptag)

			expect(data.description).toBe(update_payload.description)
			const expectedHeight = TEST_TERRAIN_ELEVATION + 7.5
			expect(data.heightAboveGround).toBe(7.5)
			expect(data.heightAboveSeaLevel).toBe(expectedHeight)
			expect(data.terrainElevation).toBe(TEST_TERRAIN_ELEVATION)
			expect(data.terrainElevationDataset).toBe(TEST_ELEVATION_DATASET)
			expect(data.height).toBe(expectedHeight)
			expect(data.currentLocation.coordinates).toEqual([
				update_payload.location.lng,
				update_payload.location.lat,
				expectedHeight,
			])
			expect(data.loc[0].geometry.coordinates).toEqual([
				update_payload.location.lng,
				update_payload.location.lat,
				expectedHeight,
			])

			//TODO: this fails, check if we actually need timestamps in images
			// const parts = data.image.split('_')
			// const ts36 = parts[1].replace('.png', '')
			// const tsMs = parseInt(ts36, 36) * 1000
			// expect(Date.now() - tsMs).toBeLessThan(1000)
		})

		it('should convert a zero above-ground height via PUT', async () => {
			const updatePayload = {
				location: { lat: 52.52, lng: 13.405, height: 0 },
			}

			const request = new Request(`${BASE_URL}/${queryableDevice.id}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${jwt}`,
				},
				body: JSON.stringify(updatePayload),
			})

			const response = await deviceAction({
				request,
				params: { deviceId: queryableDevice.id },
			} as Route.ActionArgs)
			const data = await response.json()

			expect(response.status).toBe(200)
			expect(data.height).toBe(TEST_TERRAIN_ELEVATION)
			expect(data.heightAboveGround).toBe(0)
			expect(data.heightAboveSeaLevel).toBe(TEST_TERRAIN_ELEVATION)
			expect(data.terrainElevation).toBe(TEST_TERRAIN_ELEVATION)
			expect(data.terrainElevationDataset).toBe(TEST_ELEVATION_DATASET)
			expect(data.currentLocation.coordinates).toEqual([
				13.405,
				52.52,
				TEST_TERRAIN_ELEVATION,
			])
			expect(data.loc[0].geometry.coordinates).toEqual([
				13.405,
				52.52,
				TEST_TERRAIN_ELEVATION,
			])

			const getResponse = (await deviceLoader({
				params: { deviceId: queryableDevice.id },
			} as Route.LoaderArgs)) as Response
			const persisted = await getResponse.json()

			expect(getResponse.status).toBe(200)
			expect(persisted.height).toBe(TEST_TERRAIN_ELEVATION)
			expect(persisted.heightAboveGround).toBe(0)
			expect(persisted.heightAboveSeaLevel).toBe(TEST_TERRAIN_ELEVATION)
			expect(persisted.terrainElevation).toBe(TEST_TERRAIN_ELEVATION)
			expect(persisted.terrainElevationDataset).toBe(TEST_ELEVATION_DATASET)
			expect(persisted.currentLocation.coordinates).toEqual([
				13.405,
				52.52,
				TEST_TERRAIN_ELEVATION,
			])
		})

		it('should retain height above ground when elevation lookup fails', async () => {
			vi.mocked(getTerrainElevation).mockRejectedValueOnce(
				new Error('Elevation unavailable'),
			)
			const updatePayload = {
				location: { lat: 54.18, lng: 7.89, height: 5 },
			}
			const request = new Request(`${BASE_URL}/${queryableDevice.id}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${jwt}`,
				},
				body: JSON.stringify(updatePayload),
			})

			const response = await deviceAction({
				request,
				params: { deviceId: queryableDevice.id },
			} as Route.ActionArgs)
			const responseData = await response.json()

			expect(response.status).toBe(200)
			expect(responseData.heightAboveGround).toBe(5)
			expect(responseData.heightAboveSeaLevel).toBeNull()
			expect(responseData.terrainElevation).toBeNull()
			expect(responseData.terrainElevationDataset).toBeNull()
			expect(responseData.height).toBeNull()
			expect(responseData.currentLocation.coordinates).toEqual([7.89, 54.18])
		})

		it('should not request elevation without consent', async () => {
			vi.mocked(applyElevationConsentChoice).mockResolvedValueOnce(false)
			const elevationLookup = vi.mocked(getTerrainElevation)
			elevationLookup.mockClear()
			const updatePayload = {
				location: { lat: 54.18, lng: 7.89, height: 5 },
				elevationLookupConsent: false,
			}
			const request = new Request(`${BASE_URL}/${queryableDevice.id}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${jwt}`,
				},
				body: JSON.stringify(updatePayload),
			})

			const response = await deviceAction({
				request,
				params: { deviceId: queryableDevice.id },
			} as Route.ActionArgs)
			const responseData = await response.json()

			expect(response.status).toBe(200)
			expect(elevationLookup).not.toHaveBeenCalled()
			expect(responseData.heightAboveGround).toBe(5)
			expect(responseData.heightAboveSeaLevel).toBeNull()
			expect(responseData.terrainElevation).toBeNull()
			expect(responseData.terrainElevationDataset).toBeNull()
		})

		it('should remove image when deleteImage=true', async () => {
			const update_payload = {
				deleteImage: true,
			}

			const request = new Request(`${BASE_URL}/${queryableDevice?.id}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${jwt}`,
				},
				body: JSON.stringify(update_payload),
			})

			const response = await deviceAction({
				request,
				params: { deviceId: queryableDevice?.id },
			} as Route.ActionArgs)

			expect(response.status).toBe(200)
			const data = await response.json()
			expect(data.image).toBeNull()
		})

		it('should nullify description when set to empty string', async () => {
			const update_payload = {
				description: '',
			}

			const request = new Request(`${BASE_URL}/${queryableDevice?.id}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${jwt}`,
				},
				body: JSON.stringify(update_payload),
			})

			const response = await deviceAction({
				request,
				params: { deviceId: queryableDevice?.id },
			} as Route.ActionArgs)

			expect(response.status).toBe(200)
			const data = await response.json()
			expect(data.description).toBeNull()
		})

		it('should clear group tags when empty array provided', async () => {
			const update_payload = {
				grouptag: [],
			}

			const request = new Request(`${BASE_URL}/${queryableDevice?.id}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${jwt}`,
				},
				body: JSON.stringify(update_payload),
			})

			const response = await deviceAction({
				request,
				params: { deviceId: queryableDevice?.id },
			} as Route.ActionArgs)

			expect(response.status).toBe(200)
			const data = await response.json()
			expect(data.grouptag).toHaveLength(0)
		})

		it('should merge addons.add into grouptags', async () => {
			const update_payload = {
				addons: { add: 'feinstaub' },
				grouptag: ['existinggroup'],
			}

			const request = new Request(`${BASE_URL}/${queryableDevice?.id}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${jwt}`,
				},
				body: JSON.stringify(update_payload),
			})

			const response = await deviceAction({
				request,
				params: { deviceId: queryableDevice?.id },
			} as Route.ActionArgs)

			expect(response.status).toBe(200)
			const data = await response.json()

			expect(Array.isArray(data.grouptag)).toBe(true)
			expect(data.grouptag).toContain('existinggroup')
			expect(data.grouptag).toContain('feinstaub')
		})

		it('should accept multi-valued grouptag array', async () => {
			const update_payload = {
				grouptag: ['tag1', 'tag2', 'tag3'],
			}

			const request = new Request(`${BASE_URL}/${queryableDevice?.id}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${jwt}`,
				},
				body: JSON.stringify(update_payload),
			})

			const response = await deviceAction({
				request,
				params: { deviceId: queryableDevice?.id },
			} as Route.ActionArgs)

			expect(response.status).toBe(200)
			const data = await response.json()
			expect(data.grouptag).toEqual(
				expect.arrayContaining(['tag1', 'tag2', 'tag3']),
			)
		})
	})

	describe('DELETE', () => {
		let deletableDevice: Device | null = null

		beforeAll(async () => {
			deletableDevice = await createDevice(
				{ ...generateMinimalDevice(), latitude: 123, longitude: 12 },
				user!.id,
			)
		})

		it('should deny deletion with incorrect password', async () => {
			const badDeleteRequest = new Request(
				`${BASE_URL}/${queryableDevice?.id}`,
				{
					method: 'DELETE',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${jwt}`,
					},
					body: JSON.stringify({ password: 'wrong password' }),
				},
			)

			const badDeleteResponse = await deviceAction({
				request: badDeleteRequest,
				params: { deviceId: queryableDevice?.id },
			} as Route.ActionArgs)

			expect(badDeleteResponse).toBeInstanceOf(Response)
			expect(badDeleteResponse.status).toBe(401)
			expect(badDeleteResponse.headers.get('content-type')).toBe(
				'application/json; charset=utf-8',
			)

			const badResult = await badDeleteResponse.json()
			expect(badResult.message).toBe('Password incorrect')
		})

		it('should successfully delete the device with correct password', async () => {
			const validDeleteRequest = new Request(
				`${BASE_URL}/${deletableDevice?.id}`,
				{
					method: 'DELETE',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${jwt}`,
					},
					body: JSON.stringify({ password: DEVICE_TEST_USER.password }),
				},
			)

			const validDeleteResponse = await deviceAction({
				request: validDeleteRequest,
				params: { deviceId: deletableDevice?.id },
			} as Route.ActionArgs)

			expect(validDeleteResponse).toBeInstanceOf(Response)
			expect(validDeleteResponse.status).toBe(200)
			expect(validDeleteResponse.headers.get('content-type')).toBe(
				'application/json; charset=utf-8',
			)
		})

		it('should return 404 when trying to get the deleted device', async () => {
			const getDeletedRequest = new Request(
				`${BASE_URL}/${deletableDevice?.id}`,
				{
					method: 'GET',
					headers: { 'Content-Type': 'application/json' },
				},
			)

			const getDeletedResponse = await deviceLoader({
				params: {
					deviceId: deletableDevice?.id,
				},
			} as Route.LoaderArgs)
			expect(getDeletedResponse).toBeInstanceOf(Response)
			expect(getDeletedResponse.status).toBe(404)
			expect(getDeletedResponse.headers.get('content-type')).toBe(
				'application/json; charset=utf-8',
			)
		})
	})

	afterAll(async () => {
		await deleteDevice({ id: queryableDevice!.id })
		await deleteUserByEmail(DEVICE_TEST_USER.email)
	})
})

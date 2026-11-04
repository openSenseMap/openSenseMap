import { eq } from 'drizzle-orm'
import { generateTestUserCredentials } from 'tests/data/generate_test_user'
import { describe, it, expect, beforeAll } from 'vite-plus/test'
import { type Route } from '../../.react-router/types/app/routes/+types/api.boxes.data'
import { BASE_URL } from '../../vitest.setup'
import { createDevice, deleteDevice } from '~/db/models/device.server'
import { deleteUserByEmail } from '~/db/models/user.server'
import { device, measurement, sensor } from '~/db/schema'
import { drizzleClient } from '~/db.server'
import { createToken } from '~/lib/jwt'
import { loader as boxesDataLoader } from '~/routes/api.boxes.data'
import { registerUser } from '~/services/user-service.server'

const BOXES_DATA_TEST_USER = generateTestUserCredentials()

const TEST_BOX = {
	name: 'Download Box',
	exposure: 'indoor' as const,
	expiresAt: null,
	tags: [],
	latitude: 51.5,
	longitude: 7.5,
	model: 'luftdaten.info' as const,
	mqttEnabled: false,
	ttnEnabled: false,
}

describe('openSenseMap API: /boxes/data', () => {
	let jwt = ''
	let deviceId = ''
	let outdoorDeviceId = ''
	let sensorId = ''

	const expectedMeasurementsCount = 10

	beforeAll(async () => {
		await deleteUserByEmail(BOXES_DATA_TEST_USER.email)

		const registration = await registerUser(
			BOXES_DATA_TEST_USER.name,
			BOXES_DATA_TEST_USER.email,
			BOXES_DATA_TEST_USER.password,
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
		const t = await createToken(user)
		jwt = t.token

		const device = await createDevice(TEST_BOX, user.id)
		deviceId = device.id

		const outdoorDevice = await createDevice(
			{
				...TEST_BOX,
				name: 'Download Box Outdoor',
				exposure: 'outdoor',
			},
			user.id,
		)
		outdoorDeviceId = outdoorDevice.id

		const [outdoorSensor] = await drizzleClient
			.insert(sensor)
			.values({
				title: 'Temperatur',
				unit: '°C',
				sensorType: 'HDC1080',
				deviceId: outdoorDevice.id,
				status: 'active',
			})
			.returning()

		const outdoorMeasurements = []
		for (let i = 0; i < 5; i++) {
			outdoorMeasurements.push({
				sensorId: outdoorSensor.id,
				time: new Date(Date.now() - i * 60000),
				value: 15 + Math.random() * 5,
			})
		}

		await drizzleClient.insert(measurement).values(outdoorMeasurements)

		const [createdSensor] = await drizzleClient
			.insert(sensor)
			.values({
				title: 'Temperatur',
				unit: '°C',
				sensorType: 'HDC1080',
				deviceId: device.id,
				status: 'active',
			})
			.returning()

		sensorId = createdSensor.id

		// Create test measurements
		const now = new Date()
		const measurements = []
		for (let i = 0; i < expectedMeasurementsCount; i++) {
			measurements.push({
				sensorId: sensorId,
				time: new Date(now.getTime() - i * 60000), // 1 minute apart
				value: 20 + Math.random() * 10, // 20-30°C
			})
		}

		await drizzleClient.insert(measurement).values(measurements)
	})

	// ---------------------------
	// CSV (default)
	// ---------------------------
	it('GET /boxes/data CSV', async () => {
		const url = `${BASE_URL}/api/boxes/data?boxid=${deviceId}&phenomenon=Temperatur`
		const req = new Request(url, {
			headers: { Authorization: `Bearer ${jwt}` },
		})

		const res = await boxesDataLoader({ request: req } as Route.LoaderArgs)
		const text = await res.text()

		expect(res.status).toBe(200)
		expect(text).not.toBe('')
		expect(res.headers.get('content-type')).toBe('text/csv; charset=utf-8')

		// Check that CSV has header and data rows
		const lines = text.trim().split('\n')
		expect(lines.length).toBeGreaterThan(1) // At least header + 1 data row
	})

	it('GET /boxes/data CSV with format=csv', async () => {
		const url = `${BASE_URL}/api/boxes/data?boxid=${deviceId}&phenomenon=Temperatur&format=csv`
		const req = new Request(url, {
			headers: { Authorization: `Bearer ${jwt}` },
		})

		const res = await boxesDataLoader({ request: req } as Route.LoaderArgs)
		const text = await res.text()

		expect(res.status).toBe(200)
		expect(text).not.toBe('')
		expect(res.headers.get('content-type')).toBe('text/csv; charset=utf-8')
	})

	// ---------------------------
	// JSON
	// ---------------------------
	it('GET /boxes/data JSON', async () => {
		const url = `${BASE_URL}/api/boxes/data?boxid=${deviceId}&phenomenon=Temperatur&format=json&columns=sensorId,value,lat,lon`
		const req = new Request(url, {
			headers: { Authorization: `Bearer ${jwt}` },
		})

		const res = await boxesDataLoader({ request: req } as Route.LoaderArgs)

		expect(res.status).toBe(200)
		expect(res.headers.get('content-type')).toBe(
			'application/json; charset=utf-8',
		)

		const body = await res.json()
		expect(Array.isArray(body)).toBe(true)
		expect(body.length).toBeGreaterThan(0)

		for (const m of body) {
			expect(m.sensorId).toBeDefined()
			expect(m.value).toBeDefined()
			expect(m.lat).toBeDefined()
			expect(m.lon).toBeDefined()
		}
	})

	// ---------------------------
	// Multiple box IDs
	// ---------------------------
	it('GET /boxes/data CSV with multiple boxids', async () => {
		const url = `${BASE_URL}/api/boxes/data?boxid=${deviceId},${deviceId}&phenomenon=Temperatur`
		const req = new Request(url, {
			headers: { Authorization: `Bearer ${jwt}` },
		})

		const res = await boxesDataLoader({ request: req } as Route.LoaderArgs)
		const text = await res.text()
		const lines = text.trim().split('\n').slice(1) // Skip header

		expect(res.status).toBe(200)
		expect(lines).toHaveLength(expectedMeasurementsCount)
	})

	// ---------------------------
	// POST CSV
	// ---------------------------
	it('POST /boxes/data CSV', async () => {
		const req = new Request(
			`${BASE_URL}/boxes/data?boxid=${deviceId}&phenomenon=Temperatur`,
			{
				method: 'POST',
				headers: {
					Authorization: `Bearer ${jwt}`,
				},
			},
		)

		const res = await boxesDataLoader({ request: req } as Route.LoaderArgs)

		const text = (await res.text()).trim()
		const lines = text.split('\n').slice(1)

		expect(res.status).toBe(200)
		expect(lines).toHaveLength(expectedMeasurementsCount)
	})

	// ---------------------------
	// Exposure filtering
	// ---------------------------
	it('GET /boxes/data with exposure filter', async () => {
		const from = new Date(Date.now() - 100 * 864e5).toISOString()
		const to = new Date().toISOString()

		const req = new Request(
			`${BASE_URL}/boxes/data/?bbox=-180,-90,180,90&phenomenon=Temperatur&exposure=indoor&columns=exposure&from-date=${from}&to-date=${to}`,
			{ headers: { Authorization: `Bearer ${jwt}` } },
		)

		const res = await boxesDataLoader({ request: req } as Route.LoaderArgs)
		const text = (await res.text()).trim()
		const [header, ...lines] = text.split('\n')

		expect(res.status).toBe(200)
		expect(header).toBe('exposure')
		expect(lines).toHaveLength(expectedMeasurementsCount)

		for (const line of lines.slice(0, -1)) {
			expect(line).toBe('indoor')
		}
	})

	it('GET /boxes/data with multiple exposure filters', async () => {
		const from = new Date(Date.now() - 100 * 864e5).toISOString()
		const to = new Date().toISOString()

		const url =
			`${BASE_URL}/boxes/data/?` +
			`bbox=-180,-90,180,90` +
			`&phenomenon=Temperatur` +
			`&exposure=indoor,outdoor` +
			`&columns=exposure` +
			`&from-date=${from}` +
			`&to-date=${to}`

		const req = new Request(url, {
			headers: { Authorization: `Bearer ${jwt}` },
		})

		const res = await boxesDataLoader({ request: req } as Route.LoaderArgs)

		expect(res.status).toBe(200)
		expect(res.headers.get('content-type')).toBe('text/csv; charset=utf-8')

		const text = (await res.text()).trim()
		const [header, ...lines] = text.split('\n')

		expect(header).toBe('exposure')

		expect(lines).toHaveLength(expectedMeasurementsCount + 5)

		let sawIndoor = false
		let sawOutdoor = false

		for (const line of lines.slice(0, -1)) {
			if (line === 'indoor') sawIndoor = true
			if (line === 'outdoor') sawOutdoor = true
			if (sawIndoor && sawOutdoor) break
		}

		expect(sawIndoor).toBe(true)
		expect(sawOutdoor).toBe(true)
	})

	// ---------------------------
	// content-disposition header
	// ---------------------------
	it('GET /boxes/data should include content-disposition by default', async () => {
		const req = new Request(
			`${BASE_URL}/boxes/data/?boxid=${deviceId},${deviceId}&phenomenon=Temperatur`,
			{ headers: { Authorization: `Bearer ${jwt}` } },
		)

		const res = await boxesDataLoader({ request: req } as Route.LoaderArgs)
		const cd = res.headers.get('content-disposition')

		expect(cd).toMatch(/opensensemap_org-download-Temperatur/)
	})

	it('GET /boxes/data should NOT include content-disposition when download=false', async () => {
		const req = new Request(
			`${BASE_URL}/boxes/data/?boxid=${deviceId},${deviceId}&phenomenon=Temperatur&download=false`,
			{ headers: { Authorization: `Bearer ${jwt}` } },
		)

		const res = await boxesDataLoader({ request: req } as Route.LoaderArgs)

		const cd = res.headers.get('content-disposition')

		expect(cd).toBeNull()
	})

	// ---------------------------
	// Bounding box validation
	// ---------------------------
	it('GET /boxes/data invalid bbox (too many values)', async () => {
		const req = new Request(
			`${BASE_URL}/boxes/data/?boxid=${deviceId}&phenomenon=Temperatur&bbox=1,2,3,4,5`,
			{ headers: { Authorization: `Bearer ${jwt}` } },
		)

		let res: Response
		try {
			res = await boxesDataLoader({ request: req } as Route.LoaderArgs)
		} catch (response) {
			res = response as Response
		}

		expect(res.status).toBe(422)

		const json = await res.json()
		expect(json.code).toBe('Unprocessable Content')
	})

	it('should allow to specify bounding boxes with area greater than a single hemisphere', async () => {
		const req = new Request(
			`${BASE_URL}/boxes/data/?phenomenon=Temperatur&bbox=-180,-90,180,90`,
		)

		const res = await boxesDataLoader({ request: req } as Route.LoaderArgs)

		expect(res.status).toBe(200)

		expect(res.headers.get('content-type')).toContain('text/csv; charset=utf-8')

		const bodyText = await res.text()

		const lines = bodyText.split('\n')
		expect(lines.length).toBeGreaterThan(1)
	})

	it('GET /boxes/data invalid bbox (too few values)', async () => {
		const req = new Request(
			`${BASE_URL}/boxes/data/?boxid=${deviceId}&phenomenon=Temperatur&bbox=1,2,3`,
			{ headers: { Authorization: `Bearer ${jwt}` } },
		)

		let res: Response
		try {
			res = await boxesDataLoader({ request: req } as Route.LoaderArgs)
		} catch (response) {
			res = response as Response
		}

		expect(res.status).toBe(422)
	})

	it('GET /boxes/data invalid bbox (not floats)', async () => {
		const req = new Request(
			`${BASE_URL}/boxes/data/?boxid=${deviceId}&phenomenon=Temperatur&bbox=1,2,east,4`,
			{ headers: { Authorization: `Bearer ${jwt}` } },
		)

		let res: Response
		try {
			res = await boxesDataLoader({ request: req } as Route.LoaderArgs)
		} catch (response) {
			res = response as Response
		}

		expect(res.status).toBe(422)
	})

	it('GET /boxes/data JSON by grouptag', async () => {
		const GROUPTAG = 'bytag'

		// Add tag to device
		await drizzleClient
			.update(device)
			.set({ tags: [GROUPTAG] })
			.where(eq(device.id, deviceId))

		const url = `${BASE_URL}/api/boxes/data?grouptag=${GROUPTAG}&format=json&columns=sensorId,value&phenomenon=Temperatur`
		const req = new Request(url, {
			headers: { Authorization: `Bearer ${jwt}` },
		})

		const res = await boxesDataLoader({ request: req } as Route.LoaderArgs)

		expect(res.status).toBe(200)
		expect(res.headers.get('content-type')).toBe(
			'application/json; charset=utf-8',
		)

		const body = await res.json()
		expect(Array.isArray(body)).toBe(true)
		expect(body).toHaveLength(expectedMeasurementsCount)
	})

	afterAll(async () => {
		await deleteDevice({ id: deviceId })
		await deleteDevice({ id: outdoorDeviceId })
		await deleteUserByEmail(BOXES_DATA_TEST_USER.email)
	})
})

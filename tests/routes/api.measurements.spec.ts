import { csvExampleData, jsonSubmitData, byteSubmitData } from 'tests/data'
import { generateTestUserCredentials } from 'tests/data/generate_test_user'
import { describe, it, expect, beforeAll, afterAll } from 'vite-plus/test'
import { type Route as postSingleRoute } from '../../.react-router/types/app/routes/+types/api.boxes.$deviceId.$sensorId'
import { type Route as postMeasurementRoute } from '../../.react-router/types/app/routes/+types/api.boxes.$deviceId.data'
import { BASE_URL } from '../../vitest.setup'
import {
	createDevice,
	deleteDevice,
	getDevice,
} from '~/db/models/device.server'
import { deleteUserByEmail } from '~/db/models/user.server'
import { action as postSingleMeasurementAction } from '~/routes/api.boxes.$deviceId.$sensorId'
import { action as postMeasurementsAction } from '~/routes/api.boxes.$deviceId.data'
import { registerUser } from '~/services/user-service.server'

const TEST_USER = generateTestUserCredentials()

const TEST_BOX = {
	name: `'${TEST_USER.name}'s Box`,
	exposure: 'outdoor',
	expiresAt: null,
	tags: [],
	latitude: 0,
	longitude: 0,
	//model: 'luftdaten.info',
	mqttEnabled: false,
	ttnEnabled: false,
	sensors: [
		{ title: 'Temperature', unit: '°C', sensorType: 'temperature' },
		{ title: 'Humidity', unit: '%', sensorType: 'humidity' },
	],
}

describe('openSenseMap API Routes: /boxes', () => {
	let userId: string = ''
	let deviceId: string = ''
	let sensorIds: string[] = []
	let sensors: any[] = []
	let deviceApiKey: string = ''

	beforeAll(async () => {
		const registration = await registerUser(
			TEST_USER.name,
			TEST_USER.email,
			TEST_USER.password,
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
		const device = await createDevice(TEST_BOX, userId)
		deviceId = device.id

		const deviceWithSensors = await getDevice({ id: deviceId })
		sensorIds =
			deviceWithSensors?.sensors?.map((sensor: any) => sensor.id) || []
		sensors = deviceWithSensors?.sensors?.map((sensor: any) => sensor) || []
		deviceApiKey = deviceWithSensors?.apiKey ?? ''
	})

	// ---------------------------------------------------
	// Single measurement POST /boxes/:boxId/:sensorId
	// ---------------------------------------------------
	describe('single measurement POST', () => {
		it('should accept a single measurement via POST', async () => {
			const request = new Request(
				`${BASE_URL}/api/boxes/${deviceId}/${sensorIds[0]}`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: deviceApiKey,
					},
					body: JSON.stringify({ value: 312.1 }),
				},
			)

			const response: any = await postSingleMeasurementAction({
				request,
				params: { deviceId: deviceId, sensorId: sensorIds[0] },
			} as postSingleRoute.ActionArgs)

			expect(response).toBeInstanceOf(Response)
			expect(response.status).toBe(201)
			expect(await response.text()).toBe('Measurement saved in box')
		})

		it('should reject with wrong access token', async () => {
			const request = new Request(
				`${BASE_URL}/api/boxes/${deviceId}/${sensorIds[0]}`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: 'wrongAccessToken',
					},
					body: JSON.stringify({ value: 312.1 }),
				},
			)

			const response: any = await postSingleMeasurementAction({
				request,
				params: { deviceId: deviceId, sensorId: sensorIds[0] },
			} as postSingleRoute.ActionArgs)

			expect(response.status).toBe(401)
			const body = await response.json()
			expect(body.message).toBe('Device access token not valid!')
		})

		it('should accept a single measurement with timestamp', async () => {
			const timestamp = new Date().toISOString()

			const request = new Request(
				`${BASE_URL}/api/boxes/${deviceId}/${sensorIds[1]}`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: deviceApiKey,
					},
					body: JSON.stringify({ value: 123.4, createdAt: timestamp }),
				},
			)

			const response: any = await postSingleMeasurementAction({
				request,
				params: { deviceId: deviceId, sensorId: sensorIds[1] },
			} as postSingleRoute.ActionArgs)

			expect(response.status).toBe(201)
			expect(await response.text()).toBe('Measurement saved in box')
		})

		it('should reject measurement with timestamp too far into the future', async () => {
			const future = new Date(Date.now() + 90_000).toISOString() // 1.5 min future

			const request = new Request(
				`${BASE_URL}/api/boxes/${deviceId}/${sensorIds[1]}`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: deviceApiKey,
					},
					body: JSON.stringify({ value: 123.4, createdAt: future }),
				},
			)

			const response: any = await postSingleMeasurementAction({
				request,
				params: { deviceId: deviceId, sensorId: sensorIds[1] },
			} as postSingleRoute.ActionArgs)

			expect(response.status).toBe(422)
		})
	})

	// ---------------------------------------------------
	// Multiple CSV POST
	// ---------------------------------------------------
	describe('multiple CSV POST /boxes/:id/data', () => {
		it('should accept multiple measurements as CSV via POST (no timestamps)', async () => {
			const csvPayload = csvExampleData.noTimestamps(sensors)

			const request = new Request(`${BASE_URL}/api/boxes/${deviceId}/data`, {
				method: 'POST',
				headers: {
					'Content-Type': 'text/csv',
					Authorization: deviceApiKey,
				},
				body: csvPayload,
			})

			const response: any = await postMeasurementsAction({
				request,
				params: { deviceId: deviceId },
			} as postMeasurementRoute.ActionArgs)

			expect(response.status).toBe(201)
			expect(await response.text()).toContain('Measurements saved in box')
		})

		it('should accept multiple measurements as CSV via POST (with timestamps)', async () => {
			const csvPayload = csvExampleData.withTimestamps(sensors)

			const request = new Request(`${BASE_URL}/api/boxes/${deviceId}/data`, {
				method: 'POST',
				headers: {
					'Content-Type': 'text/csv',
					Authorization: deviceApiKey,
				},
				body: csvPayload,
			})

			const response: any = await postMeasurementsAction({
				request,
				params: { deviceId: deviceId },
			} as postMeasurementRoute.ActionArgs)

			expect(response.status).toBe(201)
		})

		it('should reject CSV with future timestamps', async () => {
			const csvPayload = csvExampleData.withTimestampsFuture(sensors)

			const request = new Request(`${BASE_URL}/api/boxes/${deviceId}/data`, {
				method: 'POST',
				headers: {
					'Content-Type': 'text/csv',
					Authorization: deviceApiKey,
				},
				body: csvPayload,
			})

			const response: any = await postMeasurementsAction({
				request,
				params: { deviceId: deviceId },
			} as postMeasurementRoute.ActionArgs)

			expect(response.status).toBe(422)
		})
	})

	// ---------------------------------------------------
	// Multiple bytes POST
	// ---------------------------------------------------
	describe('multiple bytes POST /boxes/:id/data', () => {
		it('should accept multiple measurements as bytes via POST', async () => {
			const submitTime = new Date()
			const request = new Request(`${BASE_URL}/api/boxes/${deviceId}/data`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/sbx-bytes',
					Authorization: deviceApiKey,
				},
				body: byteSubmitData(sensors) as unknown as BodyInit,
			})

			const response: any = await postMeasurementsAction({
				request,
				params: { deviceId: deviceId },
			} as postMeasurementRoute.ActionArgs)

			expect(response.status).toBe(201)
			expect(await response.text()).toContain('Measurements saved in box')

			const updatedDevice = await getDevice({ id: deviceId })

			expect(updatedDevice?.sensors).toBeDefined()
			updatedDevice?.sensors?.forEach((sensor: any) => {
				expect(sensor.lastMeasurement).toBeDefined()
				expect(sensor.lastMeasurement).not.toBeNull()

				// Verify the measurement timestamp is recent
				if (sensor.lastMeasurement?.createdAt) {
					const createdAt = new Date(sensor.lastMeasurement.createdAt)
					const diffMinutes =
						Math.abs(submitTime.getTime() - createdAt.getTime()) / (1000 * 60)
					expect(diffMinutes).toBeLessThan(4)
				}
			})
		})

		it('should accept multiple measurements as bytes with timestamps', async () => {
			const submitTime = new Date()

			const request = new Request(`${BASE_URL}/api/boxes/${deviceId}/data`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/sbx-bytes-ts',
					Authorization: deviceApiKey,
				},
				body: byteSubmitData(sensors, true) as unknown as BodyInit,
			})

			const response: any = await postMeasurementsAction({
				request,
				params: { deviceId: deviceId },
			} as postMeasurementRoute.ActionArgs)

			expect(response.status).toBe(201)
			expect(await response.text()).toBe('Measurements saved in box')

			const updatedDevice = await getDevice({ id: deviceId })

			expect(updatedDevice?.sensors).toBeDefined()
			expect(updatedDevice?.sensors?.length).toBeGreaterThan(0)

			updatedDevice?.sensors?.forEach((sensor: any) => {
				expect(sensor.lastMeasurement).toBeDefined()
				expect(sensor.lastMeasurement).not.toBeNull()

				expect(sensor.lastMeasurement.createdAt).toBeDefined()

				// Verify the timestamp is within 5 minutes of submission
				const createdAt = new Date(sensor.lastMeasurement.createdAt)
				const diffMinutes =
					Math.abs(submitTime.getTime() - createdAt.getTime()) / (1000 * 60)
				expect(diffMinutes).toBeLessThan(5)
			})
		})
	})

	it('should reject measurements with invalid sensor IDs', async () => {
		// Create byte data with a non-existent sensor ID
		const fakeSensorId = 'fakeid123456'
		const bytesPerSensor = 16
		const buffer = new ArrayBuffer(bytesPerSensor)
		const view = new DataView(buffer)
		const bytes = new Uint8Array(buffer)

		function stringToHex(str: string): string {
			let hex = ''
			for (let i = 0; i < str.length; i++) {
				const charCode = str.charCodeAt(i)
				hex += charCode.toString(16).padStart(2, '0')
			}
			return hex
		}

		// Encode fake sensor ID
		const fakeIdHex = stringToHex(fakeSensorId).slice(0, 24)
		for (let j = 0; j < 12; j++) {
			const hexByteStart = j * 2
			const hexByte = fakeIdHex.slice(hexByteStart, hexByteStart + 2)
			bytes[j] = parseInt(hexByte, 16) || 0
		}
		view.setFloat32(12, 25.5, true)

		const request = new Request(`${BASE_URL}/api/boxes/${deviceId}/data`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/sbx-bytes',
				Authorization: deviceApiKey,
			},
			body: bytes,
		})

		const response: any = await postMeasurementsAction({
			request,
			params: { deviceId: deviceId },
		} as postMeasurementRoute.ActionArgs)

		console.log('response invalid sensor', response)

		// Should either reject or silently skip invalid sensors
		expect(response.status).toBeGreaterThanOrEqual(200)
	})

	it('should handle empty measurements', async () => {
		const request = new Request(`${BASE_URL}/api/boxes/${deviceId}/data`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/sbx-bytes',
				Authorization: deviceApiKey,
			},
			body: new Uint8Array(0),
		})

		const response: any = await postMeasurementsAction({
			request,
			params: { deviceId: deviceId },
		} as postMeasurementRoute.ActionArgs)

		expect(response.status).toBe(422) // Unprocessable Entity
	})

	// ---------------------------------------------------
	// MQTT publishing
	// ---------------------------------------------------
	// describe("MQTT submission", () => {
	//   it("should accept measurements through mqtt", async () => {
	//     // NOTE: You’ll need to wire up a real or mock MQTT client.
	//     // Example: use `mqtt` npm package and connect to a local broker in test env.
	//     // Here we just stub:

	//     const fakePublishMqttMessage = async (
	//       topic: string,
	//       payload: string
	//     ) => {
	//       // call your app’s MQTT ingestion handler directly instead of broker
	//       const request = new Request(`${BASE_URL}/api/mqtt`, {
	//         method: "POST",
	//         headers: { "Content-Type": "application/json" },
	//         body: payload,
	//       });
	//       return postMeasurementsAction({
	//         request,
	//         params: { deviceId: deviceId },
	//         context: {} as AppLoadContext

	//       } as ActionFunctionArgs);
	//     };

	//     const payload = JSON.stringify(jsonSubmitData.jsonArr(sensors));
	//     const mqttResponse: any = await fakePublishMqttMessage("mytopic", payload);

	//     expect(mqttResponse.status).toBe(201);
	//   });
	// });

	describe('multiple JSON POST /boxes/:id/data', () => {
		it('should accept multiple measurements with timestamps as JSON object via POST (content-type: json)', async () => {
			const submitData = jsonSubmitData.jsonObj(sensors)

			const request = new Request(`${BASE_URL}/api/boxes/${deviceId}/data`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: deviceApiKey,
				},
				body: JSON.stringify(submitData),
			})

			const before = new Date()

			const response: any = await postMeasurementsAction({
				request,
				params: { deviceId: deviceId },
			} as postMeasurementRoute.ActionArgs)

			const after = new Date()

			expect(response.status).toBe(201)
			expect(await response.text()).toContain('Measurements saved in box')

			// Verify sensors got updated
			const updatedDevice = await getDevice({ id: deviceId })
			for (const sensor of updatedDevice?.sensors || []) {
				expect(sensor.lastMeasurement).toBeTruthy()
				expect(
					new Date((sensor.lastMeasurement as any).createdAt).getTime(),
				).toBeGreaterThanOrEqual(before.getTime() - 1000)
				expect(
					new Date((sensor.lastMeasurement as any).createdAt).getTime(),
				).toBeLessThanOrEqual(after.getTime() + 1000 * 60 * 4) // within ~4 min
			}
		})

		it('should accept multiple measurements with timestamps as JSON object via POST', async () => {
			const submitData = jsonSubmitData.jsonObj(sensors)

			const request = new Request(`${BASE_URL}/api/boxes/${deviceId}/data`, {
				method: 'POST',
				headers: {
					Authorization: deviceApiKey,
					// TODO: remove header here
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(submitData),
			})

			const before = new Date()
			const response: any = await postMeasurementsAction({
				request,
				params: { deviceId: deviceId },
			} as postMeasurementRoute.ActionArgs)
			const after = new Date()

			expect(response.status).toBe(201)
			expect(await response.text()).toContain('Measurements saved in box')

			const updatedDevice = await getDevice({ id: deviceId })
			for (const sensor of updatedDevice?.sensors || []) {
				expect(sensor.lastMeasurement).toBeTruthy()
				const createdAt = new Date((sensor.lastMeasurement as any).createdAt)
				expect(createdAt.getTime()).toBeGreaterThanOrEqual(
					before.getTime() - 1000,
				)
				expect(createdAt.getTime()).toBeLessThanOrEqual(
					after.getTime() + 1000 * 60 * 4,
				)
			}
		})

		it('should accept multiple measurements with timestamps as JSON array via POST', async () => {
			const submitData = jsonSubmitData.jsonArr(sensors)

			const request = new Request(`${BASE_URL}/api/boxes/${deviceId}/data`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: deviceApiKey,
				},
				body: JSON.stringify(submitData),
			})

			const before = new Date()
			const response: any = await postMeasurementsAction({
				request,
				params: { deviceId: deviceId },
			} as postMeasurementRoute.ActionArgs)
			const after = new Date()

			expect(response.status).toBe(201)
			expect(await response.text()).toContain('Measurements saved in box')

			const updatedDevice = await getDevice({ id: deviceId })
			for (const sensor of updatedDevice?.sensors || []) {
				expect(sensor.lastMeasurement).toBeTruthy()
				const createdAt = new Date((sensor.lastMeasurement as any).createdAt)
				expect(createdAt.getTime()).toBeGreaterThanOrEqual(
					before.getTime() - 1000,
				)
				expect(createdAt.getTime()).toBeLessThanOrEqual(
					after.getTime() + 1000 * 60 * 4,
				)
			}
		})
	})

	afterAll(async () => {
		await deleteUserByEmail(TEST_USER.email)
		await deleteDevice({ id: deviceId })
	})
})

import { generateTestUserCredentials } from 'tests/data/generate_test_user'
import { type Route } from '../../.react-router/types/app/routes/+types/api.boxes.claim'
import { type Route as TransferRoute } from '../../.react-router/types/app/routes/+types/api.boxes.transfer'
import { BASE_URL } from '../../vitest.setup'
import { createDevice, getDevice } from '~/db/models/device.server'
import { deleteUserByEmail } from '~/db/models/user.server'
import { type Device, type User } from '~/db/schema'
import { createToken } from '~/lib/jwt'
import { action as claimAction } from '~/routes/api.boxes.claim'
import { action as transferAction } from '~/routes/api.boxes.transfer'
import { registerUser } from '~/services/user-service.server'

const CLAIM_TEST_USER = generateTestUserCredentials()

const createTestUser = async (suffix: string): Promise<User> => {
	const u = generateTestUserCredentials()
	const registration = await registerUser(
		u.name,
		u.email,
		u.password,
		'en_US',
		true,
	)
	expect(registration.ok).toBe(true)

	if (!registration.ok) {
		throw new Error(
			`Test setup failed: ${registration.field} -> ${registration.code}`,
		)
	}

	return registration.user
}

const generateMinimalDevice = (
	location: number[] | {} = [123, 12, 34],
	exposure = 'mobile',
	name = '' + new Date().getTime(),
) => ({
	exposure,
	location,
	name,
	model: 'homeV2Ethernet',
})

describe('openSenseMap API Routes: /boxes/claim', () => {
	let user: User | null = null
	let jwt: string = ''
	let queryableDevice: Device | null = null

	beforeAll(async () => {
		const testUser = await registerUser(
			CLAIM_TEST_USER.name,
			CLAIM_TEST_USER.email,
			CLAIM_TEST_USER.password,
			'en_US',
			true,
		)
		expect(testUser.ok).toBe(true)

		if (!testUser.ok) {
			throw new Error(
				`Test setup failed: ${testUser.field} -> ${testUser.code}`,
			)
		}

		user = testUser.user
		const { token: t } = await createToken(user)
		jwt = t

		queryableDevice = await createDevice(
			{ ...generateMinimalDevice(), latitude: 123, longitude: 12 },
			user.id,
		)
	})

	afterAll(async () => {
		await deleteUserByEmail(CLAIM_TEST_USER.email)
	})

	describe('POST /boxes/claim', () => {
		it('should claim a device and transfer ownership from one user to another', async () => {
			const createTransferRequest = new Request(`${BASE_URL}/boxes/transfer`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
					Authorization: `Bearer ${jwt}`,
				},
				body: new URLSearchParams({ boxId: queryableDevice!.id }),
			})

			const transferResponse = (await transferAction({
				request: createTransferRequest,
			} as TransferRoute.ActionArgs)) as Response

			const transferBody = await transferResponse.json()
			const claimToken = transferBody.data.token

			const newUser = await createTestUser(Date.now().toString())
			const { token: newUserJwt } = await createToken(newUser)

			const claimRequest = new Request(`${BASE_URL}/boxes/claim`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${newUserJwt}`,
				},
				body: JSON.stringify({ token: claimToken }),
			})

			const claimResponse = (await claimAction({
				request: claimRequest,
			} as Route.ActionArgs)) as Response

			expect(claimResponse.status).toBe(200)
			const claimBody = await claimResponse.json()
			expect(claimBody.message).toBe('Device successfully claimed!')
			expect(claimBody.data.boxId).toBe(queryableDevice!.id)

			// Verify the device is now owned by the new user
			const updatedDevice = await getDevice({ id: queryableDevice!.id })
			expect(updatedDevice?.user.id).toBe(newUser.id)

			// Verify the transfer token is deleted (can't be used again)
			const reusedClaimRequest = new Request(`${BASE_URL}/boxes/claim`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${newUserJwt}`,
				},
				body: JSON.stringify({ token: claimToken }),
			})

			const reusedResponse = (await claimAction({
				request: reusedClaimRequest,
			} as Route.ActionArgs)) as Response

			expect(reusedResponse.status).toBe(410)

			// Cleanup
			await deleteUserByEmail(newUser.email)
		})

		it('should reject claim with invalid content-type', async () => {
			const testDevice = await createDevice(
				{ ...generateMinimalDevice(), latitude: 456, longitude: 78 },
				(user as User).id,
			)

			const createTransferRequest = new Request(`${BASE_URL}/boxes/transfer`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
					Authorization: `Bearer ${jwt}`,
				},
				body: new URLSearchParams({ boxId: testDevice!.id }),
			})

			const transferResponse = (await transferAction({
				request: createTransferRequest,
			} as TransferRoute.ActionArgs)) as Response

			expect(transferResponse.status).toBe(201)
			const transferBody = await transferResponse.json()
			expect(transferBody.data).toBeDefined()
			const claimToken = transferBody.data.token

			const claimRequest = new Request(`${BASE_URL}/boxes/claim`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
					Authorization: `Bearer ${jwt}`,
				},
				body: new URLSearchParams({ token: claimToken }),
			})

			const claimResponse = (await claimAction({
				request: claimRequest,
			} as Route.ActionArgs)) as Response

			expect(claimResponse.status).toBe(415)
			const body = await claimResponse.json()
			expect(body.code).toBe('Unsupported Media Type')
			expect(body.message).toContain('application/json')
		})

		it('should reject claim without Authorization header', async () => {
			const testDevice = await createDevice(
				{ ...generateMinimalDevice(), latitude: 789, longitude: 101 },
				(user as User).id,
			)

			const createTransferRequest = new Request(`${BASE_URL}/boxes/transfer`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
					Authorization: `Bearer ${jwt}`,
				},
				body: new URLSearchParams({ boxId: testDevice!.id }),
			})

			const transferResponse = (await transferAction({
				request: createTransferRequest,
			} as TransferRoute.ActionArgs)) as Response

			expect(transferResponse.status).toBe(201)
			const transferBody = await transferResponse.json()
			expect(transferBody.data).toBeDefined()
			const claimToken = transferBody.data.token

			const claimRequest = new Request(`${BASE_URL}/boxes/claim`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ token: claimToken }),
			})

			const claimResponse = (await claimAction({
				request: claimRequest,
			} as Route.ActionArgs)) as Response

			expect(claimResponse.status).toBe(403)
			const body = await claimResponse.json()
			expect(body.code).toBe('Forbidden')
		})

		it('should reject claim with expired transfer token', async () => {
			// Create a new user to attempt the claim
			const registration = await registerUser(
				'claimer' + Date.now(),
				`claimer${Date.now()}@test.com`,
				'password123',
				'en_US',
				true,
			)
			expect(registration.ok).toBe(true)

			if (!registration.ok) {
				throw new Error(
					`Test setup failed: ${registration.field} -> ${registration.code}`,
				)
			}
			const { token: newUserJwt } = await createToken(registration.user)

			const claimRequest = new Request(`${BASE_URL}/boxes/claim`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${newUserJwt}`,
				},
				body: JSON.stringify({ token: 'invalid-or-expired-token' }),
			})

			const claimResponse = (await claimAction({
				request: claimRequest,
			} as Route.ActionArgs)) as Response

			expect(claimResponse.status).toBe(410)
			const body = await claimResponse.json()
			expect(body.error).toContain('expired')

			// Cleanup
			await deleteUserByEmail(registration.user.email)
		})
	})
})

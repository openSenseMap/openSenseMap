import { type ActionFunctionArgs } from 'react-router'
import { afterEach, expect, it, vi } from 'vitest'
import { deleteDevice } from '~/lib/devices-service.server'
import { deleteDevice as deleteDeviceById } from '~/models/device.server'
import { action as apiAction } from '~/routes/api.boxes.$deviceId'
import { action as deletePageAction } from '~/routes/device.$deviceId.edit.delete'
import { action as generalAction } from '~/routes/device.$deviceId.edit.general'
import { deleteDeviceImage } from '~/utils/s3.server'

const { owner, device } = vi.hoisted(() => ({
	owner: { id: 'owner', email: 'owner@example.test' },
	device: { id: 'device', userId: 'owner', image: 'device-image' },
}))

vi.mock('~/models/device.server', () => ({
	getDevice: vi.fn(async () => device),
	getUserDevice: vi.fn(async () => device),
	deleteDevice: vi.fn(async () => ({ count: 1 })),
}))

vi.mock('~/models/integration.server', () => ({
	getIntegrations: vi.fn(async () => [
		{
			name: 'Test integration',
			serviceKey: 'TEST_INTEGRATION_KEY',
			serviceUrl: 'https://integration.example.test',
		},
	]),
}))

vi.mock('~/models/user.server', () => ({
	verifyLogin: vi.fn(async () => owner),
}))
vi.mock('~/utils/session.server', () => ({
	getUserId: vi.fn(async () => owner.id),
	getUserEmail: vi.fn(async () => owner.email),
}))
vi.mock('~/utils/s3.server', () => ({
	deleteDeviceImage: vi.fn(),
}))
vi.mock('~/lib/jwt', () => ({
	getUserFromJwt: vi.fn(async () => owner),
}))

afterEach(() => {
	vi.clearAllMocks()
	vi.restoreAllMocks()
	vi.unstubAllEnvs()
	vi.unstubAllGlobals()
})

const deletionRoutes = [
	{
		name: 'General settings',
		action: generalAction,
		requestInit: {
			method: 'POST',
			body: new URLSearchParams({
				intent: 'delete',
				passwordDelete: 'password',
				name: 'Device',
				exposure: 'outdoor',
				description: '',
				website: '',
			}),
		},
		successStatus: 302,
	},
	{
		name: 'the delete page',
		action: deletePageAction,
		requestInit: {
			method: 'POST',
			body: new URLSearchParams({ passwordDelete: 'password' }),
		},
		successStatus: 302,
	},
	{
		name: 'the API',
		action: apiAction,
		requestInit: {
			method: 'DELETE',
			body: JSON.stringify({ password: 'password' }),
		},
		successStatus: 200,
	},
]

it.each(deletionRoutes)(
	'preserves the device and image on cleanup failure from $name and allows retry',
	async ({ action, requestInit, successStatus }) => {
		const fetchIntegration = vi
			.fn()
			.mockResolvedValueOnce(new Response(null, { status: 500 }))
			.mockResolvedValueOnce(new Response(null, { status: 404 }))
		vi.stubGlobal('fetch', fetchIntegration)
		vi.stubEnv('TEST_INTEGRATION_KEY', 'test-key')
		vi.spyOn(console, 'error').mockImplementation(() => {})

		const submitDeletion = () =>
			action({
				request: new Request('https://opensensemap.example.test', requestInit),
				params: { deviceId: device.id },
				context: {} as ActionFunctionArgs['context'],
			})

		const failure = await submitDeletion()
		if (failure instanceof Response) {
			expect(failure.status).toBe(503)
			expect(await failure.json()).toMatchObject({
				code: 'Service Unavailable',
			})
		} else {
			expect(failure?.init?.status).toBe(503)
			expect(failure?.data).toMatchObject({
				errors: { integrationCleanup: true },
			})
		}
		expect(deleteDeviceImage).not.toHaveBeenCalled()
		expect(deleteDeviceById).not.toHaveBeenCalled()

		const retry = await submitDeletion()
		expect(retry).toBeInstanceOf(Response)
		expect((retry as Response).status).toBe(successStatus)
		expect(deleteDeviceImage).toHaveBeenCalledExactlyOnceWith(device.image)
		expect(deleteDeviceById).toHaveBeenCalledExactlyOnceWith({ id: device.id })
		expect(fetchIntegration).toHaveBeenCalledTimes(2)
	},
)

it('checks ownership before cleaning up integrations or deleting a device', async () => {
	const fetchIntegration = vi.fn()
	vi.stubGlobal('fetch', fetchIntegration)
	vi.stubEnv('TEST_INTEGRATION_KEY', 'test-key')

	const result = await deleteDevice(
		{ ...owner, id: 'another-user' },
		device,
		'password',
	)

	expect(result).toBe('forbidden')
	expect(fetchIntegration).not.toHaveBeenCalled()
	expect(deleteDeviceImage).not.toHaveBeenCalled()
	expect(deleteDeviceById).not.toHaveBeenCalled()
})

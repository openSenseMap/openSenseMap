import { asc, eq } from 'drizzle-orm'
import { type Integration, integration } from '~/db/schema/integration'
import { drizzleClient } from '~/db.server'
import { logServerError } from '~/lib/sentry.server'

export async function getIntegrations() {
	return drizzleClient.query.integration.findMany({
		orderBy: [asc(integration.order)],
	})
}

export async function getIntegrationById({ id }: Pick<Integration, 'id'>) {
	return drizzleClient.query.integration.findFirst({
		where: eq(integration.id, id),
	})
}

export async function isValidServiceKey(
	serviceKey: string | null,
): Promise<boolean> {
	if (!serviceKey) return false

	const integrations = await getIntegrations()

	for (const intg of integrations) {
		const expectedKey = process.env[intg.serviceKey]
		if (expectedKey && serviceKey === expectedKey) {
			return true
		}
	}

	return false
}

export async function reconcileDeviceIntegrations({
	deviceId,
	validSensorIds,
}: {
	deviceId: string
	validSensorIds: string[]
}) {
	const integrations = await drizzleClient.query.integration.findMany()

	for (const intg of integrations) {
		const serviceKey = process.env[intg.serviceKey]
		if (!serviceKey) {
			console.warn(`Service key '${intg.serviceKey}' not configured`)
			continue
		}

		try {
			const res = await fetch(
				`${intg.serviceUrl}/integrations/${deviceId}/reconcile-sensors`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'x-service-key': serviceKey,
					},
					body: JSON.stringify({ validSensorIds }),
				},
			)

			if (!res.ok && res.status !== 404) {
				logServerError('Device integration reconciliation failed', res, {
					'app.operation': 'integration.reconcile_sensors',
					'integration.slug': intg.slug,
				})
				const text = await res.text()
				console.error(`Failed to reconcile ${intg.slug} integration`, {
					status: res.status,
					body: text,
				})
			}
		} catch (error) {
			logServerError('Device integration reconciliation failed', error, {
				'app.operation': 'integration.reconcile_sensors',
				'integration.slug': intg.slug,
			})
			console.error(`Error reconciling ${intg.slug} integration`, error)
		}
	}
}

export type DeviceIntegrationStatus =
	| 'configured'
	| 'not_configured'
	| 'unreachable'
	| 'misconfigured'

export type DeviceIntegrationSummary = Record<
	string,
	{
		enabled: boolean
		status: DeviceIntegrationStatus
	}
>

export async function getDeviceIntegrations(
	deviceId: string,
): Promise<DeviceIntegrationSummary> {
	const integrations = await getIntegrations()

	const entries = await Promise.all(
		integrations.map(
			async (intg): Promise<[string, DeviceIntegrationSummary[string]]> => {
				const serviceKey = process.env[intg.serviceKey]

				if (!serviceKey) {
					console.warn(`Service key '${intg.serviceKey}' not configured`)
					return [
						intg.slug,
						{
							enabled: false,
							status: 'misconfigured',
						},
					]
				}

				try {
					const res = await fetch(
						`${intg.serviceUrl}/integrations/${deviceId}`,
						{
							method: 'GET',
							headers: {
								'x-service-key': serviceKey,
							},
							signal: AbortSignal.timeout(2000),
						},
					)

					if (res.status === 404) {
						return [
							intg.slug,
							{
								enabled: false,
								status: 'not_configured',
							},
						]
					}

					if (!res.ok) {
						const text = await res.text()
						console.error(
							`Failed to fetch ${intg.slug} integration for device ${deviceId}`,
							{
								status: res.status,
								body: text,
							},
						)

						return [
							intg.slug,
							{
								enabled: false,
								status: 'unreachable',
							},
						]
					}

					const data = await res.json()

					return [
						intg.slug,
						{
							enabled: Boolean(data?.enabled),
							status: 'configured',
						},
					]
				} catch (error) {
					console.error(
						`Error fetching ${intg.slug} integration for device ${deviceId}`,
						error,
					)

					return [
						intg.slug,
						{
							enabled: false,
							status: 'unreachable',
						},
					]
				}
			},
		),
	)

	return Object.fromEntries(entries)
}

export async function enrichDevicesWithIntegrations<T extends { _id: string }>(
	devices: T[],
): Promise<Array<T & { integrations: DeviceIntegrationSummary }>> {
	return Promise.all(
		devices.map(async (device) => ({
			...device,
			integrations: await getDeviceIntegrations(device._id),
		})),
	)
}

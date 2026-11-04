import { getIntegrations } from '~/db/models/integration.server'

interface IntegrationResult {
	integration: string
	status: 'success' | 'failed'
	error?: string
}

export interface IntegrationServiceMetadata {
	service: string
	revision: string
}

export type IntegrationServiceState =
	| 'available'
	| 'misconfigured'
	| 'unauthorized'
	| 'unsupported'
	| 'unreachable'
	| 'invalid_response'
	| 'service_error'

export interface IntegrationServiceStatus {
	id: string
	name: string
	slug: string
	serviceUrl: string
	state: IntegrationServiceState
	metadata?: IntegrationServiceMetadata
}

function isIntegrationServiceMetadata(
	value: unknown,
): value is IntegrationServiceMetadata {
	if (!value || typeof value !== 'object') return false

	const metadata = value as Record<string, unknown>
	const isNonEmptyString = (entry: unknown): entry is string =>
		typeof entry === 'string' && entry.trim().length > 0

	return (
		isNonEmptyString(metadata.service) && isNonEmptyString(metadata.revision)
	)
}

/**
 * Returns deployment metadata for every configured integration microservice.
 * Requests happen server-side so service keys are never exposed to the browser.
 */
export async function getIntegrationServiceStatuses(): Promise<
	IntegrationServiceStatus[]
> {
	const integrations = await getIntegrations()

	return Promise.all(
		integrations.map(async (intg): Promise<IntegrationServiceStatus> => {
			const summary = {
				id: intg.id,
				name: intg.name,
				slug: intg.slug,
				serviceUrl: intg.serviceUrl,
			}
			const serviceKey = process.env[intg.serviceKey]

			if (!serviceKey) {
				return { ...summary, state: 'misconfigured' }
			}

			try {
				const response = await fetch(
					`${intg.serviceUrl.replace(/\/+$/, '')}/meta`,
					{
						method: 'GET',
						redirect: 'error',
						headers: {
							Accept: 'application/json',
							'x-service-key': serviceKey,
						},
						signal: AbortSignal.timeout(2000),
					},
				)

				if (response.status === 401 || response.status === 403) {
					return { ...summary, state: 'unauthorized' }
				}

				if (response.status === 404) {
					return { ...summary, state: 'unsupported' }
				}

				if (!response.ok) {
					return { ...summary, state: 'service_error' }
				}

				let metadata: unknown
				try {
					metadata = await response.json()
				} catch {
					return { ...summary, state: 'invalid_response' }
				}

				if (!isIntegrationServiceMetadata(metadata)) {
					return { ...summary, state: 'invalid_response' }
				}

				return { ...summary, state: 'available', metadata }
			} catch {
				return { ...summary, state: 'unreachable' }
			}
		}),
	)
}

/**
 * Creates integrations for a device based on the provided config.
 * Iterates over all registered integrations and calls their respective
 * microservices if enabled in the config.
 */
export async function createDeviceIntegrations(
	deviceId: string,
	advanced: Record<string, any>,
): Promise<IntegrationResult[]> {
	const availableIntegrations = await getIntegrations()
	const results: IntegrationResult[] = []

	for (const intg of availableIntegrations) {
		const enabledKey = `${intg.slug}Enabled`
		const configKey = `${intg.slug}Config`

		// Skip if not enabled or no config provided
		if (!advanced?.[enabledKey] || !advanced?.[configKey]) {
			continue
		}

		try {
			const serviceKey = process.env[intg.serviceKey]

			if (!serviceKey) {
				throw new Error(
					`Service key env var '${intg.serviceKey}' not configured`,
				)
			}

			const response = await fetch(
				`${intg.serviceUrl}/integrations/${deviceId}`,
				{
					method: 'PUT',
					headers: {
						'Content-Type': 'application/json',
						'x-service-key': serviceKey,
					},
					body: JSON.stringify(advanced[configKey]),
				},
			)

			if (!response.ok) {
				const errText = await response.text()
				throw new Error(`Failed: ${response.status} - ${errText}`)
			}

			results.push({
				integration: intg.name,
				status: 'success',
			})
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error)

			results.push({
				integration: intg.name,
				status: 'failed',
				error: message,
			})
		}
	}

	return results
}

/**
 * Deletes integrations for a device across all registered microservices.
 */
export async function deleteDeviceIntegrations(
	deviceId: string,
): Promise<IntegrationResult[]> {
	const availableIntegrations = await getIntegrations()
	const results: IntegrationResult[] = []

	for (const intg of availableIntegrations) {
		try {
			const serviceKey = process.env[intg.serviceKey]

			if (!serviceKey) {
				throw new Error(
					`Service key env var '${intg.serviceKey}' not configured`,
				)
			}

			const response = await fetch(
				`${intg.serviceUrl}/integrations/${deviceId}`,
				{
					method: 'DELETE',
					headers: {
						'x-service-key': serviceKey,
					},
				},
			)

			// 404 is fine - integration may not exist for this device
			if (!response.ok && response.status !== 404) {
				const errText = await response.text()
				throw new Error(`Failed: ${response.status} - ${errText}`)
			}

			results.push({
				integration: intg.name,
				status: 'success',
			})
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error)

			results.push({
				integration: intg.name,
				status: 'failed',
				error: message,
			})
		}
	}

	return results
}

/**
 * Updates integrations for a device.
 * Same as createDeviceIntegrations since the PUT endpoint handles upserts.
 */
export const updateDeviceIntegrations = createDeviceIntegrations

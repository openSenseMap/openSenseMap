import Form from '@rjsf/core'
import validator from '@rjsf/validator-ajv8'
import { eq } from 'drizzle-orm'
import { Save } from 'lucide-react'
import React from 'react'
import { data, redirect, useFetcher, useLoaderData } from 'react-router'
import { type Route } from './+types/device.$deviceId.edit.$integrationSlug'
import {
	ArrayFieldItemTemplate,
	ArrayFieldRemoveButton,
	ArrayFieldTemplate,
} from '~/components/rjsf/arrayFieldTemplate'
import { CheckboxWidget } from '~/components/rjsf/checkboxWidget'
import { FieldTemplate } from '~/components/rjsf/fieldTemplate'
import { BaseInputTemplate } from '~/components/rjsf/inputTemplate'
import { toast } from '~/components/ui/use-toast'
import { integration } from '~/db/schema/integration'
import { drizzleClient } from '~/db.server'
import { getUserId } from '~/services/session-service.server'

// =====================================================
// Loader
// =====================================================
export async function loader({ request, params }: Route.LoaderArgs) {
	const userId = await getUserId(request)
	if (!userId) return redirect('/')

	const { deviceId, integrationSlug } = params

	if (!deviceId || !integrationSlug) {
		throw new Response('Missing deviceId or integrationSlug', { status: 400 })
	}

	// Get integration config from DB
	const intg = await drizzleClient.query.integration.findFirst({
		where: eq(integration.slug, integrationSlug),
	})

	if (!intg) {
		throw new Response(`Integration '${integrationSlug}' not found`, {
			status: 404,
		})
	}

	const serviceKey = process.env[intg.serviceKey]
	if (!serviceKey) {
		throw new Response(`Service key '${intg.serviceKey}' not configured`, {
			status: 500,
		})
	}

	const headers = { 'x-service-key': serviceKey }

	try {
		const [schemaRes, integrationRes] = await Promise.all([
			fetch(`${intg.serviceUrl}/integrations/schema/${integrationSlug}`, {
				headers,
			}),
			fetch(`${intg.serviceUrl}/integrations/${deviceId}`, { headers }),
		])

		if (!schemaRes.ok) {
			throw new Response(`Failed to load ${intg.name} schema`, { status: 500 })
		}

		const schemaData = await schemaRes.json()

		let existingIntegration = null
		if (integrationRes.ok) {
			existingIntegration = await integrationRes.json()
		}

		return {
			intg: {
				name: intg.name,
				slug: intg.slug,
				description: intg.description,
			},
			schema: schemaData.schema,
			uiSchema: schemaData.uiSchema,
			integration: existingIntegration,
		}
	} catch (error) {
		console.error(`Error loading ${intg.name} integration:`, error)
		throw new Response(`Failed to load ${intg.name} integration`, {
			status: 500,
		})
	}
}

// =====================================================
// Action
// =====================================================
export async function action({ request, params }: Route.ActionArgs) {
	const { deviceId, integrationSlug } = params

	if (!deviceId || !integrationSlug) {
		return data(
			{ error: 'Missing deviceId or integrationSlug' },
			{ status: 400 },
		)
	}

	// Get integration config from DB
	const intg = await drizzleClient.query.integration.findFirst({
		where: eq(integration.slug, integrationSlug),
	})

	if (!intg) {
		return data(
			{ error: `Integration '${integrationSlug}' not found` },
			{ status: 404 },
		)
	}

	const serviceKey = process.env[intg.serviceKey]
	if (!serviceKey) {
		return data(
			{ error: `Service key '${intg.serviceKey}' not configured` },
			{ status: 500 },
		)
	}

	const formData = await request.formData()
	const configStr = formData.get('integrationConfig')

	if (!configStr) {
		return data({ error: 'No integration config provided' }, { status: 400 })
	}

	const config = JSON.parse(configStr.toString())

	// Delete integration if disabled
	if (config.enabled === false) {
		const deleteRes = await fetch(
			`${intg.serviceUrl}/integrations/${deviceId}`,
			{
				method: 'DELETE',
				headers: { 'x-service-key': serviceKey },
			},
		)

		if (!deleteRes.ok && deleteRes.status !== 404) {
			return data({ error: 'Failed to delete integration' }, { status: 500 })
		}

		return data({ success: true })
	}

	const response = await fetch(`${intg.serviceUrl}/integrations/${deviceId}`, {
		method: 'PUT',
		headers: {
			'Content-Type': 'application/json',
			'x-service-key': serviceKey,
		},
		body: JSON.stringify(config),
	})

	if (!response.ok) {
		const error = await response.json()
		return data(
			{ error: error.error || error.details || 'Failed to save configuration' },
			{ status: response.status },
		)
	}

	return data({ success: true })
}

export default function EditIntegration() {
	const { intg, schema, uiSchema, integration } = useLoaderData<typeof loader>()

	const [formData, setFormData] = React.useState(() => {
		if (!integration) {
			return { enabled: false }
		}
		return integration
	})

	const fetcher = useFetcher()

	React.useEffect(() => {
		if (fetcher.data?.success) {
			toast({ description: `${intg.name} configuration saved successfully!` })
		}
	}, [fetcher.data])

	const handleSubmit = async ({ formData: newFormData }: any) => {
		await fetcher.submit(
			{ integrationConfig: JSON.stringify(newFormData) },
			{ method: 'post' },
		)
	}

	return (
		<div className="mx-auto max-w-xl">
			<h1 className="mb-4 text-4xl">{intg.name}</h1>

			{intg.description && (
				<p className="text-muted-foreground mb-6">{intg.description}</p>
			)}

			<Form
				widgets={{ CheckboxWidget }}
				schema={schema}
				uiSchema={uiSchema}
				formData={formData}
				validator={validator}
				templates={{
					FieldTemplate,
					ArrayFieldTemplate,
					ArrayFieldItemTemplate,
					BaseInputTemplate,
					ButtonTemplates: { RemoveButton: ArrayFieldRemoveButton },
				}}
				onChange={(e: any) => setFormData(e.formData)}
				onSubmit={handleSubmit}
				omitExtraData
				liveOmit
			>
				<button type="submit" className="mt-4 h-12 w-12 rounded-full border">
					<Save className="mx-auto h-6 w-6" />
				</button>
			</Form>

			{fetcher.data?.error && (
				<div className="mt-4 rounded border border-red-300 bg-red-50 p-4 text-red-800">
					{fetcher.data.error}
				</div>
			)}
		</div>
	)
}

import { eq } from 'drizzle-orm'
import { type Route } from './+types/api.integrations.schema.$slug'
import { integration } from '~/db/schema/integration'
import { drizzleClient } from '~/db.server'

export async function loader({ params }: Route.LoaderArgs) {
	const { slug } = params

	if (!slug) {
		return new Response('Integration slug required', { status: 400 })
	}

	try {
		const intg = await drizzleClient.query.integration.findFirst({
			where: eq(integration.slug, slug),
		})

		if (!intg) {
			return new Response(`Integration '${slug}' not found`, { status: 404 })
		}

		const serviceKey = process.env[intg.serviceKey]
		if (!serviceKey) {
			return new Response(
				`Service key env var '${intg.serviceKey}' not configured`,
				{ status: 500 },
			)
		}

		const res = await fetch(`${intg.serviceUrl}/integrations/schema/${slug}`, {
			headers: {
				'x-service-key': serviceKey,
			},
		})

		if (!res.ok) {
			return new Response(`Failed to fetch schema from ${intg.name} service`, {
				status: res.status,
			})
		}

		const schema = await res.json()

		return Response.json(schema)
	} catch (error) {
		console.error('Error fetching integration schema:', error)
		return new Response('Internal server error', { status: 500 })
	}
}

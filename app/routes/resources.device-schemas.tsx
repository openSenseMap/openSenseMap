import { type Route } from './+types/resources.device-schemas'
import { getVisibleDeviceSchemaVersions } from '~/db/models/device-schema.server'
import { getUserId } from '~/services/session-service.server'

export async function loader({ request }: Route.LoaderArgs) {
	const url = new URL(request.url)
	const userId = await getUserId(request)
	const query = url.searchParams.get('q')
	const schemas = await getVisibleDeviceSchemaVersions({ userId, query })

	return Response.json({
		schemas: schemas.map((schema) => ({
			id: schema.id,
			slug: schema.slug,
			name: schema.name,
			description: schema.description,
			tags: schema.tags ?? [],
			visibility: schema.visibility,
			versionId: schema.versionId,
			version: schema.version,
			formatVersion: schema.formatVersion,
			hash: schema.hash,
			publishedAt: schema.publishedAt,
			isOwner: userId === schema.ownerUserId,
			content: schema.content,
		})),
	})
}

import { type Route } from './+types/resources.device-schema.$versionId'
import { getSharedDeviceSchemaVersion } from '~/db/models/device-schema.server'
import { getUserId } from '~/services/session-service.server'

function filenameForSchema(slug: string, version: string) {
	return `${slug}-${version}.json`.replace(/[^a-zA-Z0-9._-]+/g, '-')
}

export async function loader({ request, params }: Route.LoaderArgs) {
	const userId = await getUserId(request)
	const schemaVersion = await getSharedDeviceSchemaVersion(
		params.versionId as string,
		userId,
	)

	if (!schemaVersion) {
		throw new Response('Not found', { status: 404 })
	}

	return new Response(JSON.stringify(schemaVersion.content, null, 2), {
		headers: {
			'Content-Type': 'application/json; charset=utf-8',
			'Content-Disposition': `attachment; filename="${filenameForSchema(
				schemaVersion.slug,
				schemaVersion.version,
			)}"`,
		},
	})
}

import { sensorWikiAliasCatalog } from '~/lib/device-schemas/sensor-wiki-alias-catalog'

export function loader() {
	return Response.json(sensorWikiAliasCatalog, {
		headers: {
			'Cache-Control': 'public, max-age=300, s-maxage=3600',
		},
	})
}

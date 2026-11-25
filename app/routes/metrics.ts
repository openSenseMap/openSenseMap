import { metrics } from '~/lib/metrics.server'

export async function loader() {
	return new Response(await metrics.register.metrics(), {
		status: 200,
		headers: {
			'Content-Type': metrics.register.contentType,
			'Cache-Control': 'no-store',
		},
	})
}

// learn more: https://fly.io/docs/reference/configuration/#services-http_checks
import { type Route } from './+types/healthcheck'
import { drizzleClient } from '~/db.server'
import { logServerError } from '~/lib/sentry.server'

const HEALTHCHECK_FAILURE_LOG_INTERVAL_MS = 60_000
let lastHealthcheckFailureLogAt = 0

export async function loader({ request }: Route.LoaderArgs) {
	const host =
		request.headers.get('X-Forwarded-Host') ?? request.headers.get('host')

	try {
		const url = new URL('/', `http://${host}`)
		// if we can connect to the database and make a simple query
		// and make a HEAD request to ourselves, then we're good.
		await Promise.all([
			drizzleClient.query.user.findFirst(),
			fetch(url.toString(), { method: 'HEAD' }).then((r) => {
				if (!r.ok) return Promise.reject(r)
			}),
		])
		return new Response('OK')
	} catch (error: unknown) {
		const now = Date.now()
		if (
			now - lastHealthcheckFailureLogAt >=
			HEALTHCHECK_FAILURE_LOG_INTERVAL_MS
		) {
			lastHealthcheckFailureLogAt = now
			logServerError('Application health check failed', error, {
				'app.operation': 'healthcheck',
				'healthcheck.name': 'database-and-self-request',
			})
		}

		console.error('healthcheck ❌', { error })
		return new Response('ERROR', { status: 500 })
	}
}

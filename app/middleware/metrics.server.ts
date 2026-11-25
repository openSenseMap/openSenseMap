import { metrics } from '~/lib/metrics.server'

export async function prometheusMetricsMiddleware(
	{ request }: { request: Request },
	next: () => Promise<Response>,
) {
	const url = new URL(request.url)

	// Do not count Prometheus scrapes as application traffic.
	if (url.pathname === '/metrics') {
		return next()
	}

	const end = metrics.httpRequestDurationSeconds.startTimer({
		method: request.method,
	})

	try {
		const response = await next()
		const statusCode = String(response.status)

		end({ status_code: statusCode })

		metrics.httpRequestsTotal.inc({
			method: request.method,
			status_code: statusCode,
		})

		return response
	} catch (error) {
		end({ status_code: '500' })

		metrics.httpRequestsTotal.inc({
			method: request.method,
			status_code: '500',
		})

		throw error
	}
}

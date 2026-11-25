import client from 'prom-client'

type Metrics = {
	register: client.Registry
	httpRequestsTotal: client.Counter<'method' | 'status_code'>
	httpRequestDurationSeconds: client.Histogram<'method' | 'status_code'>
}

function createMetrics(): Metrics {
	const register = new client.Registry()

	register.setDefaultLabels({
		application: 'osem_frontend',
	})

	client.collectDefaultMetrics({
		register,
		prefix: 'osem_',
	})

	const httpRequestsTotal = new client.Counter({
		name: 'osem_http_requests_total',
		help: 'Total number of HTTP requests handled by the React Router server',
		labelNames: ['method', 'status_code'],
		registers: [register],
	})

	const httpRequestDurationSeconds = new client.Histogram({
		name: 'osem_http_request_duration_seconds',
		help: 'HTTP request duration in seconds for requests handled by the React Router server',
		labelNames: ['method', 'status_code'],
		buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
		registers: [register],
	})

	return {
		register,
		httpRequestsTotal,
		httpRequestDurationSeconds,
	}
}

declare global {
	var __osemMetrics: Metrics | undefined
}

export const metrics = globalThis.__osemMetrics ?? createMetrics()

globalThis.__osemMetrics = metrics

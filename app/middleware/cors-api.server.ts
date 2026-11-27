import { type MiddlewareFunction } from 'react-router'

export const corsApiMiddleware: MiddlewareFunction<Response> = async (
	{ request },
	next,
) => {
	const preflight = request.method === 'OPTIONS'
	const withCors = (response: Response) => {
		const headers = new Headers(response.headers)
		const method =
			request.headers.get('access-control-request-method') ?? request.method
		const requestedHeaders = request.headers.get(
			'access-control-request-headers',
		)
		headers.set('Access-Control-Allow-Origin', '*')
		headers.set(
			'Access-Control-Allow-Methods',
			`${method.toUpperCase()}, OPTIONS`,
		)
		headers.set(
			'Access-Control-Allow-Headers',
			requestedHeaders ?? 'authorization',
		)
		headers.set('Access-Control-Expose-Headers', 'content-disposition')
		return new Response(response.body, {
			status: response.status,
			statusText: response.statusText,
			headers,
		})
	}
	if (preflight) return withCors(new Response(null, { status: 204 }))
	try {
		return withCors(await next())
	} catch (error) {
		throw error instanceof Response ? withCors(error) : error
	}
}

import { type MiddlewareFunction } from 'react-router'
import { StandardResponse } from '~/lib/responses'

const methodMatches = (request: Request, methods?: string[]) => {
	if (!methods || methods.length === 0) return true

	const allowedMethods = methods.map((method) => method.toUpperCase())
	return allowedMethods.includes(request.method.toUpperCase())
}

const getContentType = (request: Request) =>
	request.headers.get('content-type')?.toLowerCase() ?? ''

export const validateJsonContentType = (
	request: Request,
	methods?: string[],
): Response | undefined => {
	if (!methodMatches(request, methods)) return undefined

	const contentType = getContentType(request)

	if (!contentType.includes('application/json')) {
		return StandardResponse.unsupportedMediaType(
			'Unsupported content-type. Try application/json',
		)
	}

	return undefined
}

export const validateFormContentType = (
	request: Request,
	methods?: string[],
): Response | undefined => {
	if (!methodMatches(request, methods)) return undefined

	const contentType = getContentType(request)

	if (
		!contentType.includes('application/x-www-form-urlencoded') &&
		!contentType.includes('multipart/form-data')
	) {
		return StandardResponse.unsupportedMediaType(
			'Unsupported content-type. Try application/x-www-form-urlencoded',
		)
	}

	return undefined
}

export const validateJsonOrFormContentType = (
	request: Request,
	methods?: string[],
): Response | undefined => {
	if (!methodMatches(request, methods)) return undefined

	const contentType = getContentType(request)

	if (
		!contentType.includes('application/json') &&
		!contentType.includes('application/x-www-form-urlencoded') &&
		!contentType.includes('multipart/form-data')
	) {
		return StandardResponse.unsupportedMediaType(
			'Unsupported content-type. Try application/json or application/x-www-form-urlencoded',
		)
	}

	return undefined
}

/**
 * Responds with 415 Unsupported Media Type if the request does not use JSON.
 */
export const requestContentTypeJson =
	(methods?: string[]): MiddlewareFunction<Response> =>
	({ request }) =>
		validateJsonContentType(request, methods)

/**
 * Responds with 415 Unsupported Media Type if the request does not use form data.
 */
export const requestContentTypeForm =
	(methods?: string[]): MiddlewareFunction<Response> =>
	({ request }) =>
		validateFormContentType(request, methods)

/**
 * Responds with 415 Unsupported Media Type if the request does not use JSON or form data.
 */
export const requestContentTypeJsonOrForm =
	(methods?: string[]): MiddlewareFunction<Response> =>
	({ request }) =>
		validateJsonOrFormContentType(request, methods)

/**
 * Sets Content-Type: application/json; charset=utf-8 for outgoing responses.
 */
export const responseContentTypeJson: MiddlewareFunction<Response> = async (
	_,
	next,
) => {
	const res = await next()

	if (!res.headers.has('Content-Type')) {
		res.headers.set('Content-Type', 'application/json; charset=utf-8')
	}

	return res
}

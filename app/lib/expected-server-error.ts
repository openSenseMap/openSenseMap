import { isRouteErrorResponse } from 'react-router'

export function isExpectedServerError(error: unknown, request: Request) {
	if (
		request.signal.aborted &&
		(error === request.signal.reason ||
			(error instanceof Error &&
				(error.name === 'AbortError' ||
					error.message.startsWith('Request aborted:') ||
					error.message.includes(
						'call aborted without an `AbortSignal.reason`',
					))))
	) {
		return true
	}
	if (
		!isRouteErrorResponse(error) ||
		!('internal' in error) ||
		error.internal !== true
	) {
		return false
	}

	const message = error.data instanceof Error ? error.data.message : ''

	if (error.status === 404) return message.startsWith('No route matches URL ')
	if (error.status === 405) {
		return (
			message.includes('did not provide an `action`') ||
			message.startsWith('Invalid request method ')
		)
	}
	if (error.status === 400) {
		return (
			message.includes('did not provide a `loader`') ||
			message === 'Unable to encode submission body'
		)
	}

	return false
}

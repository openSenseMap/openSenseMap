import * as Sentry from '@sentry/react-router'

type ServerLogAttributes = Record<string, string | number | boolean>

export function getErrorLogAttributes(error: unknown) {
	if (error instanceof Response) {
		return {
			'error.type': 'Response',
			'http.response.status_code': error.status,
		}
	}

	if (error instanceof Error) {
		return {
			'error.type': error.name,
		}
	}

	return {
		'error.type': typeof error,
	}
}

export function logServerError(
	message: string,
	error: unknown,
	attributes: ServerLogAttributes = {},
) {
	Sentry.logger.error(message, {
		...attributes,
		...getErrorLogAttributes(error),
	})
}

export function logServerWarning(
	message: string,
	error: unknown,
	attributes: ServerLogAttributes = {},
) {
	Sentry.logger.warn(message, {
		...attributes,
		...getErrorLogAttributes(error),
	})
}

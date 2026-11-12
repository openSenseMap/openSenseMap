const DISABLED_SENTRY_DATA_COLLECTION = Object.freeze({
	userInfo: false,
	cookies: false,
	httpHeaders: {
		request: { allow: ['accept', 'content-type'] },
		response: { allow: ['content-type', 'content-length'] },
	},
	httpBodies: [],
	urlQueryParams: false,
	graphQL: Object.freeze({ document: false, variables: false }),
	genAI: Object.freeze({ inputs: false, outputs: false }),
	databaseQueryData: false,
	queues: false,
	stackFrameVariables: false,
	frameContextLines: 0,
})

const SENSITIVE_ATTRIBUTE_NAMES = [
	'api.key',
	'apikey',
	'authorization',
	'cookie',
	'email',
	'password',
	'passwd',
	'secret',
	'session',
	'token',
]

export const sentryPrivacyOptions = Object.freeze({
	dataCollection: DISABLED_SENTRY_DATA_COLLECTION,
	maxBreadcrumbs: 0,
	beforeSend: sanitizeSentryEvent,
	beforeSendLog: sanitizeSentryLog,
	beforeSendSpan: sanitizeSentrySpan,
})

export function sanitizeSentryEvent(event) {
	if (typeof event.message === 'string') {
		event.message = redactSensitiveText(event.message)
	}

	for (const exception of event.exception?.values ?? []) {
		if (typeof exception.value === 'string') {
			exception.value = redactSensitiveText(exception.value)
		}
		sanitizeStacktrace(exception.stacktrace)
		sanitizeStacktrace(exception.raw_stacktrace)
	}

	return event
}

export function sanitizeSentryLog(log) {
	return {
		...log,
		message: redactSensitiveText(String(log.message)),
		attributes: sanitizeAttributes(log.attributes),
	}
}

export function sanitizeSentrySpan(span) {
	return {
		...span,
		name: sanitizeSpanName(span.name),
		attributes: sanitizeAttributes(span.attributes),
	}
}

function sanitizeAttributes(attributes = {}) {
	const sanitized = {}

	for (const [key, value] of Object.entries(attributes)) {
		// consoleLoggingIntegration stores the original console arguments in
		// parameter.* attributes. The redacted message is sufficient and avoids
		// sending raw Error objects or other arbitrary values twice.
		if (key.startsWith('parameter.') || isSensitiveAttributeName(key)) continue
		sanitized[key] = value
	}

	return sanitized
}

function isSensitiveAttributeName(key) {
	const normalized = key.toLowerCase().replaceAll('-', '.').replaceAll('_', '.')

	return SENSITIVE_ATTRIBUTE_NAMES.some(
		(name) => normalized === name || normalized.endsWith(`.${name}`),
	)
}

function redactSensitiveText(value) {
	// Sentry filters known structured fields, but arbitrary exception and log
	// messages can still contain an email address or a copied credential.
	return value
		.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[Filtered email]')
		.replace(/\b(?:Bearer|Basic)\s+[A-Za-z0-9._~+/=-]+/gi, '[Filtered auth]')
		.replace(
			/(["']?)\b(password|passwd|secret|token|api[-_. ]?key|session)\1\s*[:=]\s*[^\s,;]+/gi,
			'$1=[Filtered]',
		)
		.replace(
			/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,
			'[Filtered token]',
		)
}

function sanitizeSpanName(value) {
	if (typeof value !== 'string' || value.length === 0) {
		return 'Application operation'
	}

	return value.split('?', 1)[0].split('#', 1)[0]
}

function sanitizeStacktrace(stacktrace) {
	for (const frame of stacktrace?.frames ?? []) {
		if (frame.filename) {
			frame.filename = frame.filename.split('?', 1)[0].split('#', 1)[0]
		}
	}
}

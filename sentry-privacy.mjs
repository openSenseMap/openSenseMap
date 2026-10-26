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

const MAX_LOG_MESSAGE_LENGTH = 2_000
const MAX_ATTRIBUTE_STRING_LENGTH = 500
const MAX_ATTRIBUTE_ARRAY_LENGTH = 20

const SENSITIVE_ATTRIBUTE_NAMES = [
	'address',
	'api.key',
	'apikey',
	'authorization',
	'cookie',
	'db.query.text',
	'db.statement',
	'device.id',
	'deviceid',
	'email',
	'http.request.body',
	'http.target',
	'http.url',
	'http.response.body',
	'ip',
	'latitude',
	'longitude',
	'password',
	'passwd',
	'request.body',
	'response.body',
	'secret',
	'sensor.id',
	'sensorid',
	'session',
	'token',
	'url.full',
	'url.path',
	'url.query',
	'url.search',
	'user',
]

export const sentryPrivacyOptions = Object.freeze({
	dataCollection: DISABLED_SENTRY_DATA_COLLECTION,
	maxBreadcrumbs: 0,
	beforeSend: sanitizeSentryEvent,
	beforeSendLog: sanitizeSentryLog,
	beforeSendSpan: sanitizeSentrySpan,
})

export function sanitizeSentryEvent(event) {
	delete event.user
	delete event.server_name
	delete event.extra
	delete event.breadcrumbs

	if (event.request) {
		const method = getSafeHttpMethod(event.request.method)
		event.request = method ? { method } : undefined
	}

	if (typeof event.message === 'string') {
		event.message = redactSensitiveText(event.message)
	}

	if (event.logentry) {
		delete event.logentry.params
		if (typeof event.logentry.message === 'string') {
			event.logentry.message = redactSensitiveText(event.logentry.message)
		}
		if (typeof event.logentry.formatted === 'string') {
			event.logentry.formatted = redactSensitiveText(event.logentry.formatted)
		}
	}

	if (event.tags) event.tags = sanitizeAttributes(event.tags)
	if (typeof event.transaction === 'string') {
		event.transaction = sanitizeSpanName(event.transaction)
	}

	for (const exception of event.exception?.values ?? []) {
		if (typeof exception.value === 'string') {
			exception.value = redactSensitiveText(exception.value)
		}
		if (exception.mechanism) delete exception.mechanism.data
		sanitizeStacktrace(exception.stacktrace)
		sanitizeStacktrace(exception.raw_stacktrace)
	}

	for (const thread of event.threads?.values ?? []) {
		sanitizeStacktrace(thread.stacktrace)
		sanitizeStacktrace(thread.raw_stacktrace)
	}

	return event
}

export function sanitizeSentryLog(log) {
	return {
		...log,
		message: redactSensitiveText(String(log.message), MAX_LOG_MESSAGE_LENGTH),
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

		const sanitizedValue = sanitizeAttributeValue(value)
		if (sanitizedValue !== undefined) sanitized[key] = sanitizedValue
	}

	return sanitized
}

function sanitizeAttributeValue(value) {
	if (typeof value === 'string') {
		return redactSensitiveText(value, MAX_ATTRIBUTE_STRING_LENGTH)
	}
	if (typeof value === 'number') {
		return Number.isFinite(value) ? value : undefined
	}
	if (typeof value === 'boolean') return value

	if (Array.isArray(value)) {
		const sanitized = value
			.slice(0, MAX_ATTRIBUTE_ARRAY_LENGTH)
			.map(sanitizeAttributeValue)
			.filter((item) => item !== undefined && !Array.isArray(item))

		return sanitized.length > 0 ? sanitized : undefined
	}

	return undefined
}

function isSensitiveAttributeName(key) {
	const normalized = key.toLowerCase().replace(/[-_]/g, '.')

	return SENSITIVE_ATTRIBUTE_NAMES.some(
		(name) =>
			normalized === name ||
			normalized.startsWith(`${name}.`) ||
			normalized.endsWith(`.${name}`) ||
			normalized.includes(`.${name}.`),
	)
}

function redactSensitiveText(value, maxLength = MAX_LOG_MESSAGE_LENGTH) {
	return value
		.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[Filtered email]')
		.replace(/\b(?:Bearer|Basic)\s+[A-Za-z0-9._~+/=-]+/gi, '[Filtered auth]')
		.replace(
			/\b(password|passwd|secret|token|api[-_. ]?key|session)\s*[:=]\s*[^\s,;]+/gi,
			'$1=[Filtered]',
		)
		.replace(
			/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,
			'[Filtered token]',
		)
		.replace(
			/\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi,
			'[Filtered id]',
		)
		.replace(/\b[0-9a-f]{24}\b/gi, '[Filtered id]')
		.slice(0, maxLength)
}

function sanitizeSpanName(value) {
	if (typeof value !== 'string' || value.length === 0) {
		return 'Application operation'
	}

	const withoutQuery = value.split(/[?#]/, 1)[0]
	return redactSensitiveText(
		withoutQuery
			.replace(
				/\/(?:[0-9a-f]{24}|[0-9a-f]{8}-[0-9a-f-]{27}|\d+)(?=\/|$)/gi,
				'/:id',
			)
			.slice(0, 200),
		200,
	)
}

function getSafeHttpMethod(value) {
	if (typeof value !== 'string') return undefined

	const method = value.toUpperCase()
	return ['DELETE', 'GET', 'HEAD', 'OPTIONS', 'PATCH', 'POST', 'PUT'].includes(
		method,
	)
		? method
		: undefined
}

function sanitizeStacktrace(stacktrace) {
	for (const frame of stacktrace?.frames ?? []) {
		delete frame.vars
		delete frame.abs_path
		delete frame.context_line
		delete frame.pre_context
		delete frame.post_context
		delete frame.module_metadata
		delete frame.package

		if (frame.filename) {
			frame.filename = frame.filename.split(/[?#]/, 1)[0]
		}
	}
}

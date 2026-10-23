const DISABLED_SENTRY_DATA_COLLECTION = Object.freeze({
	userInfo: false,
	cookies: false,
	httpHeaders: false,
	httpBodies: [],
	urlQueryParams: false,
	graphQL: Object.freeze({ document: false, variables: false }),
	genAI: Object.freeze({ inputs: false, outputs: false }),
	databaseQueryData: false,
	queues: false,
	stackFrameVariables: false,
	frameContextLines: 0,
})

const SAFE_LOG_STRING_ATTRIBUTE_VALUES = new Map([
	[
		'app.operation',
		new Set([
			'device.compile',
			'device.create',
			'device_image.delete',
			'device_image.presign',
			'device_image.upload',
			'device_security.rotate_api_key',
			'device_security.update_authentication',
			'device_transfer.create',
			'device_transfer.remove',
			'email.send',
			'healthcheck',
			'integration.create',
			'integration.delete',
			'integration.reconcile_sensors',
			'integration.update',
			'measurement.export_setup',
			'measurement.export_stream',
			'measurement.manual_upload',
		]),
	],
	[
		'elevation.error_code',
		new Set([
			'consent_required',
			'invalid_location',
			'invalid_response',
			'rate_limited',
			'timeout',
			'unexpected',
			'upstream_error',
		]),
	],
	['email.transport', new Set(['smtp'])],
	['export.format', new Set(['csv', 'json'])],
	['healthcheck.name', new Set(['database-and-self-request'])],
	['service', new Set(['opensensemap-frontend'])],
	['storage.provider', new Set(['s3'])],
	['upstream.service', new Set(['sensebox-compiler'])],
])

const SAFE_LOG_BOOLEAN_ATTRIBUTE_KEYS = new Set([
	'device.authentication_enabled',
	'email.has_attachments',
])

const SAFE_LOG_COUNT_ATTRIBUTE_KEYS = new Set([
	'export.column_count',
	'sensor.count',
])

const SAFE_SPAN_COUNT_ATTRIBUTE_KEYS = new Set([
	'measurement.count',
	'measurement.last_measurement_count',
	'measurement.location_count',
	'measurement.location_update_count',
	'measurement.sensor_count',
])

const SAFE_CUSTOM_SPAN_NAMES = new Set([
	'Decode measurements',
	'Persist measurements',
	'Persist measurement transaction',
	'Resolve measurement locations',
])

// Only developer-authored, static messages are allowed. Unknown messages are
// dropped so a future dynamic log cannot accidentally contain user input.
const SAFE_LOG_MESSAGES = new Set([
	'Application health check failed',
	'Compiler service request failed',
	'Compiler service returned an error response',
	'Device API key rotation failed',
	'Device authentication setting update failed',
	'Device creation failed',
	'Device image storage operation failed',
	'Device integration provisioning failed',
	'Device integration reconciliation failed',
	'Device integration removal failed',
	'Device integration update failed',
	'Device transfer operation failed unexpectedly',
	'Manual measurement upload failed unexpectedly',
	'Measurement export setup failed unexpectedly',
	'Measurement export stream failed',
	'Sentry server instrumentation initialized',
	'Terrain elevation lookup failed',
	'Transactional email delivery failed',
	'Unhandled React Router server error',
])

export const sentryPrivacyOptions = Object.freeze({
	dataCollection: DISABLED_SENTRY_DATA_COLLECTION,
	maxBreadcrumbs: 0,
	beforeSend: sanitizeSentryEvent,
	beforeSendLog: sanitizeSentryLog,
	beforeSendSpan: sanitizeSentrySpan,
})

export function sanitizeSentryEvent(event) {
	const requestMethod = getSafeHttpMethod(event.request?.method)
	const route = getSafeRoute(event.contexts?.trace?.data?.['http.route'])

	delete event.user
	delete event.server_name
	delete event.message
	delete event.logentry
	delete event.extra
	delete event.tags
	delete event.fingerprint
	delete event.breadcrumbs
	delete event.logger
	delete event.culprit

	if (requestMethod) {
		event.request = { method: requestMethod }
	} else {
		delete event.request
	}

	if (event.exception?.values) {
		for (const exception of event.exception.values) {
			exception.type = getSafeErrorType(exception.type)
			exception.value = exception.type
			if (exception.mechanism) delete exception.mechanism.data
			sanitizeStacktrace(exception.stacktrace)
			sanitizeStacktrace(exception.raw_stacktrace)
		}
	}

	if (event.threads?.values) {
		for (const thread of event.threads.values) {
			delete thread.name
			sanitizeStacktrace(thread.stacktrace)
			sanitizeStacktrace(thread.raw_stacktrace)
		}
	}

	const trace = getSafeTraceContext(event.contexts?.trace)
	event.contexts = trace ? { trace } : {}

	if (route) {
		event.transaction = requestMethod ? `${requestMethod} ${route}` : route
	} else {
		delete event.transaction
	}

	return event
}

export function sanitizeSentryLog(log) {
	if (!SAFE_LOG_MESSAGES.has(String(log.message))) return null

	const attributes = {}

	for (const [key, value] of Object.entries(log.attributes ?? {})) {
		const sanitizedValue = getSafeLogAttribute(key, value)
		if (sanitizedValue !== undefined) attributes[key] = sanitizedValue
	}

	return {
		...log,
		attributes,
	}
}

export function sanitizeSentrySpan(span) {
	const attributes = {}

	for (const [key, value] of Object.entries(span.attributes ?? {})) {
		const sanitizedValue = getSafeSpanAttribute(key, value)
		if (sanitizedValue !== undefined) attributes[key] = sanitizedValue
	}

	const operation = getStringAttribute(attributes, 'sentry.op')
	const method = getStringAttribute(attributes, 'http.request.method')
	const route = getStringAttribute(attributes, 'http.route')

	return {
		...span,
		name: getSafeSpanName({ name: span.name, operation, method, route }),
		attributes,
		links: undefined,
	}
}

function getSafeSpanName({ name, operation, method, route }) {
	if (SAFE_CUSTOM_SPAN_NAMES.has(name)) return name

	if (operation?.startsWith('http.server')) {
		return route ? `${method ?? 'HTTP'} ${route}` : 'HTTP request'
	}

	if (operation?.startsWith('http.client')) {
		return `${method ?? 'HTTP'} outbound request`
	}

	if (operation === 'navigation') {
		return route ? `Navigate ${route}` : 'Navigation'
	}

	if (operation === 'pageload') {
		return route ? `Load ${route}` : 'Page load'
	}

	if (operation?.startsWith('db')) return 'Database query'

	return 'Application operation'
}

function getSafeRoute(value) {
	if (typeof value !== 'string' || value.length === 0) return undefined
	if (!value.startsWith('/') || value.includes('?') || value.includes('#')) {
		return undefined
	}
	if (value === '/') return value

	// React Router route templates use named parameters. Raw URL paths are not
	// accepted because their segments can contain user or device identifiers.
	const segments = value.split('/').filter(Boolean)
	let containsParameter = false

	for (const segment of segments) {
		if (/^:[A-Za-z][A-Za-z0-9_]*\??$/.test(segment)) {
			containsParameter = true
			continue
		}

		if (/^\*[A-Za-z0-9_]*$/.test(segment)) {
			containsParameter = true
			continue
		}

		if (!/^[A-Za-z][A-Za-z0-9._-]*$/.test(segment)) return undefined
	}

	return containsParameter ? value : undefined
}

function getSafeLogAttribute(key, value) {
	if (key === 'error.type') return getSafeErrorType(value)
	if (key === 'http.request.method') return getSafeHttpMethod(value)
	if (key === 'http.response.status_code') return getSafeHttpStatus(value)
	if (key === 'sentry.environment') return getSafeEnvironment(value)
	if (key === 'sentry.release') return getSafeRelease(value)
	if (key === 'sentry.sdk.name') return getSafeSdkIdentifier(value)
	if (key === 'sentry.sdk.version') return getSafeSdkIdentifier(value)
	if (key === 'sentry.trace.parent_span_id') return getSafeHexId(value, 16)
	if (key === 'traces_sample_rate') return getSafeSampleRate(value)

	if (SAFE_LOG_BOOLEAN_ATTRIBUTE_KEYS.has(key)) {
		return typeof value === 'boolean' ? value : undefined
	}

	if (SAFE_LOG_COUNT_ATTRIBUTE_KEYS.has(key)) {
		return getSafeCount(value)
	}

	const allowedValues = SAFE_LOG_STRING_ATTRIBUTE_VALUES.get(key)
	return typeof value === 'string' && allowedValues?.has(value)
		? value
		: undefined
}

function getSafeSpanAttribute(key, value) {
	if (key === 'http.request.method') return getSafeHttpMethod(value)
	if (key === 'http.response.status_code') return getSafeHttpStatus(value)
	if (key === 'http.route') return getSafeRoute(value)
	if (key === 'sentry.op') return getSafeSpanOperation(value)
	if (key === 'sentry.sample_rate') return getSafeSampleRate(value)
	if (key === 'measurement.has_location') {
		return typeof value === 'boolean' ? value : undefined
	}
	if (SAFE_SPAN_COUNT_ATTRIBUTE_KEYS.has(key)) return getSafeCount(value)

	return undefined
}

function getStringAttribute(attributes, key) {
	const value = attributes[key]
	return typeof value === 'string' ? value : undefined
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

function getSafeHttpStatus(value) {
	return Number.isInteger(value) && value >= 100 && value <= 599
		? value
		: undefined
}

function getSafeCount(value) {
	return Number.isInteger(value) && value >= 0 ? value : undefined
}

function getSafeSampleRate(value) {
	return typeof value === 'number' && value >= 0 && value <= 1
		? value
		: undefined
}

function getSafeSpanOperation(value) {
	if (typeof value !== 'string') return undefined
	if (value.startsWith('http.server')) return 'http.server'
	if (value.startsWith('http.client')) return 'http.client'
	if (value.startsWith('db')) return 'db'
	if (value === 'navigation' || value === 'pageload') return value
	return undefined
}

function getSafeEnvironment(value) {
	return typeof value === 'string' && /^[A-Za-z0-9_.-]{1,64}$/.test(value)
		? value
		: undefined
}

function getSafeRelease(value) {
	return typeof value === 'string' && /^[A-Za-z0-9._+-]{1,128}$/.test(value)
		? value
		: undefined
}

function getSafeSdkIdentifier(value) {
	return typeof value === 'string' && /^[A-Za-z0-9._/-]{1,128}$/.test(value)
		? value
		: undefined
}

function getSafeTraceContext(trace) {
	if (!trace || typeof trace !== 'object') return undefined

	const operation = getSafeSpanOperation(trace.op)
	const traceId = getSafeHexId(trace.trace_id, 32)
	const spanId = getSafeHexId(trace.span_id, 16)
	const parentSpanId = getSafeHexId(trace.parent_span_id, 16)

	if (!operation && !traceId && !spanId && !parentSpanId) return undefined

	return {
		...(operation ? { op: operation } : {}),
		...(traceId ? { trace_id: traceId } : {}),
		...(spanId ? { span_id: spanId } : {}),
		...(parentSpanId ? { parent_span_id: parentSpanId } : {}),
	}
}

function getSafeHexId(value, length) {
	return typeof value === 'string' &&
		new RegExp(`^[a-f0-9]{${length}}$`, 'i').test(value)
		? value
		: undefined
}

function getSafeErrorType(value) {
	return typeof value === 'string' &&
		/^[A-Za-z][A-Za-z0-9_.-]{0,63}$/.test(value)
		? value
		: 'Error'
}

function sanitizeStacktrace(stacktrace) {
	for (const frame of stacktrace?.frames ?? []) {
		delete frame.vars
		if (frame.filename) frame.filename = stripUrlDetails(frame.filename)
		delete frame.abs_path
		delete frame.context_line
		delete frame.pre_context
		delete frame.post_context
		delete frame.module_metadata
		delete frame.package
	}
}

function stripUrlDetails(value) {
	const queryIndex = value.indexOf('?')
	const fragmentIndex = value.indexOf('#')
	const firstPrivatePart = Math.min(
		queryIndex === -1 ? value.length : queryIndex,
		fragmentIndex === -1 ? value.length : fragmentIndex,
	)

	return value.slice(0, firstPrivatePart)
}

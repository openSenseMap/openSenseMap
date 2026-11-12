import { describe, expect, test } from 'vite-plus/test'
import {
	sanitizeSentryEvent,
	sanitizeSentryLog,
	sanitizeSentrySpan,
	sentryPrivacyOptions,
} from '../../sentry-privacy.mjs'

describe('Sentry privacy controls', () => {
	test('disables automatic collection of potentially sensitive data', () => {
		expect(sentryPrivacyOptions.dataCollection).toMatchObject({
			userInfo: false,
			cookies: false,
			httpHeaders: {
				request: { allow: ['accept', 'content-type'] },
				response: { allow: ['content-type', 'content-length'] },
			},
			httpBodies: [],
			urlQueryParams: false,
			graphQL: { document: false, variables: false },
			genAI: { inputs: false, outputs: false },
			databaseQueryData: false,
			queues: false,
			stackFrameVariables: false,
			frameContextLines: 0,
		})
		expect(sentryPrivacyOptions.maxBreadcrumbs).toBe(0)
	})

	test('redacts error text and stack filenames without removing SDK-managed context', () => {
		const event = sanitizeSentryEvent({
			message: 'Failure for person@example.org',
			user: { id: 'user-123' },
			request: {
				method: 'post',
				url: 'https://example.org/device/device-123',
				headers: { accept: 'application/json' },
			},
			extra: { retryCount: 2 },
			breadcrumbs: [{ message: 'Opened settings' }],
			exception: {
				values: [
					{
						value: 'Could not save person@example.org',
						mechanism: { data: { source: 'react-router' } },
						stacktrace: {
							frames: [
								{
									filename: 'app.js?token=secret#source',
									abs_path: '/home/private/app.js',
									context_line: 'throw new Error()',
									vars: { attempt: 2 },
								},
							],
						},
					},
				],
			},
		})

		expect(event.request).toEqual({
			method: 'post',
			url: 'https://example.org/device/device-123',
			headers: { accept: 'application/json' },
		})
		expect(event.message).toBe('Failure for [Filtered email]')
		expect(event.exception?.values?.[0]?.value).toBe(
			'Could not save [Filtered email]',
		)
		expect(event.exception?.values?.[0]?.mechanism).toEqual({
			data: { source: 'react-router' },
		})
		expect(event.exception?.values?.[0]?.stacktrace?.frames?.[0]).toEqual({
			filename: 'app.js',
			abs_path: '/home/private/app.js',
			context_line: 'throw new Error()',
			vars: { attempt: 2 },
		})
		expect(event.user).toEqual({ id: 'user-123' })
		expect(event.extra).toEqual({ retryCount: 2 })
		expect(event.breadcrumbs).toEqual([{ message: 'Opened settings' }])
	})

	test('filters sensitive values while retaining operational attributes', () => {
		expect(
			sanitizeSentryLog({
				level: 'error',
				message: 'A newly added operation failed for person@example.org',
				attributes: {
					'app.operation': 'device.archive',
					'http.response.status_code': 503,
					'user.id': 'user-123',
					'device.id': 'device-123',
					'device.latitude': 51.96,
					'email.has_attachments': true,
					'diagnostic.steps': ['load', 'validate'],
					email: 'person@example.org',
				},
			}),
		).toEqual({
			level: 'error',
			message: 'A newly added operation failed for [Filtered email]',
			attributes: {
				'app.operation': 'device.archive',
				'http.response.status_code': 503,
				'user.id': 'user-123',
				'device.id': 'device-123',
				'device.latitude': 51.96,
				'email.has_attachments': true,
				'diagnostic.steps': ['load', 'validate'],
			},
		})
	})

	test('keeps console logs but removes their raw argument attributes', () => {
		expect(
			sanitizeSentryLog({
				level: 'error',
				message: 'Request failed for person@example.org token=secret',
				attributes: {
					'sentry.origin': 'auto.console.logging',
					'parameter.0': { email: 'person@example.org' },
					'parameter.1': 'token=secret',
				},
			}),
		).toEqual({
			level: 'error',
			message: 'Request failed for [Filtered email] token=[Filtered]',
			attributes: {
				'sentry.origin': 'auto.console.logging',
			},
		})
	})

	test('keeps useful span attributes and removes query data from the span name', () => {
		const span = sanitizeSentrySpan({
			name: 'GET /device/507f1f77bcf86cd799439011?token=secret#details',
			attributes: {
				'sentry.op': 'http.server',
				'http.response.status_code': 200,
				'url.full': 'https://example.org/device/507f1f77bcf86cd799439011?token=secret&detail=something&password=verysecret',
				'user.id': 'user-123',
			},
		})

		expect(span.name).toBe('GET /device/507f1f77bcf86cd799439011')
		expect(span.attributes).toEqual({
			'sentry.op': 'http.server',
			'http.response.status_code': 200,
			'user.id': 'user-123',
		})
	})

	test('does not truncate log or error messages', () => {
		const message = 'x'.repeat(2_500)

		expect(sanitizeSentryLog({ message }).message).toBe(message)
		expect(sanitizeSentryEvent({ message }).message).toBe(message)
	})

	test('does not treat arbitrary UUID and hexadecimal identifiers as PII', () => {
		expect(
			sanitizeSentryLog({
				level: 'error',
				message:
					'Device 507f1f77bcf86cd799439011 request 550e8400-e29b-41d4-a716-446655440000 failed',
			}),
		).toMatchObject({
			message:
				'Device 507f1f77bcf86cd799439011 request 550e8400-e29b-41d4-a716-446655440000 failed',
		})
	})
})

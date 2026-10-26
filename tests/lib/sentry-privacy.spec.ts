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
			httpHeaders: false,
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

	test('keeps useful error details while removing request and stack data', () => {
		const event = sanitizeSentryEvent({
			message: 'Failure for person@example.org',
			user: { id: 'user-123', email: 'person@example.org' },
			request: {
				method: 'post',
				url: 'https://example.org/device/secret?token=secret',
				headers: { authorization: 'Bearer secret' },
				data: { email: 'person@example.org' },
			},
			extra: { token: 'secret' },
			exception: {
				values: [
					{
						value: 'Could not save person@example.org',
						stacktrace: {
							frames: [
								{
									filename: 'app.js?token=secret',
									abs_path: '/home/private/app.js',
									vars: { token: 'secret' },
								},
							],
						},
					},
				],
			},
		})

		expect(event.request).toEqual({ method: 'POST' })
		expect(event.message).toBe('Failure for [Filtered email]')
		expect(event.exception?.values?.[0]?.value).toBe(
			'Could not save [Filtered email]',
		)
		expect(event.exception?.values?.[0]?.stacktrace?.frames?.[0]).toEqual({
			filename: 'app.js',
		})
		expect(event).not.toHaveProperty('user')
		expect(event).not.toHaveProperty('extra')
	})

	test('keeps new structured logs without maintaining message allowlists', () => {
		expect(
			sanitizeSentryLog({
				level: 'error',
				message: 'A newly added operation failed for person@example.org',
				attributes: {
					'app.operation': 'device.archive',
					'http.response.status_code': 503,
					'user.id': 'user-123',
				},
			}),
		).toEqual({
			level: 'error',
			message: 'A newly added operation failed for [Filtered email]',
			attributes: {
				'app.operation': 'device.archive',
				'http.response.status_code': 503,
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

	test('removes sensitive span attributes and normalizes identifiers', () => {
		const span = sanitizeSentrySpan({
			name: 'GET /device/507f1f77bcf86cd799439011?token=secret',
			attributes: {
				'sentry.op': 'http.server',
				'http.response.status_code': 200,
				'url.full':
					'https://example.org/device/507f1f77bcf86cd799439011?token=secret',
				'user.id': 'user-123',
			},
		})

		expect(span.name).toBe('GET /device/:id')
		expect(span.attributes).toEqual({
			'sentry.op': 'http.server',
			'http.response.status_code': 200,
		})
	})
})

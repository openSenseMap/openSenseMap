import 'dotenv/config'
import * as Sentry from '@sentry/react-router'
import { sentryPrivacyOptions } from './sentry-privacy.mjs'

const configuredSampleRate = Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 1)
const tracesSampleRate =
	process.env.SENTRY_TRACES_SAMPLE_RATE === undefined ||
	(Number.isFinite(configuredSampleRate) &&
		configuredSampleRate >= 0 &&
		configuredSampleRate <= 1)
		? configuredSampleRate
		: 0

if (process.env.SENTRY_DSN) {
	Sentry.init({
		dsn: process.env.SENTRY_DSN,
		environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,
		release: process.env.SENTRY_RELEASE,
		includeServerName: false,
		...sentryPrivacyOptions,
		integrations: [
			Sentry.consoleLoggingIntegration({ levels: ['error'] }),
		],
		tracesSampleRate,
	})

	Sentry.logger.info('Sentry server instrumentation initialized', {
		service: 'opensensemap-frontend',
		environment:
			process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? 'unknown',
		release: process.env.SENTRY_RELEASE ?? 'unversioned',
		traces_sample_rate: tracesSampleRate,
	})
}

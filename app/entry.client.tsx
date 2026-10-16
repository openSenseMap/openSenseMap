import * as Sentry from '@sentry/react-router'
import i18next from 'i18next'
import I18nextBrowserLanguageDetector from 'i18next-browser-languagedetector'
import I18NextHttpBackend from 'i18next-http-backend'
import { startTransition, StrictMode } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { HydratedRouter } from 'react-router/dom'
import { i18nextOptions } from './i18next-config'

if (window.ENV.SENTRY_DSN) {
	Sentry.init({
		dsn: window.ENV.SENTRY_DSN,
		environment: window.ENV.SENTRY_ENVIRONMENT,
		release: window.ENV.SENTRY_RELEASE,
		integrations: [Sentry.reactRouterTracingIntegration()],
		tracesSampleRate: window.ENV.SENTRY_TRACES_SAMPLE_RATE,
	})
}

const sentryInstrumentation = Sentry.createSentryClientInstrumentation({
	captureErrors: false,
})

const hydrate = async () => {
	await i18next
		.use(initReactI18next)
		.use(I18NextHttpBackend)
		// The language detector only uses htmlTag which is set
		// in root.tsx, so it won't cause hydration mismatches.
		.use(I18nextBrowserLanguageDetector)
		.init({
			...i18nextOptions,
			ns: [i18nextOptions.defaultNS],
			backend: { loadPath: '/locales/{{lng}}/{{ns}}.json' },
			detection: {
				order: ['htmlTag'],
				caches: [],
			},
		})

	startTransition(() => {
		hydrateRoot(
			document,
			<I18nextProvider i18n={i18next}>
				<StrictMode>
					<HydratedRouter
						instrumentations={[sentryInstrumentation]}
						onError={Sentry.sentryOnError}
					/>
				</StrictMode>
			</I18nextProvider>,
		)
	})
}

if (window.requestIdleCallback) {
	window.requestIdleCallback(hydrate)
} else {
	// Safari doesn't support requestIdleCallback
	// https://caniuse.com/requestidlecallback
	window.setTimeout(hydrate, 1)
}

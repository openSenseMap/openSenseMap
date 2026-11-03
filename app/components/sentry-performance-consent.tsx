import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useFetcher, useLocation } from 'react-router'
import { Button } from '~/components/ui/button'
import { type SentryConsentActionData } from '~/routes/resources.sentry-consent'
import { type SentryPerformanceConsent } from '~/services/sentry-consent.server'

type ConsentProps = {
	consent: SentryPerformanceConsent
	sentryEnabled: boolean
}

function useSentryPerformanceConsent() {
	const fetcher = useFetcher<SentryConsentActionData>()

	useEffect(() => {
		if (fetcher.data && 'ok' in fetcher.data) {
			window.location.reload()
		}
	}, [fetcher.data])

	const save = (consent: Exclude<SentryPerformanceConsent, null>) => {
		void fetcher.submit(
			{ consent },
			{ method: 'post', action: '/resources/sentry-consent' },
		)
	}

	return {
		error: fetcher.data && 'error' in fetcher.data ? fetcher.data.error : null,
		isSaving: fetcher.state !== 'idle',
		save,
	}
}

function ConsentButtons({
	isSaving,
	onConsent,
}: {
	isSaving: boolean
	onConsent: (consent: Exclude<SentryPerformanceConsent, null>) => void
}) {
	const { t } = useTranslation()

	return (
		<div className="flex flex-wrap gap-3">
			<Button
				type="button"
				variant="outline"
				disabled={isSaving}
				onClick={() => onConsent('denied')}
			>
				{t('sentry_performance_consent_reject')}
			</Button>
			<Button
				type="button"
				variant="outline"
				disabled={isSaving}
				onClick={() => onConsent('granted')}
			>
				{t('sentry_performance_consent_accept')}
			</Button>
		</div>
	)
}

export function SentryPerformanceConsentBanner({
	consent,
	sentryEnabled,
}: ConsentProps) {
	const { t } = useTranslation()
	const { pathname } = useLocation()
	const { error, isSaving, save } = useSentryPerformanceConsent()

	if (!sentryEnabled || consent !== null || pathname === '/privacy') return null

	return (
		<aside
			role="region"
			aria-labelledby="sentry-performance-consent-title"
			aria-describedby="sentry-performance-consent-description"
			className="bg-background text-foreground fixed inset-x-4 bottom-4 z-40 mx-auto max-w-3xl rounded-lg border p-5 shadow-lg"
		>
			<div className="space-y-3">
				<div>
					<h2
						id="sentry-performance-consent-title"
						className="text-lg font-semibold"
					>
						{t('sentry_performance_consent_title')}
					</h2>
					<p
						id="sentry-performance-consent-description"
						className="text-muted-foreground mt-1 text-sm"
					>
						{t('sentry_performance_consent_description')}{' '}
						<Link to="/privacy" className="underline">
							{t('sentry_performance_consent_privacy_link')}
						</Link>
					</p>
				</div>

				{error && (
					<p className="text-sm text-red-600" role="alert">
						{t('sentry_performance_consent_error')}
					</p>
				)}

				<ConsentButtons isSaving={isSaving} onConsent={save} />
			</div>
		</aside>
	)
}

export function SentryPerformanceConsentSettings({
	consent,
	sentryEnabled,
}: ConsentProps) {
	const { t } = useTranslation()
	const { error, isSaving, save } = useSentryPerformanceConsent()

	if (!sentryEnabled) return null

	const statusKey =
		consent === 'granted'
			? 'sentry_performance_consent_status_granted'
			: consent === 'denied'
				? 'sentry_performance_consent_status_denied'
				: 'sentry_performance_consent_status_undecided'

	return (
		<section className="my-8 space-y-3 rounded-lg border p-5">
			<h2 className="text-2xl font-semibold">
				{t('sentry_performance_consent_settings_title')}
			</h2>
			<p className="text-muted-foreground text-sm">{t(statusKey)}</p>

			{error && (
				<p className="text-sm text-red-600" role="alert">
					{t('sentry_performance_consent_error')}
				</p>
			)}

			<ConsentButtons isSaving={isSaving} onConsent={save} />
		</section>
	)
}

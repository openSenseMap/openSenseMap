import { data } from 'react-router'
import { type Route } from './+types/resources.sentry-consent'
import { setSentryPerformanceConsent } from '~/services/sentry-consent.server'

export type SentryConsentActionData = { ok: true } | { error: string }

export async function action({ request }: Route.ActionArgs) {
	const formData = await request.formData()
	const consent = formData.get('consent')

	if (consent !== 'granted' && consent !== 'denied') {
		return data<SentryConsentActionData>(
			{ error: 'invalid_consent' },
			{ status: 400 },
		)
	}

	return data<SentryConsentActionData>(
		{ ok: true },
		{
			headers: {
				'Set-Cookie': await setSentryPerformanceConsent(consent),
			},
		},
	)
}

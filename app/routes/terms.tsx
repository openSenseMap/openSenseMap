import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { Form, data, redirect } from 'react-router'
import { type Route } from './+types/terms'
import { MarkdownContent } from '~/components/markdown-content'
import { Button } from '~/components/ui/button'
import {
	acceptCurrentTosViaEmailFlow,
	getActiveTosAcceptanceTokenById,
	getCurrentEffectiveTos,
	getTosLocale,
	getTosRequirementForUser,
} from '~/db/models/tos.server'
import { getUser } from '~/services/session-service.server'
import {
	getTosFlowSession,
	tosFlowSessionStorage,
} from '~/services/tos-service.server'

export async function loader({ request }: Route.LoaderArgs) {
	const url = new URL(request.url)
	const tos = await getCurrentEffectiveTos()

	const currentUser = await getUser(request)

	const session = await getTosFlowSession(request)
	const tokenId = session.get('tokenId')
	const tokenUserId = session.get('userId')

	let canAcceptViaEmail = false
	let info:
		| 'accepted'
		| 'already_accepted'
		| 'invalid'
		| 'missing'
		| 'not_configured'
		| null = null

	const tosLink = url.searchParams.get('tosLink')
	if (
		tosLink === 'accepted' ||
		tosLink === 'already_accepted' ||
		tosLink === 'invalid' ||
		tosLink === 'missing' ||
		tosLink === 'not_configured'
	) {
		info = tosLink
	}

	let headers: HeadersInit | undefined

	if (tokenId && tokenUserId) {
		const token = await getActiveTosAcceptanceTokenById(tokenId, tokenUserId)

		if (!token) {
			headers = {
				'Set-Cookie': await tosFlowSessionStorage.destroySession(session),
			}
			info ??= 'invalid'
		} else {
			const req = await getTosRequirementForUser(tokenUserId)
			canAcceptViaEmail = !!req.tos && !req.accepted

			if (req.accepted) {
				headers = {
					'Set-Cookie': await tosFlowSessionStorage.destroySession(session),
				}
				info ??= 'already_accepted'
			}
		}
	}

	if (!tos) {
		return data(
			{
				tos: null,
				canAcceptViaEmail: false,
				info: info ?? 'not_configured',
			},
			{ status: 500, headers },
		)
	}

	const locale = getTosLocale(currentUser?.language ?? null)

	const localizedTos = {
		...tos,
		title: tos.title?.[locale] ?? tos.title?.en ?? '',
		body: tos.body?.[locale] ?? tos.body?.en ?? '',
		locale,
	}

	return data(
		{
			tos: localizedTos,
			canAcceptViaEmail,
			info,
		},
		{ headers },
	)
}

export async function action({ request }: Route.ActionArgs) {
	const formData = await request.formData()

	if (formData.get('intent') !== 'accept_tos_from_email') {
		return data({ error: 'invalid_intent' }, { status: 400 })
	}

	if (formData.get('accepted') !== 'on') {
		return data({ error: 'tos_must_accept' }, { status: 400 })
	}

	const session = await getTosFlowSession(request)
	const tokenId = session.get('tokenId')
	const userId = session.get('userId')

	if (!tokenId || !userId) {
		return data({ error: 'invalid_or_expired_link' }, { status: 403 })
	}

	const result = await acceptCurrentTosViaEmailFlow({ tokenId, userId })

	if (result === 'not_configured') {
		return data({ error: 'not_configured' }, { status: 500 })
	}

	if (result !== 'success') {
		return data({ error: 'invalid_or_expired_link' }, { status: 403 })
	}

	return redirect('/terms?tosLink=accepted', {
		headers: {
			'Set-Cookie': await tosFlowSessionStorage.destroySession(session),
		},
	})
}

export default function TermsPage({
	loaderData: { tos, canAcceptViaEmail, info },
	actionData,
}: Route.ComponentProps) {
	const [checked, setChecked] = React.useState(false)

	const { t, i18n } = useTranslation('terms')

	if (!tos) {
		return <div className="p-6">{t('notConfigured')}</div>
	}

	const effectiveFromDate = new Date(tos.effectiveFrom).toLocaleDateString(
		i18n.language,
	)

	return (
		<div className="mx-auto max-w-3xl space-y-6 p-6">
			<h1 className="text-2xl font-bold">{tos.title}</h1>

			<div className="text-muted-foreground text-sm">
				{t('effectiveFrom', { date: effectiveFromDate })}
			</div>

			{info === 'accepted' && (
				<div className="rounded-md border border-green-300 bg-green-50 p-3 text-sm">
					{t('info.accepted')}
				</div>
			)}

			{info === 'already_accepted' && (
				<div className="rounded-md border border-blue-300 bg-blue-50 p-3 text-sm">
					{t('info.alreadyAccepted')}
				</div>
			)}

			{info === 'invalid' && (
				<div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm">
					{t('info.invalid')}
				</div>
			)}

			{info === 'missing' && (
				<div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm">
					{t('info.missing')}
				</div>
			)}

			{info === 'not_configured' && (
				<div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm">
					{t('info.notConfigured')}
				</div>
			)}

			<MarkdownContent className="max-w-none">{tos.body}</MarkdownContent>

			{canAcceptViaEmail && (
				<Form method="post" className="space-y-4 border-t pt-6">
					<input type="hidden" name="intent" value="accept_tos_from_email" />

					<div className="flex items-start gap-2">
						<input
							id="accepted"
							name="accepted"
							type="checkbox"
							className="mt-1 h-4 w-4"
							checked={checked}
							onChange={(e) => setChecked(e.target.checked)}
						/>
						<label htmlFor="accepted" className="text-sm leading-5">
							{t('form.acceptLabel')}
						</label>
					</div>

					{actionData?.error === 'tos_must_accept' && (
						<div className="text-sm text-red-500">
							{t('form.errors.mustAccept')}
						</div>
					)}

					{actionData?.error === 'invalid_or_expired_link' && (
						<div className="text-sm text-red-500">
							{t('form.errors.invalidOrExpiredLink')}
						</div>
					)}

					{actionData?.error === 'not_configured' && (
						<div className="text-sm text-red-500">
							{t('form.errors.notConfigured')}
						</div>
					)}

					<Button type="submit" disabled={!checked}>
						{t('form.submit')}
					</Button>
				</Form>
			)}
		</div>
	)
}

import * as React from 'react'
import { useTranslation, Trans } from 'react-i18next'
import { Form, Link, data, redirect } from 'react-router'
import { type Route } from './+types/tos-required'
import { Button } from '~/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '~/components/ui/dialog'
import {
	getCurrentEffectiveTos,
	getTosRequirementForUser,
} from '~/db/models/tos.server'
import { tosUserState } from '~/db/schema/tos'
import { drizzleClient } from '~/db.server'
import { requireUser } from '~/services/session-service.server'

function safeRedirectTo(value: string | null, fallback = '/') {
	if (!value) return fallback
	if (!value.startsWith('/')) return fallback
	if (value.startsWith('//')) return fallback
	return value
}

export async function loader({ request }: Route.LoaderArgs) {
	const user = await requireUser(request)
	const url = new URL(request.url)
	const redirectTo = safeRedirectTo(url.searchParams.get('redirectTo'), '/')

	const req = await getTosRequirementForUser(user.id)

	if (!req.mustBlock) {
		throw redirect(redirectTo)
	}

	const tos = await getCurrentEffectiveTos()
	if (!tos) return data({ tos: null, redirectTo }, { status: 500 })

	return data({ tos, redirectTo })
}

export async function action({ request }: Route.ActionArgs) {
	const user = await requireUser(request)
	const formData = await request.formData()

	const accepted = formData.get('accepted')
	const tosVersionId = formData.get('tosVersionId')
	const redirectTo = safeRedirectTo(
		formData.get('redirectTo') as string | null,
		'/',
	)

	if (accepted !== 'on') {
		return data({ error: 'tos_must_accept' }, { status: 400 })
	}

	if (!tosVersionId || typeof tosVersionId !== 'string') {
		return data({ error: 'invalid_tos_version' }, { status: 400 })
	}

	const current = await getCurrentEffectiveTos()
	if (!current || current.id !== tosVersionId) {
		return data({ error: 'tos_not_current' }, { status: 400 })
	}

	const now = new Date()

	await drizzleClient
		.insert(tosUserState)
		.values({
			userId: user.id,
			tosVersionId: current.id,
			acceptedAt: now,
		})
		.onConflictDoUpdate({
			target: [tosUserState.userId, tosUserState.tosVersionId],
			set: { acceptedAt: now },
		})

	throw redirect(redirectTo)
}

export default function TosRequiredModal({
	loaderData: { tos, redirectTo },
	actionData,
}: Route.ComponentProps) {
	const [checked, setChecked] = React.useState(false)

	const { t } = useTranslation('tos')

	return (
		<Dialog open onOpenChange={() => {}}>
			<DialogContent
				hideClose
				onEscapeKeyDown={(e) => e.preventDefault()}
				onPointerDownOutside={(e) => e.preventDefault()}
				onInteractOutside={(e) => e.preventDefault()}
				className="sm:max-w-lg"
			>
				<DialogHeader>
					<DialogTitle>{t('tos_update')}</DialogTitle>
					<DialogDescription>{t('must_accept')}</DialogDescription>
				</DialogHeader>

				{!tos ? (
					<div className="text-sm text-red-500">{t('not_configured')}</div>
				) : (
					<Form method="post" className="space-y-4">
						<input type="hidden" name="tosVersionId" value={tos.id} />
						<input type="hidden" name="redirectTo" value={redirectTo} />

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
								<Trans
									i18nKey="tos_agree"
									ns="tos"
									components={{
										termsLink: (
											<Link
												to="/terms"
												target="_blank"
												rel="noreferrer"
												className="underline"
											/>
										),
									}}
								/>
							</label>
						</div>

						{actionData?.error === 'tos_must_accept' && (
							<div className="text-sm text-red-500">{t('must_accept')}</div>
						)}

						<DialogFooter className="sm:justify-between">
							<div className="text-muted-foreground text-sm">
								<Trans
									i18nKey="delete_account"
									ns="tos"
									components={{
										deleteLink: (
											<Link to="/settings/delete" className="underline" />
										),
									}}
								/>
							</div>

							<Button type="submit" disabled={!checked}>
								{t('continue')}
							</Button>
						</DialogFooter>
					</Form>
				)}
			</DialogContent>
		</Dialog>
	)
}

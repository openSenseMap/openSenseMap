import * as React from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Link, useFetcher, useLocation } from 'react-router'
import { Button } from '~/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '~/components/ui/dialog'

type GraceTos = {
	id: string
	acceptBy: string
}

type GraceTosActionData = { ok: true } | { error: string }

export function TosGraceDialog({ tos }: { tos: GraceTos }) {
	const { t, i18n } = useTranslation('tos')
	const { pathname } = useLocation()
	const acceptFetcher = useFetcher<GraceTosActionData>()
	const dismissFetcher = useFetcher<GraceTosActionData>()
	const [checked, setChecked] = React.useState(false)

	const isSubmitting =
		acceptFetcher.state !== 'idle' || dismissFetcher.state !== 'idle'
	const actionError =
		acceptFetcher.data && 'error' in acceptFetcher.data
			? acceptFetcher.data.error
			: dismissFetcher.data && 'error' in dismissFetcher.data
				? dismissFetcher.data.error
				: null

	const dismiss = React.useCallback(() => {
		if (isSubmitting) return

		void dismissFetcher.submit(
			{ intent: 'dismiss', tosVersionId: tos.id },
			{ method: 'post', action: '/resources/tos-grace' },
		)
	}, [dismissFetcher, isSubmitting, tos.id])

	const acceptBy = new Date(tos.acceptBy).toLocaleDateString(i18n.language, {
		dateStyle: 'long',
		timeZone: 'UTC',
	})
	const suppressPrompt =
		pathname === '/terms' ||
		pathname === '/tos-required' ||
		pathname === '/settings/delete' ||
		pathname === '/logout'

	if (suppressPrompt) return null

	return (
		<Dialog
			open
			onOpenChange={(nextOpen) => {
				if (!nextOpen) dismiss()
			}}
		>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{t('tos_update')}</DialogTitle>
					<DialogDescription>
						{t('grace_description', { date: acceptBy })}
					</DialogDescription>
				</DialogHeader>

				<acceptFetcher.Form
					method="post"
					action="/resources/tos-grace"
					className="space-y-4"
				>
					<input type="hidden" name="intent" value="accept" />
					<input type="hidden" name="tosVersionId" value={tos.id} />

					<div className="flex items-start gap-2">
						<input
							id={`grace-tos-accepted-${tos.id}`}
							name="accepted"
							type="checkbox"
							className="mt-1 h-4 w-4"
							checked={checked}
							onChange={(event) => setChecked(event.target.checked)}
						/>
						<label
							htmlFor={`grace-tos-accepted-${tos.id}`}
							className="text-sm leading-5"
						>
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

					{actionError && (
						<div className="text-sm text-red-500" role="alert">
							{t('grace_action_error')}
						</div>
					)}

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							disabled={isSubmitting}
							onClick={dismiss}
						>
							{t('remind_later')}
						</Button>
						<Button type="submit" disabled={!checked || isSubmitting}>
							{t('accept_now')}
						</Button>
					</DialogFooter>
				</acceptFetcher.Form>
			</DialogContent>
		</Dialog>
	)
}

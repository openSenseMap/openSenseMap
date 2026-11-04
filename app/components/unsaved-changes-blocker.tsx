import { useCallback, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { type BlockerFunction, useBeforeUnload, useBlocker } from 'react-router'
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '~/components/ui/alert-dialog'

type UnsavedChangesBlockerProps = {
	when: boolean
}

export const shouldBlockUnsavedChangesNavigation = (
	when: boolean,
	...[{ currentLocation, nextLocation }]: Parameters<BlockerFunction>
) =>
	when &&
	(currentLocation.pathname !== nextLocation.pathname ||
		currentLocation.search !== nextLocation.search ||
		currentLocation.hash !== nextLocation.hash)

export function UnsavedChangesBlocker({ when }: UnsavedChangesBlockerProps) {
	const { t } = useTranslation('common')
	const proceedingRef = useRef(false)
	const shouldBlock = useCallback<BlockerFunction>(
		(args) => shouldBlockUnsavedChangesNavigation(when, args),
		[when],
	)
	const blocker = useBlocker(shouldBlock)

	useBeforeUnload(
		useCallback(
			(event) => {
				if (!when) return

				event.preventDefault()
				event.returnValue = ''
			},
			[when],
		),
		{ capture: true },
	)

	const proceed = useCallback(() => {
		if (blocker.state !== 'blocked') return

		proceedingRef.current = true
		blocker.proceed()
	}, [blocker])

	useEffect(() => {
		if (when || blocker.state !== 'blocked') return

		proceed()
	}, [blocker.state, proceed, when])

	useEffect(() => {
		if (blocker.state === 'blocked') return

		proceedingRef.current = false
	}, [blocker.state])

	const handleOpenChange = (open: boolean) => {
		if (open || blocker.state !== 'blocked') return
		if (proceedingRef.current) return

		blocker.reset()
	}

	return (
		<AlertDialog
			open={blocker.state === 'blocked'}
			onOpenChange={handleOpenChange}
		>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>{t('unsaved_changes_title')}</AlertDialogTitle>
					<AlertDialogDescription>
						{t('unsaved_changes_description')}
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel type="button">
						{t('stay_on_page')}
					</AlertDialogCancel>
					<AlertDialogAction
						type="button"
						className="bg-red-500 text-slate-50 hover:bg-red-500/90 dark:bg-red-700 dark:text-slate-50 dark:hover:bg-red-900/90"
						onClick={proceed}
					>
						{t('leave_without_saving')}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
}

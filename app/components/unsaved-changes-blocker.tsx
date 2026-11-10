import { useCallback, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { type BlockerFunction, useBeforeUnload, useBlocker } from 'react-router'
import { type AutosaveNavigationState } from '~/hooks/use-autosave-fetcher'
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
	when?: boolean
	autosaveState?: AutosaveNavigationState
}

export const shouldBlockUnsavedChangesNavigation = (
	when: boolean,
	...[{ currentLocation, nextLocation }]: Parameters<BlockerFunction>
) =>
	when &&
	(currentLocation.pathname !== nextLocation.pathname ||
		currentLocation.search !== nextLocation.search ||
		currentLocation.hash !== nextLocation.hash)

export function UnsavedChangesBlocker({
	when = false,
	autosaveState = 'idle',
}: UnsavedChangesBlockerProps) {
	const { t } = useTranslation('common')
	const proceedingRef = useRef(false)
	const needsConfirmation = when || autosaveState === 'blocked'
	const isWaitingForAutosave = !when && autosaveState === 'pending'
	const shouldBlockNavigation = needsConfirmation || isWaitingForAutosave
	const shouldBlock = useCallback<BlockerFunction>(
		(args) => shouldBlockUnsavedChangesNavigation(shouldBlockNavigation, args),
		[shouldBlockNavigation],
	)
	const blocker = useBlocker(shouldBlock)

	useBeforeUnload(
		useCallback(
			(event) => {
				if (!shouldBlockNavigation) return

				event.preventDefault()
				event.returnValue = ''
			},
			[shouldBlockNavigation],
		),
		{ capture: true },
	)

	const proceed = useCallback(() => {
		if (blocker.state !== 'blocked') return

		proceedingRef.current = true
		blocker.proceed()
	}, [blocker])

	useEffect(() => {
		if (shouldBlockNavigation || blocker.state !== 'blocked') return

		proceed()
	}, [blocker.state, proceed, shouldBlockNavigation])

	useEffect(() => {
		if (blocker.state === 'blocked') return

		proceedingRef.current = false
	}, [blocker.state])

	const handleOpenChange = (open: boolean) => {
		if (open || blocker.state !== 'blocked') return
		if (proceedingRef.current) return

		blocker.reset()
	}

	const isDialogOpen = blocker.state === 'blocked' && needsConfirmation

	return (
		<AlertDialog open={isDialogOpen} onOpenChange={handleOpenChange}>
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

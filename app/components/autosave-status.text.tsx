import { useTranslation } from 'react-i18next'
import { type AutosaveStatus } from '~/hooks/use-autosave-fetcher'

type AutosaveStatusTextProps = {
	status: AutosaveStatus
	hasValidationErrors?: boolean
	namespace?: string
	className?: string
}

export function AutosaveStatusText({
	status,
	hasValidationErrors = false,
	namespace,
	className = 'mt-2 min-h-5 text-sm',
}: AutosaveStatusTextProps) {
	const { t } = useTranslation(namespace)

	const shouldHideBecauseInvalid =
		hasValidationErrors && (status === 'dirty' || status === 'saved')

	if (shouldHideBecauseInvalid || status === 'idle') {
		return <div className={className} aria-live="polite" />
	}

	const contentByStatus: Record<
		Exclude<AutosaveStatus, 'idle'>,
		{
			label: string
			className: string
		}
	> = {
		saving: {
			label: t('saving'),
			className: 'text-gray-500',
		},
		error: {
			label: t('autosave_failed'),
			className: 'text-red-600',
		},
		dirty: {
			label: t('unsaved_changes'),
			className: 'text-gray-500',
		},
		saved: {
			label: t('saved'),
			className: 'text-green-500',
		},
	}

	const content = contentByStatus[status]

	return (
		<div className={className} aria-live="polite">
			<p className={content.className}>{content.label}</p>
		</div>
	)
}

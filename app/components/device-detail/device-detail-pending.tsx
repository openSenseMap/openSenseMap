import { useTranslation } from 'react-i18next'
import Spinner from '../spinner'

export function DeviceDetailPending() {
	const { t } = useTranslation()

	return (
		<div className="absolute top-30 right-4 bottom-6 left-4 z-40 flex flex-row px-4 py-2 lg:top-auto lg:bottom-7.5 lg:left-2.5 lg:max-h-[calc(100dvh-8rem)] lg:w-[min(28rem,calc(100vw-2rem))] lg:p-0">
			<div
				className="flex h-full max-h-[calc(100dvh-4rem)] w-full items-center justify-center rounded-xl bg-white text-zinc-800 shadow-lg ring-1 shadow-zinc-800/5 ring-zinc-900/5 lg:max-h-[calc(100dvh-8rem)] dark:bg-zinc-800 dark:text-zinc-200 dark:opacity-95 dark:ring-white dark:backdrop-blur-xs"
				role="status"
				aria-live="polite"
			>
				<Spinner />
				<span className="sr-only">{t('loading_device')}</span>
			</div>
		</div>
	)
}

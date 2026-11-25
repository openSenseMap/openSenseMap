import { Button } from '@/components/ui/button'
import { CopyCheckIcon, CopyIcon } from 'lucide-react'
import { toast } from '~/components/ui/use-toast'
import { useCopyToClipboard } from '~/hooks/use-copy-to-clipboard'
import { useTranslation } from 'react-i18next'

export function DeviceIdCell({
	deviceId,
	copyLabel,
	copiedLabel,
}: {
	deviceId: string
	copyLabel: string
	copiedLabel: string
}) {
	const { copiedToClipboard, copyToClipboard } = useCopyToClipboard()
	const { t } = useTranslation('data-table')
	const handleCopyId = async () => {
		const copied = await copyToClipboard(deviceId)

		if (!copied) return

		toast({
			title: t('copied'),
			variant: 'success',
		})
	}

	return (
		<div className="flex min-w-0 items-center gap-1.5">
			<code
				title={deviceId}
				className="border-border bg-muted text-muted-foreground max-w-56 truncate rounded-md border px-2 py-1 font-mono text-xs"
			>
				{deviceId}
			</code>

			<Button
				type="button"
				variant="ghost"
				size="icon"
				className="text-muted-foreground hover:text-foreground h-7 w-7 shrink-0 p-0"
				onClick={handleCopyId}
				aria-label={copiedToClipboard ? copiedLabel : copyLabel}
				title={copiedToClipboard ? copiedLabel : copyLabel}
			>
				{copiedToClipboard ? (
					<CopyCheckIcon className="h-4 w-4" />
				) : (
					<CopyIcon className="h-4 w-4" />
				)}
			</Button>
		</div>
	)
}

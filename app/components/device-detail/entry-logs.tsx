import { Activity, Clock, ExternalLink } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '../ui/dialog'
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { type LogEntry } from '~/db/schema/log-entry'

export default function EntryLogs({
	entryLogs = [],
}: {
	entryLogs: LogEntry[]
}) {
	const [open, setOpen] = useState(false)
	const { t, i18n } = useTranslation('device-detail-box')
	const latestEntry = entryLogs[0]

	if (!latestEntry) return null

	return (
		<div className="flex flex-col">
			<p className="pb-4 font-bold">{t('logs')}</p>
			<div className="flex min-w-0 items-center">
				<div className="flex min-w-0 flex-1 items-start space-x-4">
					<div className="border-muted-foreground text-muted-foreground flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-4">
						<Activity className="h-5 w-5" />
					</div>
					<div className="min-w-0 grow">
						<p className="mb-2 text-sm font-medium wrap-break-word">
							{latestEntry.content}
						</p>
						<div className="text-muted-foreground flex items-center text-xs">
							<Clock className="mr-1 h-3 w-3" />
							{new Date(latestEntry.createdAt).toLocaleString(i18n.language)}
						</div>
					</div>
				</div>
				<Dialog open={open} onOpenChange={setOpen}>
					<Tooltip>
						<TooltipTrigger asChild>
							<DialogTrigger asChild>
								<Button
									variant="ghost"
									size="icon"
									className="shrink-0"
									aria-label={t('show_all_logs')}
								>
									<ExternalLink className="h-5 w-5" />
								</Button>
							</DialogTrigger>
						</TooltipTrigger>
						<TooltipContent>
							<p>{t('show_all_logs')}</p>
						</TooltipContent>
					</Tooltip>
					<DialogContent className="sm:max-w-2/3">
						<DialogHeader>
							<DialogTitle>{t('device_logs')}</DialogTitle>
							<DialogDescription>{t('logs_owner_hint')}</DialogDescription>
						</DialogHeader>
						<LogList entryLogs={entryLogs} locale={i18n.language} />
					</DialogContent>
				</Dialog>
			</div>
		</div>
	)
}

function LogList({
	entryLogs = [],
	locale,
}: {
	entryLogs: LogEntry[]
	locale: string
}) {
	return (
		<ScrollArea className="h-75 w-full rounded-md border p-4">
			<div className="space-y-4 pr-4">
				{entryLogs.map((log, index) => (
					<div key={log.id} className="relative flex items-start space-x-4">
						<div className="bg-primary z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
							<Activity className="text-primary-foreground h-5 w-5" />
						</div>
						<div className="grow">
							<Card className="p-4 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
								<p className="mb-2 text-sm font-medium">{log.content}</p>
								<div className="text-muted-foreground flex items-center text-xs">
									<Clock className="mr-1 h-3 w-3" />
									{new Date(log.createdAt).toLocaleString(locale)}
								</div>
							</Card>
						</div>
						{index < entryLogs.length - 1 && (
							<div
								className="bg-border absolute top-10 bottom-0 left-5 w-px"
								aria-hidden="true"
							/>
						)}
					</div>
				))}
			</div>
		</ScrollArea>
	)
}

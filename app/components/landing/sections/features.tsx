import { Copyleft, Download, GitFork, Telescope, Terminal } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function Features() {
	const { t } = useTranslation('features')
	return (
		<section
			id="features"
			className="flex w-full flex-col justify-between gap-10 md:flex-row"
		>
			<div id="left" className="flex w-full flex-col gap-8 md:w-1/2 md:gap-10">
				<div id="title" className="text-2xl font-semibold">
					{t('features')}
					<div id="description" className="text-lg font-medium">
						{t('description')}
					</div>
				</div>
				<img
					src="/img/features.svg"
					alt=""
					className="h-auto w-full max-w-sm self-center md:w-1/2 md:self-start"
				/>
			</div>
			<div id="right" className="w-full md:w-1/2">
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
					<div className="flex flex-col rounded-sm border-2 px-4 py-2 text-lg">
						<div className="flex min-w-0 items-center gap-3 wrap-anywhere">
							<GitFork className="h-4 w-4 shrink-0" />
							{t('dataAggregation')}
						</div>
					</div>
					<div className="flex flex-col rounded-sm border-2 px-4 py-2 text-lg">
						<div className="flex min-w-0 items-center gap-3 wrap-anywhere">
							<Copyleft className="h-4 w-4 shrink-0" />
							{t('dataPublished')}
						</div>
					</div>
					<div className="flex rounded-sm border-2 px-4 py-2 text-lg">
						<div className="flex min-w-0 items-center gap-3 wrap-anywhere">
							<Telescope className="h-4 w-4 shrink-0" />
							{t('discoverDevices')}
						</div>
					</div>
					<div className="flex rounded-sm border-2 px-4 py-2 text-lg">
						<div className="flex min-w-0 items-center gap-3 wrap-anywhere">
							<Download className="h-4 w-4 shrink-0" />
							{t('downloadOptions')}
						</div>
					</div>
					<div className="flex rounded-sm border-2 px-4 py-2 text-lg">
						<div className="flex min-w-0 items-center gap-3 wrap-anywhere">
							<Terminal className="h-4 w-4 shrink-0" />
							{t('httpRestApi')}
						</div>
					</div>
				</div>
			</div>
		</section>
	)
}

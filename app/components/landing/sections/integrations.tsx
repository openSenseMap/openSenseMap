import { ArrowUpDown, RadioTower, Unplug } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function Integrations() {
	const { t } = useTranslation('integrations')
	return (
		<section
			id="integrations"
			className="flex w-full flex-col justify-between gap-10 md:flex-row"
		>
			<div id="left" className="flex w-full flex-col gap-8 md:w-1/2 md:gap-10">
				<div id="title" className="text-2xl font-semibold">
					{t('title')}
					<div id="description" className="text-lg font-medium">
						{t('description')}
					</div>
				</div>
				<img
					src="/img/integration.svg"
					alt=""
					className="h-auto w-full max-w-sm self-center md:w-1/2 md:self-start"
				/>
			</div>
			<div id="right" className="w-full md:w-1/2">
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
					<div className="flex flex-col rounded-sm border-2 px-4 py-2 text-lg">
						<a
							href="https://docs.opensensemap.org/"
							rel="noopener noreferrer"
							target="_blank"
							className="flex min-w-0 items-center gap-3 wrap-anywhere"
						>
							<ArrowUpDown className="h-4 w-4 shrink-0" />
							{t('HTTP API')}
						</a>
					</div>
					<div className="flex flex-col rounded-sm border-2 px-4 py-2 text-lg">
						<a
							href="https://tutorials.opensensemap.org/integrations/integrations-mqtt/"
							rel="noopener noreferrer"
							target="_blank"
							className="flex min-w-0 items-center gap-3 wrap-anywhere"
						>
							<Unplug className="h-4 w-4 shrink-0" />
							{t('MQTT')}
						</a>
					</div>
					<div className="flex flex-col rounded-sm border-2 px-4 py-2 text-lg">
						<a
							href="https://tutorials.opensensemap.org/integrations/integrations-ttnv3/"
							rel="noopener noreferrer"
							target="_blank"
							className="flex min-w-0 items-center gap-3 wrap-anywhere"
						>
							<RadioTower className="h-4 w-4 shrink-0" />
							{t('TTN')}
						</a>
					</div>
				</div>
			</div>
		</section>
	)
}

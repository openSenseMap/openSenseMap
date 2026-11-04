import { BookA, Wrench } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function Connect() {
	const { t } = useTranslation('connect')
	return (
		<section
			id="connect"
			className="flex h-full w-full flex-col items-center justify-center gap-10 md:flex-row md:py-10 lg:gap-20 lg:py-20"
		>
			<div id="left" className="flex w-full flex-col gap-8 md:w-1/2 md:gap-10">
				<div id="title" className="text-2xl font-semibold">
					{t('title')}
					<div id="description" className="text-lg font-medium">
						{t('description')}
					</div>
				</div>
				<img
					src="/img/connection.svg"
					alt=""
					className="h-auto w-full max-w-sm self-center md:w-1/2 md:self-start"
				/>
			</div>
			<div id="right" className="w-full md:w-1/2">
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
					<div className="flex flex-col rounded-sm border-2 px-4 py-2 text-lg">
						<a
							href="https://sensebox.de"
							rel="noopener noreferrer"
							target="_blank"
							className="flex min-w-0 items-center gap-3 wrap-anywhere"
						>
							<BookA className="h-4 w-4 shrink-0" />
							{t('senseBox')}
						</a>
					</div>
					<div className="flex flex-col rounded-sm border-2 px-4 py-2 text-lg">
						<a
							href="https://www.hackair.eu/"
							rel="noopener noreferrer"
							target="_blank"
							className="flex min-w-0 items-center gap-3 wrap-anywhere"
						>
							<BookA className="h-4 w-4 shrink-0" />
							{t('hackAIR')}
						</a>
					</div>
					<div className="flex flex-col rounded-sm border-2 px-4 py-2 text-lg">
						<a
							href="https://sensor.community"
							rel="noopener noreferrer"
							target="_blank"
							className="flex min-w-0 items-center gap-3 wrap-anywhere"
						>
							<BookA className="h-4 w-4 shrink-0" />
							{t('Sensor.Community')}
						</a>
					</div>
					<div className="flex rounded-sm border-2 px-4 py-2 text-lg">
						<a
							href="https://tutorials.opensensemap.org/category/devices/"
							rel="noopener noreferrer"
							target="_blank"
							className="flex min-w-0 items-center gap-3 wrap-anywhere"
						>
							<Wrench className="h-4 w-4 shrink-0" />
							{t('Custom')}
						</a>
					</div>
				</div>
			</div>
		</section>
	)
}

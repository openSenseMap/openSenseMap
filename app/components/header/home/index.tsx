import { useTranslation } from 'react-i18next'
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from '~/components/ui/tooltip'
import { topbarSurface } from '~/components/ui/topbar-styles'
import { cn } from '~/lib/utils'

interface HomeProps {
	deviceCount?: number
	measurementCount?: number
	onHomeClick?: () => void
}

export default function Home({
	deviceCount = 0,
	measurementCount = 0,
	onHomeClick,
}: HomeProps) {
	const { t } = useTranslation('menu')

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<button
					type="button"
					onClick={onHomeClick}
					aria-label={t('returnToGlobeView')}
					className={cn(
						topbarSurface({ shape: 'pill' }),
						`pointer-events-auto flex w-11 cursor-pointer items-center justify-center gap-3 px-2 focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 focus-visible:outline-hidden lg:w-auto lg:justify-start lg:px-3 lg:pr-4`,
					)}
				>
					<img
						src="/img/logo.svg"
						alt="openSenseMapLogo"
						className="h-7 w-7 shrink-0 lg:hidden"
					/>
					<img
						src="/img/openSenseMap.png"
						alt=""
						className="hidden h-7 w-auto shrink-0 lg:block"
					/>

					{deviceCount > 0 && (
						<section className="hidden flex-col text-left text-sm leading-tight lg:flex">
							<p>
								<span className="font-semibold text-green-700">
									{deviceCount}{' '}
								</span>
								<span>{t('devices')}</span>
							</p>

							<p>
								<span className="font-semibold text-green-700">
									{measurementCount}{' '}
								</span>
								<span>{t('measurements')}</span>
							</p>
						</section>
					)}
				</button>
			</TooltipTrigger>

			<TooltipContent side="bottom">
				<p>{t('returnToGlobeView')}</p>
			</TooltipContent>
		</Tooltip>
	)
}

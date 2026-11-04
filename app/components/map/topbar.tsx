import Home from '../header/home'
import Menu from '../header/menu'
import NavBar from '../header/nav-bar'
import Info from '../header/info'
import LanguageSelector from '../landing/header/language-selector'
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip'
import ThemeToggle from '../landing/header/theme-toggle'
import { MapPinned } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '../ui/button'

interface MapHeaderProps {
	devices: any
	measurementCount: number | undefined
	onHomeClick?: () => void
	onMyAreaClick?: () => void
	canFocusMyArea?: boolean
}

export default function MapHeader({
	devices,
	measurementCount,
	onHomeClick,
	onMyAreaClick,
	canFocusMyArea = false,
}: MapHeaderProps) {
	const { t } = useTranslation('menu')

	return (
		<header className="pointer-events-none absolute top-0 left-0 z-20 w-full">
			<div className="pointer-events-auto grid min-h-14 w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-1 px-3 py-2 lg:flex lg:items-start lg:justify-between lg:gap-4">
				<div className="relative flex min-w-0 items-center gap-1 lg:gap-3">
					<Home
						deviceCount={devices.features.length}
						measurementCount={measurementCount ?? 0}
						onHomeClick={onHomeClick}
					/>

					{canFocusMyArea && (
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									type="button"
									variant="topbar"
									size="topbarPill"
									className="absolute top-14 left-0 h-11 px-3 lg:static lg:h-10"
									onClick={onMyAreaClick}
									aria-label={t('zoomToMyArea')}
								>
									<MapPinned aria-hidden="true" />
								</Button>
							</TooltipTrigger>

							<TooltipContent side="bottom">
								<p>{t('zoomToMyArea')}</p>
							</TooltipContent>
						</Tooltip>
					)}
				</div>

				<div className="flex min-w-0 justify-end lg:flex-1 lg:justify-center">
					<NavBar devices={devices} />
				</div>

				<div className="flex min-w-0 items-center justify-end gap-1 lg:shrink-0 lg:gap-4">
					<LanguageSelector />
					<ThemeToggle />

					<div className="hidden h-7 w-px bg-black/10 lg:block dark:bg-white/15" />

					<div className="flex items-center gap-1 lg:gap-2">
						<Info />
						<Menu />
					</div>
				</div>
			</div>
		</header>
	)
}

import { Info } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/card'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Switch } from '~/components/ui/switch'
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from '~/components/ui/tooltip'
import { MOBILE_TRIP_LIMIT } from '~/lib/mobile-box-helper'
import { cn } from '~/lib/utils'

type LegendItem = {
	label: string
	color: string
	isLatest: boolean
	tripNumber: number
}

type MapLegendProps = {
	items: LegendItem[]
	position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
	onColorByTripChange: (enabled: boolean) => void
	showOriginalColors: boolean
	selectedTripNumber: number | null
	onLegendItemHover: (tripNumber: number | null) => void
	onLegendItemSelect: (tripNumber: number) => void
}

export default function MapLegend({
	items,
	position = 'top-right',
	onColorByTripChange,
	showOriginalColors,
	selectedTripNumber,
	onLegendItemHover,
	onLegendItemSelect,
}: MapLegendProps) {
	const { t } = useTranslation('mobile-map')
	const positionClasses = {
		'top-left': 'top-4 left-4',
		'top-right': 'top-14 right-2',
		'bottom-left': 'bottom-4 left-4',
		'bottom-right': 'bottom-4 right-4',
	}

	return (
		<Card
			className={`absolute w-72 max-w-[calc(100vw-1rem)] ${positionClasses[position]} bg-opacity-90 rounded-lg bg-white p-3 shadow-md`}
		>
			<div className="flex items-center justify-between">
				<h3 className="text-sm font-semibold">{t('recentTrips')}</h3>
				<Tooltip>
					<TooltipTrigger asChild>
						<Button variant="ghost" size="icon" className="h-7 w-7">
							<Info className="h-4 w-4" />
							<span className="sr-only">{t('tripExplanationLabel')}</span>
						</Button>
					</TooltipTrigger>
					<TooltipContent side="bottom">
						<p className="max-w-64">
							{t('tripExplanation', { count: MOBILE_TRIP_LIMIT })}
						</p>
					</TooltipContent>
				</Tooltip>
			</div>
			<div className="mt-1 flex items-center justify-between gap-3">
				<label
					htmlFor="trip-color-mode"
					className="text-muted-foreground cursor-pointer text-xs"
				>
					{t('colorByTrip')}
				</label>
				<Switch
					id="trip-color-mode"
					checked={showOriginalColors}
					onCheckedChange={onColorByTripChange}
					aria-label={t('colorByTripAriaLabel')}
				/>
			</div>
			{showOriginalColors && (
				<ul className="mt-2 space-y-1" aria-label={t('visibleTrips')}>
					{items.map((item) => (
						<li key={item.tripNumber}>
							<button
								type="button"
								className={cn(
									'hover:bg-muted focus-visible:ring-ring flex w-full items-center gap-2 rounded-sm p-1 text-left focus-visible:ring-2 focus-visible:outline-none',
									selectedTripNumber === item.tripNumber &&
										'bg-muted ring-primary/40 ring-1',
								)}
								onClick={() => onLegendItemSelect(item.tripNumber)}
								onMouseEnter={() => onLegendItemHover(item.tripNumber)}
								onMouseLeave={() => onLegendItemHover(null)}
								onFocus={() => onLegendItemHover(item.tripNumber)}
								onBlur={() => onLegendItemHover(null)}
								aria-pressed={selectedTripNumber === item.tripNumber}
								aria-label={
									item.isLatest
										? t('latestTripAriaLabel', { label: item.label })
										: item.label
								}
							>
								<span
									className="h-3.5 w-3.5 shrink-0 rounded-full border border-gray-300"
									style={{ backgroundColor: item.color }}
									aria-hidden="true"
								/>
								<span className="min-w-0 flex-1 text-xs">{item.label}</span>
								{item.isLatest && (
									<Badge
										variant="secondary"
										className="px-1.5 py-0 text-[10px]"
									>
										{t('latest')}
									</Badge>
								)}
							</button>
						</li>
					))}
				</ul>
			)}
		</Card>
	)
}

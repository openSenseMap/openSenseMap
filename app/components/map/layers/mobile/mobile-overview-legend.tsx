import { Info } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '~/components/ui/button'
import { Switch } from '~/components/ui/switch'
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from '~/components/ui/tooltip'

type LegendItem = {
	label: string
	color: string
}

type MapLegendProps = {
	items: LegendItem[]
	position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
	toggleTrips: () => void
	showOriginalColors: boolean
	onLegendItemHover: (color: string | null) => void
}

export default function MapLegend({
	items,
	position = 'top-right',
	toggleTrips,
	showOriginalColors,
	onLegendItemHover,
}: MapLegendProps) {
	const positionClasses = {
		'top-left': 'top-4 left-4',
		'top-right': 'top-14 right-2',
		'bottom-left': 'bottom-4 left-4',
		'bottom-right': 'bottom-4 right-4',
	}

	const uniqueColors = Array.from(new Set(items.map((item) => item.color))).map(
		(color) => {
			return items.find((item) => item.color === color)
		},
	)

	return (
		<Card
			className={`absolute w-40 ${positionClasses[position]} bg-opacity-90 rounded-lg bg-white p-2 shadow-md`}
		>
			<div className="flex items-center justify-between">
				<h3 className="text-sm font-semibold">Trips</h3>
				<Switch
					id="trip-color-mode"
					checked={showOriginalColors}
					onCheckedChange={toggleTrips}
				/>

				<Tooltip>
					<TooltipTrigger asChild>
						<Button variant="ghost" size="icon">
							<Info className="h-4 w-4" />
							<span className="sr-only">Toggle color information</span>
						</Button>
					</TooltipTrigger>
					<TooltipContent side="bottom">
						{showOriginalColors ? (
							<p>
								We have tried to organise your data into trips. This may not be
								accurate.
							</p>
						) : (
							<p>You are viewing raw data right now. Activate to see trips.</p>
						)}
					</TooltipContent>
				</Tooltip>
			</div>
			{showOriginalColors && (
				<ul className="flex flex-wrap gap-2">
					{uniqueColors.map((item, index) => (
						<li
							key={index}
							className="flex items-center"
							onMouseEnter={() => onLegendItemHover(item?.color ?? null)}
							onMouseLeave={() => onLegendItemHover(null)} // Reset highlight on mouse leave
						>
							<div
								className="h-4 w-4 rounded-full border border-gray-300"
								style={{ backgroundColor: item?.color }}
								aria-label={`Color: ${item?.color}`}
							/>
						</li>
					))}
				</ul>
			)}
		</Card>
	)
}

import { ArrowDownUp } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { calculateColorRange } from './color-palette'
import MobileBoxLayer from './mobile-box-layer'
import {
	getSensorTrajectoryValueRange,
	type SensorTrajectoryMeasurement,
} from './mobile-sensor-trajectory'
import { Button } from '~/components/ui/button'
import { type Sensor } from '~/db/schema'
import { type Trip } from '~/lib/mobile-box-helper'

interface SensorWithColor extends Sensor {
	color: string // Add the color property
}

export default function MobileBoxView({
	sensors: initialSensors,
	trips,
}: {
	sensors: SensorWithColor[]
	trips: Trip[]
}) {
	const [primarySensorId, setPrimarySensorId] = useState<string | null>(null)
	const sensors = useMemo(() => {
		if (!primarySensorId || initialSensors[0]?.id === primarySensorId) {
			return initialSensors
		}

		const primarySensor = initialSensors.find(
			(sensor) => sensor.id === primarySensorId,
		)
		return primarySensor
			? [
					primarySensor,
					...initialSensors.filter((sensor) => sensor.id !== primarySensorId),
				]
			: initialSensors
	}, [initialSensors, primarySensorId])

	// Toggle the order of sensors
	const switchSensors = () => {
		setPrimarySensorId(sensors[1]?.id ?? null)
	}

	return (
		<div className="absolute top-80 right-0 flex max-h-[calc(100vh-21rem)] flex-col gap-4 overflow-y-auto p-4">
			{sensors.map((sensor, index) => (
				<div key={sensor.id} className="flex flex-col items-center gap-4">
					{index === 1 && sensors.length === 2 && (
						<Button
							className="self-center rounded-full px-4 py-2"
							onClick={switchSensors}
							variant={'outline'}
						>
							<ArrowDownUp />
						</Button>
					)}
					<SensorView sensor={sensor} index={index} trips={trips} />
				</div>
			))}
		</div>
	)
}

function SensorView({
	sensor,
	index,
	trips,
}: {
	sensor: SensorWithColor
	index: number
	trips: Trip[]
}) {
	const { lowColor, highColor } = calculateColorRange(sensor.color) // Calculate dynamically

	const [minColor, setMinColor] = useState(lowColor)
	const [maxColor, setMaxColor] = useState(highColor)

	return (
		<>
			<Legend
				sensor={sensor}
				trips={trips}
				key={'Legend_' + sensor.id}
				onColorChange={(min, max) => {
					setMinColor(min)
					setMaxColor(max)
				}}
			/>
			{index < 1 && (
				<MobileBoxLayer
					sensor={sensor}
					trips={trips}
					key={sensor.id}
					minColor={minColor}
					maxColor={maxColor}
				/>
			)}
		</>
	)
}

function Legend({
	sensor,
	trips,
	onColorChange,
}: {
	sensor: SensorWithColor
	trips: Trip[]
	onColorChange?: (min: string, max: string) => void
}) {
	const { t } = useTranslation('mobile-map')
	const { lowColor, highColor } = calculateColorRange(sensor.color)

	const minColorInputRef = useRef<HTMLInputElement>(null)
	const maxColorInputRef = useRef<HTMLInputElement>(null)

	const [minColor, setMinColor] = useState(lowColor)
	const [maxColor, setMaxColor] = useState(highColor)

	useEffect(() => {
		onColorChange?.(minColor, maxColor)
	}, [minColor, maxColor, onColorChange])

	const { minValue, maxValue } = useMemo(
		() =>
			getSensorTrajectoryValueRange(
				(Array.isArray(sensor.data)
					? sensor.data
					: []) as SensorTrajectoryMeasurement[],
				trips,
			),
		[sensor.data, trips],
	)

	return (
		<div className="z-50 flex w-40 flex-col gap-2 rounded-lg border-gray-200 bg-white p-2 shadow-xs">
			<span className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
				{t('sensorValues')}
			</span>
			<span className="font-semibold">{sensor.title}</span>
			<div
				className="flex w-full items-center justify-between rounded-sm p-1"
				style={{
					background: `linear-gradient(90deg, ${minColor} 0%, ${maxColor} 100%)`,
				}}
			>
				<div
					className="cursor-pointer rounded bg-white px-0.5 shadow-xs"
					onClick={() => minColorInputRef.current?.click()}
				>
					{minValue ?? '–'}
					{sensor.unit}
					<input
						type="color"
						ref={minColorInputRef}
						className="hidden"
						value={minColor}
						onChange={(e) => setMinColor(e.target.value)}
					/>
				</div>
				<span
					className="cursor-pointer rounded bg-white px-0.5 shadow-xs"
					onClick={() => maxColorInputRef.current?.click()}
				>
					{maxValue ?? '–'}
					{sensor.unit}
					<input
						className="hidden"
						type="color"
						ref={maxColorInputRef}
						defaultValue={maxColor}
						onChange={(e) => setMaxColor(e.target.value)}
					/>
				</span>
			</div>
		</div>
	)
}

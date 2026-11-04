import { Cpu } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useFormContext } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { CustomDeviceConfig } from './custom-device-config'
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from '~/components/ui/accordion'
import { Badge } from '~/components/ui/badge'
import { Checkbox } from '~/components/ui/checkbox'
import { Label } from '~/components/ui/label'
import { getSensorsForModel } from '~/lib/model-definitions'
import { cn } from '~/lib/utils'
import { type Sensor } from '~/lib/new-device-form'

export type { CustomDeviceSchemaUpload, Sensor } from '~/lib/new-device-form'

type SensorGroup = {
	sensorType: string
	sensors: Sensor[]
	image?: string
}

export function SensorSelectionStep() {
	const { watch, setValue } = useFormContext()
	const selectedDevice = watch('model')
	const { t } = useTranslation('newdevice')
	const [selectedDeviceModel, setSelectedDeviceModel] = useState<string | null>(
		null,
	)
	const [sensors, setSensors] = useState<Sensor[]>([])
	const [selectedSensors, setSelectedSensors] = useState<Sensor[]>([])

	useEffect(() => {
		if (selectedDevice) {
			const deviceModel = selectedDevice.startsWith('homeV2')
				? 'senseBoxHomeV2'
				: selectedDevice
			setSelectedDeviceModel(deviceModel)

			if (deviceModel !== 'custom') {
				const fetchedSensors = getSensorsForModel(deviceModel)
				setSensors(fetchedSensors ?? [])
			} else {
				setSensors([])
			}
		}
	}, [selectedDevice])

	useEffect(() => {
		const savedSelectedSensors = watch('selectedSensors') || []
		setSelectedSensors(savedSelectedSensors)
	}, [watch])

	const groupSensorsByType = (sensors: Sensor[]): SensorGroup[] => {
		if (!sensors || sensors.length === 0) return []

		const grouped = sensors.reduce(
			(acc, sensor) => {
				if (!acc[sensor.sensorType]) {
					acc[sensor.sensorType] = []
				}
				acc[sensor.sensorType].push(sensor)
				return acc
			},
			{} as Record<string, Sensor[]>,
		)

		return Object.entries(grouped).map(([sensorType, sensors]) => ({
			sensorType,
			sensors,
			image: sensors.find((sensor) => sensor.image)?.image,
		}))
	}

	const sensorGroups = groupSensorsByType(sensors)

	const isSensorSelected = (sensor: Sensor) =>
		selectedSensors.some(
			(s) => s.title === sensor.title && s.sensorType === sensor.sensorType,
		)

	const isGroupFullySelected = (group: SensorGroup) =>
		group.sensors.every((sensor) => isSensorSelected(sensor))

	const isGroupPartiallySelected = (group: SensorGroup) =>
		group.sensors.some((sensor) => isSensorSelected(sensor)) &&
		!isGroupFullySelected(group)

	const getSelectedCountForGroup = (group: SensorGroup) =>
		group.sensors.filter((sensor) => isSensorSelected(sensor)).length

	const handleSensorToggle = (sensor: Sensor) => {
		const isAlreadySelected = isSensorSelected(sensor)

		const updatedSensors = isAlreadySelected
			? selectedSensors.filter(
					(s) =>
						!(s.title === sensor.title && s.sensorType === sensor.sensorType),
				)
			: [...selectedSensors, sensor]

		setSelectedSensors(updatedSensors)
		setValue('selectedSensors', updatedSensors)
	}

	const handleGroupToggle = (group: SensorGroup) => {
		const isFullySelected = isGroupFullySelected(group)

		const updatedSensors = isFullySelected
			? selectedSensors.filter(
					(s) =>
						!group.sensors.some(
							(sensor) =>
								s.title === sensor.title && s.sensorType === sensor.sensorType,
						),
				)
			: [
					...selectedSensors,
					...group.sensors.filter((sensor) => !isSensorSelected(sensor)),
				]

		setSelectedSensors(updatedSensors)
		setValue('selectedSensors', updatedSensors)
	}

	if (!selectedDevice) {
		return <p className="text-center text-lg">{t('device_not_selected')}</p>
	}

	if (selectedDevice === 'custom') {
		return <CustomDeviceConfig />
	}

	const isSenseBoxHomeV2 = selectedDeviceModel === 'senseBoxHomeV2'

	return (
		<div className="flex h-full flex-col">
			<div className="mb-4 flex items-center justify-between">
				<p className="text-muted-foreground text-sm">
					{t('selectedSensors', { count: selectedSensors.length })}
				</p>
				{selectedSensors.length > 0 && (
					<button
						type="button"
						className="text-destructive text-sm hover:underline"
						onClick={() => {
							setSelectedSensors([])
							setValue('selectedSensors', [])
						}}
					>
						{t('clear_all')}
					</button>
				)}
			</div>

			<Accordion type="multiple" className="w-full space-y-2">
				{sensorGroups.map((group) => {
					const isFullySelected = isGroupFullySelected(group)
					const isPartiallySelected = isGroupPartiallySelected(group)
					const selectedCount = getSelectedCountForGroup(group)

					return (
						<AccordionItem
							key={group.sensorType}
							value={group.sensorType}
							className={cn(
								'rounded-lg border px-4',
								isFullySelected && 'border-primary bg-primary/5',
								isPartiallySelected && 'border-primary/50',
							)}
						>
							<AccordionTrigger className="hover:no-underline">
								<div className="flex w-full items-center justify-between pr-4">
									<div className="flex items-center gap-3">
										{group.image ? (
											<img
												src={group.image}
												alt={group.sensorType}
												className="h-10 w-10 rounded object-cover"
											/>
										) : (
											<div className="bg-muted flex h-10 w-10 items-center justify-center rounded">
												<Cpu className="text-muted-foreground h-5 w-5" />
											</div>
										)}
										<div className="text-left">
											<p className="font-medium">{group.sensorType}</p>
											<p className="text-muted-foreground text-xs">
												{group.sensors.length}{' '}
												{group.sensors.length !== 1
													? t('phenomena')
													: t('phenomenon')}
											</p>
										</div>
									</div>
									{selectedCount > 0 && (
										<Badge variant="secondary" className="ml-2">
											{selectedCount} {t('selected')}
										</Badge>
									)}
								</div>
							</AccordionTrigger>
							<AccordionContent className="pb-4">
								<div className="space-y-3 pt-2">
									<div
										className="bg-muted/50 flex items-center space-x-3 rounded-md p-3"
										onClick={(e) => e.stopPropagation()}
									>
										<Checkbox
											id={`group-${group.sensorType}`}
											checked={isFullySelected}
											data-state={
												isPartiallySelected ? 'indeterminate' : undefined
											}
											onCheckedChange={() => handleGroupToggle(group)}
										/>
										<Label
											htmlFor={`group-${group.sensorType}`}
											className="cursor-pointer font-medium"
										>
											{t('select_all_phenomenons')}
										</Label>
									</div>

									{!isSenseBoxHomeV2 && (
										<div className="border-muted ml-2 space-y-2 border-l-2 pl-4">
											{group.sensors.map((sensor) => {
												const isSelected = isSensorSelected(sensor)
												const sensorId = `sensor-${group.sensorType}-${sensor.title}`

												return (
													<div
														key={sensor.title}
														className={cn(
															'flex items-center space-x-3 rounded-md p-2 transition-colors',
															isSelected
																? 'bg-primary/10'
																: 'hover:bg-muted/50',
														)}
														onClick={(e) => e.stopPropagation()}
													>
														<Checkbox
															id={sensorId}
															checked={isSelected}
															onCheckedChange={() => handleSensorToggle(sensor)}
														/>
														<Label
															htmlFor={sensorId}
															className="flex cursor-pointer items-center gap-2"
														>
															<span>{sensor.title}</span>
															<span className="text-muted-foreground text-xs">
																({sensor.unit})
															</span>
														</Label>
													</div>
												)
											})}
										</div>
									)}

									{isSenseBoxHomeV2 && (
										<div className="text-muted-foreground ml-2 space-y-1 text-sm">
											<p className="text-foreground font-medium">
												{t('includes')}:
											</p>
											{group.sensors.map((sensor) => (
												<p key={sensor.title} className="ml-2">
													• {sensor.title} ({sensor.unit})
												</p>
											))}
										</div>
									)}
								</div>
							</AccordionContent>
						</AccordionItem>
					)
				})}
			</Accordion>
		</div>
	)
}

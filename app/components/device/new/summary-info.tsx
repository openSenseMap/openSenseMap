import { MapPin, Tag, Smartphone, Cpu, Cog } from 'lucide-react'
import { useFormContext } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Card, CardContent } from '@/components/ui/card'
import { useTerrainElevation } from '~/hooks/use-terrain-elevation'
import { calculateHeightAboveSeaLevel } from '~/lib/elevation'

export function SummaryInfo() {
	const { getValues } = useFormContext()
	const formData = getValues()
	const { t } = useTranslation('newdevice')
	const rawHeightAboveGround = formData.heightAboveGround
	const parsedHeightAboveGround =
		rawHeightAboveGround === undefined ||
		rawHeightAboveGround === null ||
		rawHeightAboveGround === ''
			? null
			: Number(rawHeightAboveGround)
	const heightAboveGround =
		parsedHeightAboveGround === null || Number.isFinite(parsedHeightAboveGround)
			? parsedHeightAboveGround
			: null
	const latitude = Number(formData.latitude)
	const longitude = Number(formData.longitude)
	const elevationLookupConsent = formData.elevationLookupConsent === true
	const shouldResolveElevation =
		heightAboveGround !== null && elevationLookupConsent
	const elevation = useTerrainElevation({
		latitude: shouldResolveElevation ? latitude : undefined,
		longitude: shouldResolveElevation ? longitude : undefined,
		debounceMs: 0,
	})
	const terrainElevation = elevation.result?.elevation ?? null
	const finalHeight = calculateHeightAboveSeaLevel(
		terrainElevation,
		heightAboveGround,
	)
	const modelLabel =
		formData.model === 'luftdaten.info' ? 'Sensor.Community' : formData.model
	let heightSummary: string

	if (heightAboveGround === null) {
		heightSummary = t('height_not_set')
	} else if (!elevationLookupConsent) {
		heightSummary = t('elevation_consent_required')
	} else if (elevation.status === 'loading') {
		heightSummary = t('fetching_elevation')
	} else if (finalHeight !== null) {
		heightSummary = `${Math.round(finalHeight)} m`
	} else {
		heightSummary = t('elevation_unavailable')
	}

	const sections = [
		{
			title: 'General Info',
			icon: <Tag className="h-5 w-5" />,
			data: [
				{ label: 'Name', value: formData.name },
				{ label: 'exposure', value: formData.exposure },
				{
					label: 'Tags',
					value:
						formData.tags?.map((tag: any) => tag.value).join(', ') || 'None',
				},
			],
		},
		{
			title: 'Location',
			icon: <MapPin className="h-5 w-5" />,
			data: [
				{ label: 'latitude', value: parseFloat(formData.latitude).toFixed(4) },
				{
					label: 'longitude',
					value: parseFloat(formData.longitude).toFixed(4),
				},
				{
					label: 'final_height',
					value: heightSummary,
				},
			],
		},
		{
			title: 'Device',
			icon: <Smartphone className="h-5 w-5" />,
			data: [{ label: 'Model', value: modelLabel }],
		},
		{
			title: 'Sensors',
			icon: <Cpu className="h-5 w-5" />,
			data:
				formData.selectedSensors?.map((sensor: any) => ({
					value: sensor.sensorType,
					label: sensor.title,
				})) || [],
		},
		{
			title: 'Advanced',
			icon: <Cog className="h-5 w-5" />,
			data: [
				{ label: 'MQTT Enabled', value: formData.mqttEnabled ? 'Yes' : 'No' },
				{ label: 'TTN Enabled', value: formData.ttnEnabled ? 'Yes' : 'No' },
			],
		},
	]

	return (
		<div className="space-y-6">
			<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
				{sections.map((section, index) => (
					<Card
						key={index}
						className="border-border bg-card overflow-hidden border shadow-xs"
					>
						<CardContent className="p-0">
							<div className="bg-muted/40 flex items-center gap-3 border-b px-4 py-3">
								<div className="bg-background text-muted-foreground flex h-9 w-9 items-center justify-center rounded-md shadow-xs">
									{section.icon}
								</div>
								<h4 className="text-foreground text-sm font-semibold tracking-tight">
									{t(section.title)}
								</h4>
							</div>

							<div className="space-y-2 p-4">
								{section.data.map((item: any, idx: any) => (
									<div
										key={idx}
										className="flex items-start justify-between gap-4"
									>
										<span className="text-muted-foreground text-sm">
											{t(item.label)}:
										</span>
										<span className="text-foreground max-w-[60%] text-right text-sm font-medium">
											{item.value}
										</span>
									</div>
								))}
							</div>
						</CardContent>
					</Card>
				))}
			</div>
		</div>
	)
}

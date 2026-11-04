import { FileJson, Library, Lock, Search, X } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { type CustomDeviceSchemaUpload, type Sensor } from './sensors-info'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '~/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import { uploadedDeviceSchemaV1 } from '~/lib/device-schemas/device-schema-v1'

type RegistryDeviceSchema = {
	id: string
	slug: string
	name: string
	description: string | null
	tags: string[]
	visibility: 'private' | 'public'
	versionId: string
	version: string
	formatVersion: string
	hash: string
	publishedAt: string | null
	isOwner: boolean
	content: NonNullable<CustomDeviceSchemaUpload>
}

type RegistryResponse = {
	schemas: RegistryDeviceSchema[]
}

export function CustomDeviceConfig() {
	const { control, setValue } = useFormContext()
	const sensors =
		(useWatch({ control, name: 'selectedSensors' }) as Sensor[] | undefined) ??
		[]
	const deviceSchema = useWatch({
		control,
		name: 'deviceSchema',
	}) as CustomDeviceSchemaUpload | undefined
	const deviceSchemaVersionId = useWatch({
		control,
		name: 'deviceSchemaVersionId',
	}) as string | undefined
	const selectedRegistrySchema = useWatch({
		control,
		name: 'deviceSchemaRegistrySelection',
	}) as RegistryDeviceSchema | undefined
	const [schemaError, setSchemaError] = useState<string | null>(null)
	const [registryQuery, setRegistryQuery] = useState('')
	const [registrySchemas, setRegistrySchemas] = useState<
		RegistryDeviceSchema[]
	>([])
	const [isRegistryLoading, setIsRegistryLoading] = useState(false)
	const [newSensor, setNewSensor] = useState<Sensor>({
		title: '',
		unit: '',
		sensorType: '',
	})
	const { t } = useTranslation('newdevice')

	useEffect(() => {
		const abortController = new AbortController()
		const timeout = setTimeout(async () => {
			setIsRegistryLoading(true)

			try {
				const params = new URLSearchParams()
				if (registryQuery.trim()) params.set('q', registryQuery.trim())

				const response = await fetch(
					`/resources/device-schemas?${params.toString()}`,
					{ signal: abortController.signal },
				)

				if (!response.ok) throw new Error(t('device_schema_registry_error'))

				const data = (await response.json()) as RegistryResponse
				setRegistrySchemas(data.schemas)
			} catch (error) {
				if (abortController.signal.aborted) return
				setSchemaError(
					error instanceof Error
						? error.message
						: t('device_schema_registry_error'),
				)
			} finally {
				if (!abortController.signal.aborted) setIsRegistryLoading(false)
			}
		}, 250)

		return () => {
			abortController.abort()
			clearTimeout(timeout)
		}
	}, [registryQuery, t])

	const updateNewSensor = (field: keyof Sensor, value: string) => {
		setNewSensor((prev) => ({ ...prev, [field]: value }))
	}

	const addSensor = () => {
		if (deviceSchema || deviceSchemaVersionId) return
		if (!newSensor.title || !newSensor.unit || !newSensor.sensorType) return

		setValue('selectedSensors', [...sensors, newSensor])
		setNewSensor({ title: '', unit: '', sensorType: '' })
	}

	const removeSensor = (index: number) => {
		if (deviceSchema || deviceSchemaVersionId) return

		const updatedSensors = sensors.filter((_, i) => i !== index)
		setValue('selectedSensors', updatedSensors)
	}

	const importDeviceSchema = async (file: File) => {
		setSchemaError(null)

		try {
			const parsedJson = JSON.parse(await file.text())
			const parsedSchema = uploadedDeviceSchemaV1.parse(parsedJson)
			const schemaSensors = parsedSchema.sensors.map((sensor) => ({
				id: sensor.id,
				title: sensor.title,
				unit: sensor.unit,
				sensorType: sensor.sensorType,
				icon: sensor.icon,
				sensorWikiType: sensor.sensorWikiType,
				sensorWikiPhenomenon: sensor.sensorWikiPhenomenon,
				sensorWikiUnit: sensor.sensorWikiUnit,
			}))

			setValue('deviceSchema', parsedSchema)
			setValue('deviceSchemaVersionId', undefined)
			setValue('deviceSchemaRegistrySelection', undefined)
			setValue('selectedSensors', schemaSensors)
		} catch (error) {
			setSchemaError(
				error instanceof Error
					? error.message
					: t('device_schema_invalid_file'),
			)
		}
	}

	const clearDeviceSchema = () => {
		setSchemaError(null)
		setValue('deviceSchema', undefined)
		setValue('deviceSchemaVersionId', undefined)
		setValue('deviceSchemaRegistrySelection', undefined)
		setValue('selectedSensors', [])
	}

	const applyRegistrySchema = (schema: RegistryDeviceSchema) => {
		const schemaSensors = schema.content.sensors.map((sensor) => ({
			id: sensor.id,
			title: sensor.title,
			unit: sensor.unit,
			sensorType: sensor.sensorType,
			icon: sensor.icon,
			sensorWikiType: sensor.sensorWikiType,
			sensorWikiPhenomenon: sensor.sensorWikiPhenomenon,
			sensorWikiUnit: sensor.sensorWikiUnit,
		}))

		setSchemaError(null)
		setValue('deviceSchema', undefined)
		setValue('deviceSchemaVersionId', schema.versionId)
		setValue('deviceSchemaRegistrySelection', schema)
		setValue('selectedSensors', schemaSensors)
	}

	const userHasSelectedSchema = !!deviceSchema || !!deviceSchemaVersionId
	const selectedSchemaName = deviceSchema?.name ?? selectedRegistrySchema?.name
	const selectedSchemaVersion =
		deviceSchema?.version ?? selectedRegistrySchema?.version
	const selectedSchemaSensorCount =
		deviceSchema?.sensors.length ??
		selectedRegistrySchema?.content.sensors.length

	return (
		<div className="space-y-4 p-2">
			<Tabs defaultValue="schema" className="space-y-4">
				<div className="overflow-x-auto pb-1">
					<TabsList className="h-auto w-full min-w-max justify-evenly">
						<TabsTrigger value="schema" className="shrink-0">
							{t('device_schema_tab')}
						</TabsTrigger>
						<TabsTrigger value="manual" className="shrink-0">
							{t('manual_sensors_tab')}
						</TabsTrigger>
						<TabsTrigger value="selected" className="shrink-0">
							{t('selected_sensors_tab', { count: sensors.length })}
						</TabsTrigger>
					</TabsList>
				</div>

				<TabsContent value="schema" className="space-y-4">
					<div className="border-border bg-muted/20 rounded-lg border border-dashed p-4">
						<div className="space-y-3">
							<div className="space-y-1">
								<div className="flex items-center gap-2 font-medium">
									<Library className="h-4 w-4" />
									{t('device_schema_registry')}
								</div>
								<p className="text-muted-foreground text-sm">
									{t('device_schema_registry_text')}
								</p>
							</div>
							<div className="relative">
								<Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
								<Input
									value={registryQuery}
									onChange={(event) => setRegistryQuery(event.target.value)}
									placeholder={t('device_schema_registry_search')}
									className="pl-9"
								/>
							</div>
							<div className="max-h-64 space-y-2 overflow-auto">
								{isRegistryLoading && (
									<p className="text-muted-foreground text-sm">
										{t('loading')}
									</p>
								)}
								{!isRegistryLoading && registrySchemas.length === 0 && (
									<p className="text-muted-foreground text-sm">
										{t('device_schema_registry_empty')}
									</p>
								)}
								{registrySchemas.map((schema) => (
									<Card key={schema.versionId}>
										<CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
											<div className="space-y-1">
												<div className="flex flex-wrap items-center gap-2">
													<span className="font-medium">{schema.name}</span>
													<Badge variant="secondary">v{schema.version}</Badge>
													<Badge variant="outline">
														{schema.content.sensors.length} {t('sensors')}
													</Badge>
												</div>
												{schema.description && (
													<p className="text-muted-foreground text-sm">
														{schema.description}
													</p>
												)}
											</div>
											<Button
												type="button"
												variant={
													deviceSchemaVersionId === schema.versionId
														? 'secondary'
														: 'outline'
												}
												onClick={() => applyRegistrySchema(schema)}
											>
												{deviceSchemaVersionId === schema.versionId
													? t('selected')
													: t('device_schema_use')}
											</Button>
										</CardContent>
									</Card>
								))}
							</div>
						</div>
					</div>

					<div className="border-border bg-muted/20 rounded-lg border border-dashed p-4">
						<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
							<div className="space-y-1">
								<div className="flex items-center gap-2 font-medium">
									<FileJson className="h-4 w-4" />
									{t('device_schema_upload')}
								</div>
								<p className="text-muted-foreground text-sm">
									{t('device_schema_upload_text')}
								</p>
								<a
									href="/examples/device-schema.json"
									download
									className="text-primary inline-flex text-sm font-medium underline-offset-4 hover:underline"
								>
									{t('device_schema_example_download')}
								</a>
							</div>
							<div className="flex flex-col gap-2 sm:flex-row sm:items-center">
								<Input
									type="file"
									accept="application/json,.json"
									className="w-full max-w-none sm:max-w-64"
									onChange={(event) => {
										const file = event.target.files?.[0]
										if (file) void importDeviceSchema(file)
										event.target.value = ''
									}}
								/>
								{userHasSelectedSchema && (
									<Button
										type="button"
										variant="outline"
										onClick={clearDeviceSchema}
									>
										{t('clear_all')}
									</Button>
								)}
							</div>
						</div>

						{userHasSelectedSchema && (
							<Alert className="mt-4">
								<Lock className="h-4 w-4" />
								<AlertTitle className="flex items-center gap-2">
									{selectedSchemaName ?? t('device_schema_registry_selection')}
									{selectedSchemaVersion && (
										<Badge variant="secondary">v{selectedSchemaVersion}</Badge>
									)}
								</AlertTitle>
								<AlertDescription>
									{t('device_schema_locked_sensors', {
										count: selectedSchemaSensorCount ?? sensors.length,
									})}
								</AlertDescription>
							</Alert>
						)}

						{schemaError && (
							<p className="text-destructive mt-3 text-sm">{schemaError}</p>
						)}
					</div>
				</TabsContent>

				<TabsContent value="manual" className="space-y-4">
					{userHasSelectedSchema && (
						<Alert>
							<Lock className="h-4 w-4" />
							<AlertTitle>{t('manual_sensors_locked')}</AlertTitle>
							<AlertDescription>
								{t('manual_sensors_locked_text')}
							</AlertDescription>
						</Alert>
					)}

					<div>
						<div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
							<div>
								<Label htmlFor="phenomenon">{t('phenomenon')}</Label>
								<Input
									id="phenomenon"
									value={newSensor.title}
									onChange={(e) => updateNewSensor('title', e.target.value)}
									placeholder="e.g., Temperature"
									disabled={userHasSelectedSchema}
								/>
							</div>
							<div>
								<Label htmlFor="unit">{t('unit')}</Label>
								<Input
									id="unit"
									value={newSensor.unit}
									onChange={(e) => updateNewSensor('unit', e.target.value)}
									placeholder="e.g., °C"
									disabled={userHasSelectedSchema}
								/>
							</div>
							<div>
								<Label htmlFor="type">{t('type')}</Label>
								<Input
									id="type"
									value={newSensor.sensorType}
									onChange={(e) =>
										updateNewSensor('sensorType', e.target.value)
									}
									placeholder="e.g., HDC1080"
									disabled={userHasSelectedSchema}
								/>
							</div>
						</div>
						<Button
							type="button"
							onClick={addSensor}
							disabled={
								userHasSelectedSchema ||
								!newSensor.title ||
								!newSensor.unit ||
								!newSensor.sensorType
							}
						>
							{t('add_sensor')}
						</Button>
					</div>
				</TabsContent>

				<TabsContent value="selected" className="space-y-2">
					{sensors.length === 0 ? (
						<p className="text-muted-foreground text-sm">
							{t('no_selected_sensors')}
						</p>
					) : (
						<>
							<Separator />
							{sensors.map((sensor, index) => (
								<Card key={index}>
									<CardContent className="flex items-center justify-between p-4">
										<div>
											<span className="font-medium">{sensor.title}</span> (
											{sensor.unit}) - {sensor.sensorType}
										</div>
										<Button
											variant="ghost"
											size="icon"
											disabled={userHasSelectedSchema}
											onClick={(e) => {
												e.preventDefault()
												removeSensor(index)
											}}
										>
											<X className="h-4 w-4" />
										</Button>
									</CardContent>
								</Card>
							))}
						</>
					)}
				</TabsContent>
			</Tabs>
		</div>
	)
}

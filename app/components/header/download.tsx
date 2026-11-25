import { type BBox } from 'geojson'
import {
	AlertTriangle,
	CheckCircle2,
	Download as DownloadIcon,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMap } from 'react-map-gl/maplibre'
import { useFetcher, useSearchParams } from 'react-router'

import { Button } from '../ui/button'
import { Checkbox } from '../ui/checkbox'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '../ui/dialog'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '../ui/select'
import { toast } from '../ui/use-toast'

type DownloadActionData =
	| {
			href: string
			download?: string
			error?: never
			link?: never
	  }
	| {
			error: string
			link?: string
			href?: never
			download?: never
	  }

type DeviceFeature = {
	geometry?: {
		coordinates?: number[]
	}
	properties?: {
		id?: string | number
	}
}

type DevicesGeoJson = {
	features?: DeviceFeature[]
}

type DownloadProps = {
	devices: DevicesGeoJson
	open: boolean
	onOpenChange: (open: boolean) => void
}

type DownloadFields = {
	title: boolean
	unit: boolean
	value: boolean
	timestamp: boolean
	coordinates: boolean
}

const DEFAULT_FIELDS: DownloadFields = {
	title: true,
	unit: true,
	value: true,
	timestamp: true,
	coordinates: true,
}

export const DOWNLOAD_FILTER_KEYS = new Set([
	'phenomenon',
	'timeMode',
	'date',
	'from',
	'to',
])

function getDeviceIdsInBounds(
	devices: DevicesGeoJson,
	bounds: BBox | undefined,
): string[] {
	if (!bounds || bounds.length !== 4) {
		return []
	}

	const [minLon, minLat, maxLon, maxLat] = bounds

	const ids =
		devices.features
			?.filter((device) => {
				const coordinates = device.geometry?.coordinates

				if (!coordinates) {
					return false
				}

				const [longitude, latitude] = coordinates

				return (
					longitude >= minLon &&
					longitude <= maxLon &&
					latitude >= minLat &&
					latitude <= maxLat
				)
			})
			.map((device) => device.properties?.id)
			.filter((id): id is string | number => id !== undefined && id !== null)
			.map(String) ?? []

	return Array.from(new Set(ids))
}

function PulsingDownloadAnimation() {
	const { t } = useTranslation('download')

	return (
		<div className="flex items-center justify-center">
			<div className="relative">
				<div className="animate-bounce text-blue-600">
					<DownloadIcon className="h-6 w-6" />
				</div>

				<div className="absolute top-0 left-0 h-full w-full animate-ping rounded-full border-2 border-blue-400 opacity-75" />

				<div
					className="absolute top-0 left-0 h-full w-full animate-pulse rounded-full border border-blue-300 opacity-75"
					style={{ animationDelay: '0.3s' }}
				/>

				<div
					className="absolute -top-4 -left-4 h-2 w-2 animate-ping rounded-full bg-blue-500"
					style={{ animationDelay: '0.1s' }}
				/>

				<div
					className="absolute -top-4 left-0 h-2 w-2 animate-ping rounded-full bg-blue-500"
					style={{ animationDelay: '0.4s' }}
				/>

				<div
					className="absolute -top-4 left-4 h-2 w-2 animate-ping rounded-full bg-blue-500"
					style={{ animationDelay: '0.7s' }}
				/>
			</div>

			<span className="ml-3 font-medium text-blue-600">
				{t('processingData')}
			</span>
		</div>
	)
}

function DataReadyAnimation() {
	const { t } = useTranslation('download')

	return (
		<div className="flex items-center justify-center text-green-700">
			<CheckCircle2 className="h-6 w-6 animate-pulse" />
			<span className="ml-2">{t('readyToDownload')}</span>
		</div>
	)
}

export default function Download({
	devices,
	open,
	onOpenChange,
}: DownloadProps) {
	const { t } = useTranslation('download')
	const fetcher = useFetcher<DownloadActionData>()
	const actionData = fetcher.data

	const [searchParams] = useSearchParams()
	const { osem: mapRef } = useMap()

	const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	const [format, setFormat] = useState('csv')
	const [aggregate, setAggregate] = useState('raw')
	const [fields, setFields] = useState<DownloadFields>(DEFAULT_FIELDS)

	const [isDownloadReady, setIsDownloadReady] = useState(false)
	const [showReadyAnimation, setShowReadyAnimation] = useState(false)
	const [downloadStarted, setDownloadStarted] = useState(false)
	const [errorMessage, setErrorMessage] = useState<string | null>(null)

	const isBusy = fetcher.state !== 'idle'
	const hasSelectedFields = Object.values(fields).some(Boolean)

	const activeFilterEntries = useMemo(() => {
		return Array.from(searchParams.entries()).filter(([key]) =>
			DOWNLOAD_FILTER_KEYS.has(key),
		)
	}, [searchParams])

	const deviceIds = useMemo(() => {
		const bounds = mapRef?.getMap().getBounds()?.toArray().flat() as
			| BBox
			| undefined

		return getDeviceIdsInBounds(devices, bounds)
	}, [devices, mapRef, open])

	const resetResultState = () => {
		setIsDownloadReady(false)
		setShowReadyAnimation(false)
		setDownloadStarted(false)
		setErrorMessage(null)
	}

	const handleDialogOpenChange = (nextOpen: boolean) => {
		onOpenChange(nextOpen)

		if (!nextOpen) {
			resetResultState()
		}
	}

	const handleFormatChange = (value: string) => {
		setFormat(value)
		resetResultState()
	}

	const handleAggregateChange = (value: string) => {
		setAggregate(value)
		setFields((currentFields) => ({
			...currentFields,
			coordinates: value === 'raw',
		}))
		resetResultState()
	}

	const handleFieldChange = (
		field: keyof DownloadFields,
		checked: boolean | 'indeterminate',
	) => {
		setFields((currentFields) => ({
			...currentFields,
			[field]: checked === true,
		}))

		resetResultState()
	}

	const handleSubmit = () => {
		resetResultState()
	}

	const handleDownloadStart = () => {
		const delay = 3500

		if (closeTimerRef.current) {
			clearTimeout(closeTimerRef.current)
		}

		setDownloadStarted(true)
		setShowReadyAnimation(false)

		toast({
			description: t('toast'),
			duration: delay,
			variant: 'success',
		})

		closeTimerRef.current = setTimeout(() => {
			setDownloadStarted(false)
			onOpenChange(false)
		}, delay)
	}

	useEffect(() => {
		if (!actionData) {
			return
		}

		if ('error' in actionData && actionData.error) {
			setErrorMessage(actionData.error)
			setIsDownloadReady(false)
			setShowReadyAnimation(false)
			return
		}

		if ('href' in actionData && actionData.href) {
			setErrorMessage(null)
			setIsDownloadReady(true)
			setShowReadyAnimation(true)
		}
	}, [actionData])

	useEffect(() => {
		return () => {
			if (closeTimerRef.current) {
				clearTimeout(closeTimerRef.current)
			}
		}
	}, [])

	return (
		<Dialog open={open} onOpenChange={handleDialogOpenChange}>
			<DialogContent className="p-4 sm:max-w-xl sm:p-6">
				<DialogHeader>
					<DialogTitle>{t('downloadOptions')}</DialogTitle>
					<DialogDescription>{t('downloadDescription')}</DialogDescription>
				</DialogHeader>

				<fetcher.Form
					action="/explore"
					method="post"
					className="grid gap-4"
					onSubmit={handleSubmit}
				>
					{activeFilterEntries.map(([key, value], index) => (
						<input
							key={`${key}-${value}-${index}`}
							type="hidden"
							name={key}
							value={value}
						/>
					))}

					<div className="grid gap-3">
						<div className="flex flex-wrap items-center justify-between gap-2">
							<Label htmlFor="devices">{t('devices')}</Label>

							<span className="text-sm font-medium text-blue-600">
								{deviceIds.length} 📡 {t('selected')}
							</span>
						</div>

						<Input
							id="devices"
							name="devices"
							value={deviceIds.join(',')}
							readOnly
						/>

						{deviceIds.length === 0 && (
							<p className="text-muted-foreground text-sm">
								{t(
									'noDevicesInBounds',
									'No devices are currently selected in the visible map area.',
								)}
							</p>
						)}

						{activeFilterEntries.length > 0 && (
							<p className="text-muted-foreground text-sm">
								{t(
									'activeFiltersApplied',
									'The currently active filters will be applied to this download.',
								)}
							</p>
						)}

						<Label htmlFor="format">{t('format')}</Label>

						<Select
							name="format"
							value={format}
							onValueChange={handleFormatChange}
						>
							<SelectTrigger id="format">
								<SelectValue placeholder={t('selectFormat')} />
							</SelectTrigger>

							<SelectContent>
								<SelectItem value="csv">CSV</SelectItem>
								<SelectItem value="json">JSON</SelectItem>
								<SelectItem value="txt">{t('text')}</SelectItem>
							</SelectContent>
						</Select>

						<Label htmlFor="aggregate">{t('aggregateTo')}</Label>

						<Select
							name="aggregate"
							value={aggregate}
							onValueChange={handleAggregateChange}
						>
							<SelectTrigger id="aggregate">
								<SelectValue placeholder={t('aggregateTo')} />
							</SelectTrigger>

							<SelectContent>
								<SelectItem value="raw">{t('rawData')}</SelectItem>
								<SelectItem value="10m">{t('10minutes')}</SelectItem>
								<SelectItem value="1h">{t('1hour')}</SelectItem>
								<SelectItem value="1d">{t('1day')}</SelectItem>
								<SelectItem value="1m">{t('1month')}</SelectItem>
								<SelectItem value="1y">{t('1year')}</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<fieldset className="grid grid-cols-2 gap-3" id="fields">
						<legend className="col-span-2 text-sm font-medium">
							{t('fieldsToInclude')}
						</legend>

						{Object.entries(fields).map(([field, checked]) => {
							const isCoordinateField = field === 'coordinates'

							return (
								<div key={field} className="flex items-center space-x-2">
									<Checkbox
										id={field}
										name={field}
										value="on"
										checked={checked}
										disabled={isCoordinateField && aggregate !== 'raw'}
										onCheckedChange={(nextChecked) =>
											handleFieldChange(
												field as keyof DownloadFields,
												nextChecked,
											)
										}
									/>

									<Label htmlFor={field} className="cursor-pointer">
										{t(field)}
									</Label>
								</div>
							)
						})}
					</fieldset>

					{aggregate !== 'raw' && (
						<p className="text-muted-foreground text-sm">
							{t('coordinatesRawOnly')}
						</p>
					)}

					<div className="flex min-h-16 items-center justify-center text-center">
						{isBusy ? (
							<PulsingDownloadAnimation />
						) : showReadyAnimation ? (
							<DataReadyAnimation />
						) : null}
					</div>

					{errorMessage && (
						<div className="flex min-w-0 items-center gap-3 rounded-md border border-red-300 bg-red-100 p-3 text-red-700">
							<AlertTriangle className="h-8 w-8 shrink-0 animate-pulse text-red-500" />

							<p className="min-w-0 text-sm wrap-break-word">
								{t('error')}{' '}
								{actionData && 'link' in actionData && actionData.link ? (
									<>
										<a
											href={actionData.link}
											className="font-medium text-blue-700 underline"
											target="_blank"
											rel="noreferrer"
										>
											{t('clickHere')}
										</a>{' '}
										{t('toGoToArchive')}
									</>
								) : null}
							</p>
						</div>
					)}

					{!hasSelectedFields && (
						<p className="text-sm text-red-600">
							{t(
								'selectAtLeastOneField',
								'Please select at least one field to include.',
							)}
						</p>
					)}

					<DialogFooter>
						<div className="flex w-full flex-col items-stretch justify-center gap-2 sm:flex-row sm:items-center sm:gap-4">
							<Button
								type="submit"
								className="text-dark w-full bg-blue-100 transition-colors hover:bg-blue-200 sm:w-auto"
								disabled={
									isBusy || deviceIds.length === 0 || !hasSelectedFields
								}
							>
								{isBusy ? t('processing') : t('generateFile')}
							</Button>

							{actionData &&
							'href' in actionData &&
							actionData.href &&
							isDownloadReady ? (
								<a
									href={actionData.href}
									download={actionData.download}
									className={`text-dark flex min-h-10 w-full items-center justify-center rounded px-4 py-2 text-center transition-colors sm:w-auto ${
										downloadStarted
											? 'animate-pulse bg-blue-300'
											: 'bg-green-100 hover:bg-green-400'
									}`}
									onClick={handleDownloadStart}
								>
									<DownloadIcon className="mr-2 h-4 w-4" />

									{downloadStarted
										? t('downloading')
										: `${format.toUpperCase()} ${t('data')} ${t('download')}`}
								</a>
							) : null}
						</div>
					</DialogFooter>
				</fetcher.Form>
			</DialogContent>
		</Dialog>
	)
}

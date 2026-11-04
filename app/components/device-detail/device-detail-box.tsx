import clsx from 'clsx'
import {
	ChevronUp,
	Minus,
	Share2,
	XSquare,
	EllipsisVertical,
	X,
	ExternalLink,
	Scale,
	Archive,
	Cpu,
	Rss,
	CalendarPlus,
	Hash,
	LandPlot,
	Mountain,
	Image as ImageIcon,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { isTablet, isBrowser } from 'react-device-detect'
import Draggable, { type DraggableData } from 'react-draggable'
import { useTranslation } from 'react-i18next'
import {
	useLoaderData,
	useMatches,
	useNavigate,
	useNavigation,
	useParams,
	useSearchParams,
	Link,
} from 'react-router'
import { MarkdownContent } from '../markdown-content'
import SensorIcon from '../sensor-icon'
import Spinner from '../spinner'
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from '../ui/accordion'
import { Alert, AlertDescription, AlertTitle } from '../ui/alert'
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '../ui/alert-dialog'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from '../ui/card'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import { Separator } from '../ui/separator'
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip'
import { useToast } from '../ui/use-toast'
import EntryLogs from './entry-logs'
import ShareLink from './share-link'
import { useGlobalCompareMode } from './useGlobalCompareMode'
import { type SensorWithLatestMeasurement } from '~/db/schema'
import { getArchiveLink } from '~/lib/archive-link'
import { type loader } from '~/routes/explore.$deviceId'
import { dateDiffToNowInWords } from '~/lib/date'
import { calculateHeightAboveSeaLevel } from '~/lib/elevation'

export interface MeasurementProps {
	sensorId: string
	time: Date
	value: string
	min_value: string
	max_value: string
}

export default function DeviceDetailBox() {
	const navigation = useNavigation()
	const navigate = useNavigate()
	const matches = useMatches()
	const { toast } = useToast()
	const { t, i18n } = useTranslation('device-detail-box')
	const dateFormatter = new Intl.DateTimeFormat(i18n.resolvedLanguage, {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	})

	const sensorIds = new Set()

	const data = useLoaderData<typeof loader>()
	const exploreData = matches.find((match) => match.pathname === '/explore')
		?.loaderData as { user?: { id?: string } } | undefined
	const isOwner =
		typeof data.device?.userId === 'string' &&
		exploreData?.user?.id === data.device.userId
	const nodeRef = useRef<HTMLDivElement>(null)
	// state variables
	const [open, setOpen] = useState(true)
	const [offsetPositionX, setOffsetPositionX] = useState(0)
	const [offsetPositionY, setOffsetPositionY] = useState(0)
	const [compareMode, setCompareMode] = useGlobalCompareMode()
	const [refreshOn] = useState(false)
	const [refreshSecond, setRefreshSecond] = useState(59)

	const [sensors, setSensors] = useState<SensorWithLatestMeasurement[]>()
	useEffect(() => {
		const sortedSensors = [...(data.sensors as any)].sort(
			(a, b) =>
				(a.order ?? Number.MAX_SAFE_INTEGER) -
					(b.order ?? Number.MAX_SAFE_INTEGER) || a.id.localeCompare(b.id),
		)
		setSensors(sortedSensors)
	}, [data])

	const [searchParams] = useSearchParams()

	const { deviceId } = useParams() // Get the deviceId from the URL params

	const createSensorLink = (sensorIdToBeSelected: string) => {
		const lastSegment = matches[matches.length - 1]?.params?.['*']
		if (lastSegment) {
			const secondLastSegment = matches[matches.length - 2]?.params?.sensorId
			sensorIds.add(secondLastSegment)
			sensorIds.add(lastSegment)
		} else {
			const lastSegment = matches[matches.length - 1]?.params?.sensorId
			if (lastSegment) {
				sensorIds.add(lastSegment)
			}
		}

		// If sensorIdToBeSelected is second selected sensor
		if (sensorIds.has(sensorIdToBeSelected) && sensorIds.size === 2) {
			const clonedSet = new Set(sensorIds)
			clonedSet.delete(sensorIdToBeSelected)
			return `/explore/${deviceId}/${Array.from(clonedSet).join('/')}?${searchParams.toString()}`
		} else if (sensorIds.has(sensorIdToBeSelected) && sensorIds.size === 1) {
			return `/explore/${deviceId}?${searchParams.toString()}`
		} else if (sensorIds.size === 0) {
			return `/explore/${deviceId}/${sensorIdToBeSelected}?${searchParams.toString()}`
		} else if (sensorIds.size === 1) {
			return `/explore/${deviceId}/${Array.from(sensorIds).join('/')}/${sensorIdToBeSelected}?${searchParams.toString()}`
		}

		return ''
	}

	const isSensorActive = (sensorId: string) => {
		if (sensorIds.has(sensorId)) {
			return 'bg-green-100 dark:bg-dark-green'
		}

		return 'hover:bg-muted'
	}

	function handleDrag(_e: any, data: DraggableData) {
		setOffsetPositionX(data.x)
		setOffsetPositionY(data.y)
	}

	useEffect(() => {
		let interval: any = null
		if (refreshOn) {
			if (refreshSecond == 0) {
				setRefreshSecond(59)
			}
			interval = setInterval(() => {
				setRefreshSecond((refreshSecond) => refreshSecond - 1)
			}, 1000)
		} else if (!refreshOn) {
			clearInterval(interval)
		}
		return () => clearInterval(interval)
	}, [refreshOn, refreshSecond])

	if (!data.device) return null

	const heightAboveSeaLevel = calculateHeightAboveSeaLevel(
		data.device.terrainElevation,
		data.device.heightAboveGround,
	)

	return (
		<>
			{open && (
				<Draggable
					nodeRef={nodeRef as React.RefObject<HTMLDivElement>}
					defaultPosition={{ x: offsetPositionX, y: offsetPositionY }}
					onDrag={handleDrag}
					bounds="#osem"
					handle="#deviceDetailBoxTop"
					disabled={!isBrowser && !isTablet}
				>
					<div
						ref={nodeRef}
						className="absolute top-30 right-4 bottom-6 left-4 z-40 flex flex-row px-4 py-2 lg:top-auto lg:bottom-7.5 lg:left-2.5 lg:max-h-[calc(100dvh-8rem)] lg:w-[min(28rem,calc(100vw-2rem))] lg:p-0"
					>
						<div
							id="deviceDetailBox"
							className={
								'relative float-left flex h-full max-h-[calc(100dvh-4rem)] w-full min-w-0 flex-col gap-4 rounded-xl bg-white px-4 py-2 text-sm font-medium text-zinc-800 shadow-lg ring-1 shadow-zinc-800/5 ring-zinc-900/5 lg:max-h-[calc(100dvh-8rem)] dark:bg-zinc-800 dark:text-zinc-200 dark:opacity-95 dark:ring-white dark:backdrop-blur-xs'
							}
						>
							{navigation.state === 'loading' && (
								<div className="absolute inset-0 z-50 flex items-center justify-center bg-white/30 backdrop-blur-xs dark:bg-zinc-800/30">
									<Spinner />
								</div>
							)}
							<div
								id="deviceDetailBoxTop"
								className="flex w-full cursor-move items-center gap-3 py-2"
							>
								<div
									className={
										data.device.status === 'active'
											? 'bg-light-green h-4 w-4 rounded-full'
											: 'h-4 w-4 rounded-full bg-red-500'
									}
								></div>
								<div className="min-w-0 flex-1 truncate text-center text-xl text-zinc-600 dark:dark:text-zinc-100">
									{data.device.name}
								</div>
								<AlertDialog>
									<AlertDialogTrigger asChild>
										<Share2 className="cursor-pointer" />
									</AlertDialogTrigger>
									<AlertDialogContent>
										<AlertDialogHeader>
											<AlertDialogTitle>{t('share_link')}</AlertDialogTitle>
											<ShareLink />
										</AlertDialogHeader>
										<AlertDialogFooter>
											<AlertDialogCancel>{t('close')}</AlertDialogCancel>
										</AlertDialogFooter>
									</AlertDialogContent>
								</AlertDialog>
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button variant="ghost" className="h-8 w-8 p-0">
											<span className="sr-only">{t('open_menu')}</span>
											<EllipsisVertical className="h-4 w-4" />
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent
										align="end"
										className="dark:bg-dark-background dark:text-dark-text"
									>
										<DropdownMenuLabel>{t('actions')}</DropdownMenuLabel>
										<DropdownMenuSeparator />
										<DropdownMenuItem
											className="cursor-pointer"
											disabled={true}
										>
											<Scale className="mr-2 h-4 w-4" />
											<span>{t('compare')}</span>
										</DropdownMenuItem>
										<DropdownMenuItem>
											<Archive className="mr-2 h-4 w-4" />
											<span>
												<a
													href={getArchiveLink(data.device)}
													target="_blank"
													rel="noopener noreferrer"
													title={t('open_archive')}
													className="w-full cursor-pointer"
												>
													{t('open_archive')}
												</a>
											</span>
										</DropdownMenuItem>
										<DropdownMenuItem>
											<ExternalLink className="mr-2 h-4 w-4" />
											<span>
												<a
													href={data.device.link || '#'}
													target="_blank"
													rel="noopener noreferrer"
													title={t('open_external_link')}
													className="w-full cursor-pointer"
												>
													{t('open_external_link')}
												</a>
											</span>
										</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>

								<Minus
									className="cursor-pointer"
									onClick={() => setOpen(false)}
								/>
								<X
									className="cursor-pointer"
									onClick={() => {
										void navigate({
											pathname: '/explore',
											search: searchParams.toString(),
										})
									}}
								/>
							</div>
							<div className="no-scrollbar relative flex-1 overflow-y-scroll">
								<div className="space-y-4 md:flex md:space-y-0 md:space-x-4">
									<div className="md:w-1/2">
										{data.deviceImageUrl ? (
											<img
												className="w-full rounded-lg object-cover"
												alt={t('device_image')}
												src={data.deviceImageUrl}
											/>
										) : (
											<div className="text-muted-foreground w-full rounded-lg object-cover">
												<ImageIcon strokeWidth={1} className="h-full w-full" />
											</div>
										)}
									</div>
									<div className="space-y-2 md:w-1/2">
										<InfoItem
											icon={LandPlot}
											title={t('exposure')}
											text={
												data.device.exposure
													? t(`exposure_values.${data.device.exposure}`, {
															defaultValue: data.device.exposure,
														})
													: t('unknown')
											}
										/>
										{heightAboveSeaLevel !== null ? (
											<InfoItem
												icon={Mountain}
												title={t('height_above_sea_level')}
												text={`${Math.round(heightAboveSeaLevel)} m`}
											/>
										) : null}
										<InfoItem
											icon={Cpu}
											title={t('sensor_model')}
											text={data.device.sensorWikiModel || t('unknown')}
										/>
										<Separator className="my-2" />
										<InfoItem
											icon={Rss}
											title={t('last_updated')}
											text={dateFormatter.format(
												new Date(data.device.updatedAt),
											)}
										/>
										<Separator className="my-2" />
										<InfoItem
											icon={CalendarPlus}
											title={t('created_at')}
											text={dateFormatter.format(
												new Date(data.device.createdAt),
											)}
										/>
										{data.device.expiresAt && (
											<>
												<Separator className="my-2" />
												<InfoItem
													icon={CalendarPlus}
													title={t('expires_at')}
													text={dateFormatter.format(
														new Date(data.device.expiresAt),
													)}
												/>
											</>
										)}
									</div>
								</div>
								{data.device.tags && data.device.tags.length > 0 && (
									<div className="pt-4">
										<div className="space-y-2">
											<div className="text-muted-foreground text-sm font-medium">
												{t('tags')}
											</div>
											<div className="flex items-center space-x-2">
												<Hash className="text-muted-foreground h-4 w-4 shrink-0" />
												<div className="flex flex-wrap gap-2">
													{data.device.tags.map((tag: string) => (
														<Badge
															key={tag}
															variant="secondary"
															className={clsx(
																'cursor-pointer text-xs font-medium',
																searchParams
																	.get('tags')
																	?.split(',')
																	.includes(tag)
																	? 'dark:bg-dark-green bg-green-100'
																	: '',
															)}
															onClick={(event) => {
																event.stopPropagation()

																const currentParams = new URLSearchParams(
																	searchParams.toString(),
																)

																// Safely retrieve and parse the current tags
																const currentTags =
																	currentParams.get('tags')?.split(',') || []

																// Toggle the tag in the list
																const updatedTags = currentTags.includes(tag)
																	? currentTags.filter((t) => t !== tag) // Remove if already present
																	: [...currentTags, tag] // Add if not present

																// Update the tags parameter or remove it if empty
																if (updatedTags.length > 0) {
																	currentParams.set(
																		'tags',
																		updatedTags.join(','),
																	)
																} else {
																	currentParams.delete('tags')
																}

																// Update the URL with the new search params
																void navigate({
																	search: currentParams.toString(),
																})
															}}
														>
															{tag}
														</Badge>
													))}
												</div>
											</div>
										</div>
									</div>
								)}
								<Separator className="my-4"></Separator>
								{data.device.logEntries.length > 0 && (
									<>
										<EntryLogs entryLogs={data.device.logEntries} />
										<Separator className="my-4" />
									</>
								)}
								{data.device.description && (
									<Accordion
										type="single"
										collapsible
										className="w-full"
										defaultValue={'item-1'}
									>
										<AccordionItem value="item-1">
											<AccordionTrigger className="font-bold dark:dark:text-zinc-100">
												{t('description')}
											</AccordionTrigger>
											<AccordionContent>
												<MarkdownContent>
													{data?.device.description}
												</MarkdownContent>
											</AccordionContent>
										</AccordionItem>
									</Accordion>
								)}
								<Accordion
									type="single"
									collapsible
									className="w-full"
									defaultValue={'item-1'}
								>
									<AccordionItem value="item-1">
										<AccordionTrigger className="font-bold dark:dark:text-zinc-100">
											{t('sensors')}
										</AccordionTrigger>
										<AccordionContent>
											<div
												className={
													navigation.state === 'loading'
														? 'pointer-events-none'
														: ''
												}
											>
												{isOwner && (
													<Alert className="mb-4 py-3">
														<AlertDescription className="text-xs">
															{t('sensor_order_hint')}{' '}
															<Link
																to={`/device/${data.device.id}/edit/sensors`}
																className="font-medium underline underline-offset-4"
															>
																{t('sensor_order_hint_link')}
															</Link>
														</AlertDescription>
													</Alert>
												)}
												<div className="grid gap-4 md:grid-cols-2">
													{sensors &&
														sensors.map(
															(sensor: SensorWithLatestMeasurement) => {
																const sensorLink = createSensorLink(sensor.id)
																if (sensorLink === '') {
																	return (
																		<Card
																			key={sensor.id}
																			className="flex h-full flex-col"
																			onClick={() =>
																				toast({
																					title: t('sensor_limit_title'),
																					description: t(
																						'sensor_limit_description',
																					),
																					variant: 'destructive',
																				})
																			}
																		>
																			<label
																				htmlFor={sensor.id}
																				className="flex h-full cursor-pointer flex-col"
																			>
																				<input
																					className="peer hidden"
																					disabled={
																						!sensorIds.has(sensor.id) &&
																						sensorIds.size >= 2
																							? true
																							: false
																					}
																					type="checkbox"
																					name="sensor"
																					id={sensor.id}
																					value={sensor.id}
																					defaultChecked={sensorIds.has(
																						sensor.id,
																					)}
																				/>
																				<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
																					<CardTitle
																						className="truncate text-sm font-medium"
																						title={sensor.title || ''}
																					>
																						{sensor.title}
																					</CardTitle>
																					<SensorIcon
																						title={sensor.title || ''}
																						icon={sensor.icon}
																						className="text-muted-foreground ml-2 h-4 w-4 shrink-0"
																					/>
																				</CardHeader>
																				<CardContent className="grow">
																					<div className="flex flex-row items-center space-x-2">
																						<div className="text-2xl font-bold">
																							{sensor.lastMeasurement?.value ??
																								'–'}
																						</div>
																						<p className="text-muted-foreground text-xs">
																							{sensor.unit}
																						</p>
																					</div>
																				</CardContent>
																				<Separator />
																				<CardFooter className="justify-between px-6 py-3">
																					<div className="flex items-center gap-1">
																						<div
																							className={
																								sensor.status === 'active'
																									? 'bg-light-green h-2 w-2 rounded-full'
																									: 'h-2 w-2 rounded-full bg-red-500'
																							}
																						></div>
																						<p className="text-muted-foreground text-xs">
																							{sensor.lastMeasurement
																								? dateDiffToNowInWords(
																										i18n.language,
																										new Date(
																											sensor.lastMeasurement
																												.createdAt,
																										),
																									)
																								: t('no_recent_data')}
																						</p>
																					</div>
																				</CardFooter>
																			</label>
																		</Card>
																	)
																}
																return (
																	<Link
																		key={sensor.id}
																		to={sensorLink}
																		className="h-full"
																	>
																		<Card
																			key={sensor.id}
																			className={clsx(
																				'flex h-full flex-col',
																				isSensorActive(sensor.id),
																			)}
																		>
																			<label
																				htmlFor={sensor.id}
																				className="flex h-full cursor-pointer flex-col"
																			>
																				<input
																					className="peer hidden"
																					disabled={
																						!sensorIds.has(sensor.id) &&
																						sensorIds.size >= 2
																							? true
																							: false
																					}
																					type="checkbox"
																					name="sensor"
																					id={sensor.id}
																					value={sensor.id}
																					defaultChecked={sensorIds.has(
																						sensor.id,
																					)}
																				/>
																				<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
																					<CardTitle
																						className="truncate text-sm font-medium"
																						title={sensor.title || ''}
																					>
																						{sensor.title}
																					</CardTitle>
																					<SensorIcon
																						title={sensor.title || ''}
																						icon={sensor.icon}
																						className="text-muted-foreground ml-2 h-4 w-4 shrink-0"
																					/>
																				</CardHeader>
																				<CardContent className="grow">
																					<div className="flex flex-row items-center space-x-2">
																						<div className="text-2xl font-bold">
																							{sensor.lastMeasurement?.value ??
																								'–'}
																						</div>
																						<p className="text-muted-foreground text-xs">
																							{sensor.unit}
																						</p>
																					</div>
																				</CardContent>
																				<Separator />
																				<CardFooter className="justify-between px-6 py-3">
																					<div className="flex items-center gap-1">
																						<div
																							className={
																								sensor.status === 'active'
																									? 'bg-light-green h-2 w-2 rounded-full'
																									: 'h-2 w-2 rounded-full bg-red-500'
																							}
																						></div>
																						<p className="text-muted-foreground text-xs">
																							{sensor.lastMeasurement
																								? dateDiffToNowInWords(
																										i18n.language,
																										new Date(
																											sensor.lastMeasurement
																												.createdAt,
																										),
																									)
																								: t('no_recent_data')}
																						</p>
																					</div>
																				</CardFooter>
																			</label>
																		</Card>
																	</Link>
																)
															},
														)}
												</div>
											</div>
										</AccordionContent>
									</AccordionItem>
								</Accordion>
							</div>
						</div>
					</div>
				</Draggable>
			)}
			{compareMode && (
				<Alert className="absolute right-1/2 bottom-4 left-1/2 w-1/4 -translate-x-1/2 -translate-y-1/2 transform animate-pulse dark:bg-zinc-800 dark:text-zinc-200 dark:opacity-95">
					<XSquare
						className="h-4 w-4 cursor-pointer"
						onClick={() => {
							setCompareMode(!compareMode)
							setOpen(true)
						}}
					/>
					<AlertTitle>{t('compare_devices')}</AlertTitle>
					<AlertDescription className="inline">
						{t('choose_device_for_comparison')}
					</AlertDescription>
				</Alert>
			)}
			{!open && (
				<div
					onClick={() => {
						setOpen(true)
					}}
					className="absolute bottom-2.5 left-4 flex cursor-pointer rounded-xl border border-gray-100 bg-white shadow-lg transition-colors duration-300 ease-in-out hover:brightness-90 sm:bottom-7.5 sm:left-2.5 dark:bg-zinc-800 dark:text-zinc-200 dark:opacity-90"
				>
					<Tooltip>
						<TooltipTrigger asChild>
							<div className="px-4 py-2">
								<ChevronUp />
							</div>
						</TooltipTrigger>
						<TooltipContent>
							<p>{t('open_device_details')}</p>
						</TooltipContent>
					</Tooltip>
				</div>
			)}
		</>
	)
}

const InfoItem = ({
	icon: Icon,
	title,
	text,
}: {
	icon: React.ElementType
	title: string
	text?: string
}) =>
	text && (
		<div className="space-y-1">
			<div className="text-muted-foreground text-sm font-medium">{title}</div>
			<div className="flex items-center space-x-2 text-sm">
				<Icon className="text-muted-foreground h-4 w-4 shrink-0" />
				<span>{text}</span>
			</div>
		</div>
	)

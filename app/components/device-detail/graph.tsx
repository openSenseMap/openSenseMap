import {
	Chart as ChartJS,
	LineElement,
	TimeScale,
	CategoryScale,
	LinearScale,
	PointElement,
	Legend,
	Tooltip as ChartTooltip,
	Filler,
	Decimation,
	type ChartOptions,
} from 'chart.js'
import 'chartjs-adapter-date-fns'
import { ChartLine, Download, RefreshCcw, X } from 'lucide-react'
import {
	useMemo,
	useRef,
	useState,
	useEffect,
	useContext,
	useCallback,
	type RefObject,
} from 'react'
import { Line } from 'react-chartjs-2'
import { isBrowser, isTablet } from 'react-device-detect'
import Draggable, { type DraggableData } from 'react-draggable'
import { useNavigate, useNavigation, useSearchParams } from 'react-router'
import { AggregationFilter } from '../aggregation-filter'
import { ClientOnly } from '../client-only'
import { ColorPicker } from '../color-picker'
import { DateRangeFilter } from '../daterange-filter'
import { HoveredPointContext } from '../map/layers/mobile/mobile-box-layer'
import Spinner from '../spinner'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip'
import { datesHave48HourRange } from '~/lib/utils'
import { useTranslation } from 'react-i18next'
import {
	createMeasurementChartData,
	type MeasurementChartData,
	type MeasurementChartPoint,
} from '~/lib/measurement-chart'

ChartJS.register(
	LineElement,
	TimeScale,
	CategoryScale,
	LinearScale,
	PointElement,
	ChartTooltip,
	Legend,
	Filler,
	Decimation,
)

let zoomPluginRegistration: Promise<void> | null = null

function registerZoomPlugin(): Promise<void> {
	if (zoomPluginRegistration) return zoomPluginRegistration

	zoomPluginRegistration = import('chartjs-plugin-zoom')
		.then(({ default: zoomPlugin }) => {
			ChartJS.register(zoomPlugin)
		})
		.catch((error: unknown) => {
			zoomPluginRegistration = null
			console.error('Failed to register chartjs-plugin-zoom:', error)
			throw error
		})

	return zoomPluginRegistration
}

interface GraphWithZoomProps {
	chartData: MeasurementChartData
	options: ChartOptions<'line'>
	chartRef: RefObject<ChartJS<'line', MeasurementChartPoint[], unknown> | null>
	onMouseLeave: () => void
}

// ClientOnly component to handle the plugin that needs window
const GraphWithZoom = ({
	chartData,
	options,
	chartRef,
	onMouseLeave,
}: GraphWithZoomProps) => {
	const [isZoomPluginSettled, setIsZoomPluginSettled] = useState(false)

	useEffect(() => {
		let isMounted = true
		const finishLoadingZoomPlugin = () => {
			if (isMounted) setIsZoomPluginSettled(true)
		}

		void registerZoomPlugin().then(
			finishLoadingZoomPlugin,
			finishLoadingZoomPlugin,
		)

		return () => {
			isMounted = false
		}
	}, [])

	if (!isZoomPluginSettled) return <Spinner />

	return (
		<Line
			data={chartData}
			options={options}
			ref={chartRef}
			onMouseLeave={onMouseLeave}
		></Line>
	)
}

interface GraphProps {
	aggregation: string
	sensors: any[]
	startDate?: string
	endDate?: string
}

export default function Graph({
	aggregation,
	sensors,
	startDate,
	endDate,
}: GraphProps) {
	const { hoveredPoint, setHoveredPoint } = useContext(HoveredPointContext)
	const navigation = useNavigation()
	const { t, i18n } = useTranslation('graph')
	const navigate = useNavigate()
	const [offsetPositionX, setOffsetPositionX] = useState(0)
	const [offsetPositionY, setOffsetPositionY] = useState(0)
	const [connectDots, setConnectDots] = useState(false)
	const [currentZoom, setCurrentZoom] = useState<{
		xMin: number
		xMax: number
	} | null>(null) // To track zoom
	const [searchParams, setSearchParams] = useSearchParams()
	const [colorPickerState, setColorPickerState] = useState({
		open: false,
		index: 0,
		color: '#000000',
	})
	const isAggregated = aggregation !== 'raw'

	const nodeRef = useRef<HTMLDivElement>(null)
	const chartRef = useRef<ChartJS<
		'line',
		MeasurementChartPoint[],
		unknown
	> | null>(null)
	const isZoomingRef = useRef(false)
	const lastHoveredPointRef = useRef<number | null>(hoveredPoint)
	const previousChartInputRef = useRef({ sensors, isAggregated })

	useEffect(() => {
		lastHoveredPointRef.current = hoveredPoint
	}, [hoveredPoint])

	const setHoveredPointIfChanged = useCallback(
		(point: number | null) => {
			if (lastHoveredPointRef.current === point) return

			lastHoveredPointRef.current = point
			setHoveredPoint(point)
		},
		[setHoveredPoint],
	)
	const handleChartMouseLeave = useCallback(() => {
		isZoomingRef.current = false
		setHoveredPointIfChanged(null)
	}, [setHoveredPointIfChanged])

	const dateTimeFormatter = useMemo(() => {
		return new Intl.DateTimeFormat(i18n.language, {
			dateStyle: 'medium',
			timeStyle: 'medium',
		})
	}, [i18n.language])

	// get theme from tailwind
	const [theme] = 'light' //useTheme();

	const [chartData, setChartData] = useState(() =>
		createMeasurementChartData(sensors, isAggregated),
	)

	useEffect(() => {
		if (
			previousChartInputRef.current.sensors === sensors &&
			previousChartInputRef.current.isAggregated === isAggregated
		) {
			return
		}

		previousChartInputRef.current = { sensors, isAggregated }

		const newChartData = createMeasurementChartData(sensors, isAggregated)

		setChartData({
			...newChartData,
			datasets: newChartData.datasets.map((dataset) => ({
				...dataset,
				showLine: connectDots,
			})),
		})
	}, [sensors, isAggregated, connectDots])

	const options: ChartOptions<'line'> = useMemo(() => {
		return {
			maintainAspectRatio: false,
			responsive: true,
			animation: false,
			normalized: sensors.length === 1 && !isAggregated,
			spanGaps: false,
			interaction: {
				mode: 'index',
				intersect: false,
			},
			parsing: false,
			scales: {
				x: {
					type: 'time',
					time: {
						unit: datesHave48HourRange(
							startDate ? new Date(startDate) : new Date(),
							endDate ? new Date(endDate) : new Date(),
						)
							? 'hour'
							: 'day',
						displayFormats: {
							day: 'dd.MM.yyyy',
							millisecond: 'mm:ss',
							second: 'mm:ss',
							minute: 'HH:mm',
							hour: 'HH:mm',
						},
						tooltipFormat: 'dd.MM.yyyy HH:mm',
					},
					// adapters: {
					//   date: {
					//     locale: data.locale === "de" ? de : enGB,
					//   },
					// },
					ticks: {
						major: {
							enabled: true,
						},
						font: (context) => {
							if (context.tick && context.tick.major) {
								return {
									weight: 'bold',
								}
							}
						},
						maxTicksLimit: 8,
					},
					grid: {
						color:
							theme === 'dark' ? 'rgba(255, 255, 255)' : 'rgba(0, 0, 0, 0.1)',
						borderColor:
							theme === 'dark' ? 'rgba(255, 255, 255)' : 'rgba(0, 0, 0, 0.1)',
					},
				},
				y: {
					title: {
						display: true,
						text: sensors[0].title + ' in ' + sensors[0].unit,
					},
					// type: 'linear',
					display: true,
					position: 'left',
					grid: {
						color:
							theme === 'dark' ? 'rgba(255, 255, 255)' : 'rgba(0, 0, 0, 0.1)',
						borderColor:
							theme === 'dark' ? 'rgba(255, 255, 255)' : 'rgba(0, 0, 0, 0.1)',
					},
				},
				y1: {
					title: {
						display: true,
						text: sensors[1] ? sensors[1].title + ' in ' + sensors[1].unit : '', //data.sensors[1].unit
					},
					// type: 'linear',
					display: 'auto',
					position: 'right',
					grid: {
						drawOnChartArea: false,
					},
				},
			},
			plugins: {
				decimation: {
					enabled: true,
					algorithm: 'min-max',
				},
				tooltip: {
					enabled: true,
					mode: 'index',
					intersect: false,
					callbacks: {
						title: (tooltipItems: any[]) => {
							const firstItem = tooltipItems[0]

							if (!firstItem) return ''

							const { timestamp } = firstItem.raw as MeasurementChartPoint

							return dateTimeFormatter.format(new Date(timestamp))
						},

						label: (context: any) => {
							const point = context.raw as MeasurementChartPoint

							if (!isZoomingRef.current && point.locationId !== null) {
								setHoveredPointIfChanged(point.locationId)
							}

							return `${context.dataset.label}: ${context.raw.y}`
						},
					},
				},
				zoom: {
					zoom: {
						wheel: {
							enabled: true,
						},
						drag: {
							enabled: true,
						},
						mode: 'x',
						onZoomStart: () => {
							isZoomingRef.current = true
							return true
						},
						onZoomComplete: ({ chart }) => {
							isZoomingRef.current = false
							const xScale = chart.scales['x']
							const xMin = xScale.min
							const xMax = xScale.max

							setCurrentZoom({ xMin, xMax })
						},
					},
				},
				legend: {
					display: true,
					position: 'bottom',
					onHover: (e, legendItem, legend) => {
						const canvas = legend.chart.canvas // Access the chart from the legend context

						// Only change the cursor and add the tooltip when hovering over the color box
						if (legendItem.fillStyle) {
							canvas.style.cursor = 'pointer'
							canvas.title = 'Click to change color' // Tooltip on legend color box
						}
					},
					onLeave: (e, legendItem, legend) => {
						const canvas = legend.chart.canvas
						canvas.style.cursor = 'default'
						canvas.title = '' // Remove tooltip on leave
					},

					onClick: (e, legendItem, _legend) => {
						const index = legendItem.datasetIndex ?? 0
						setColorPickerState({
							open: !colorPickerState.open,
							index,
							color: chartData.datasets[index].borderColor as string,
						})
					},
					labels: {
						usePointStyle: true,
					},
				},
			},
		}
	}, [
		startDate,
		endDate,
		theme,
		sensors,
		isAggregated,
		chartData.datasets,
		setHoveredPointIfChanged,
		colorPickerState.open,
		dateTimeFormatter,
	])

	function handleColorChange(newColor: string) {
		setChartData((prevData) => ({
			...prevData,
			datasets: prevData.datasets.map((dataset, index) =>
				index === colorPickerState.index
					? {
							...dataset,
							borderColor: newColor,
							backgroundColor: newColor,
						}
					: dataset,
			),
		}))
	}

	function handleConnectDotsClick() {
		const nextConnectDots = !connectDots

		setConnectDots(nextConnectDots)

		setChartData((prevData) => ({
			...prevData,
			datasets: prevData.datasets.map((dataset) => ({
				...dataset,
				showLine: nextConnectDots,
			})),
		}))
	}

	function handlePngDownloadClick() {
		if (chartRef.current) {
			const imageString = chartRef.current.canvas.toDataURL('image/png', 1.0)

			// Create a temporary link element
			const link = document.createElement('a')
			link.href = imageString // Set the href to the data URL
			link.download = 'chart.png' // Specify the download file name

			// Append the link to the document body
			document.body.appendChild(link)

			// Programmatically click the link to trigger the download
			link.click()

			// Clean up and remove the link from the document
			document.body.removeChild(link)
		}
	}

	function handleCsvDownloadClick() {
		const labels = chartData.datasets[0].data.map((point: any) => point.x)

		let csvContent = 'timestamp,deviceId,sensorId,value,unit,phenomena\n'

		// Loop through each timestamp and sensor data
		labels.forEach((timestamp: number, index: number) => {
			sensors.forEach((sensor: any) => {
				const dataset = chartData.datasets.find(
					(ds: { label: string | any[] }) => ds.label.includes(sensor.title),
				)
				if (dataset) {
					const value = (dataset.data as any)[index]?.y ?? ''

					csvContent += `${new Date(timestamp).toISOString()},`
					csvContent += `${sensor.deviceId},`
					csvContent += `${sensor.id},`
					csvContent += `${value},`
					csvContent += `${sensor.unit},`
					csvContent += `${sensor.title}\n`
				}
			})
		})

		// Create a Blob from the CSV content
		const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })

		// Create a temporary link element
		const link = document.createElement('a')
		const url = URL.createObjectURL(blob) // Create a URL for the Blob

		link.href = url // Set the href to the Blob URL
		link.download = 'chart_data.csv' // Specify the download file name

		// Append the link to the document body
		document.body.appendChild(link)

		// Programmatically click the link to trigger the download
		link.click()

		// Clean up and remove the link from the document
		document.body.removeChild(link)
		URL.revokeObjectURL(url) // Clean up the URL object
	}

	function handleResetZoomClick() {
		if (chartRef.current) {
			chartRef.current.resetZoom() // Use the resetZoom function from the zoom plugin
			isZoomingRef.current = false
			setCurrentZoom(null) // Reset the zoom state
		}
	}

	function handleDrag(_e: any, data: DraggableData) {
		setOffsetPositionX(data.x)
		setOffsetPositionY(data.y)
	}

	return (
		<>
			<Draggable
				nodeRef={nodeRef as RefObject<HTMLDivElement>}
				bounds="#osem"
				handle="#graphTop"
				defaultPosition={{ x: offsetPositionX, y: offsetPositionY }}
				onDrag={handleDrag}
				disabled={!isBrowser && !isTablet}
			>
				<div
					ref={nodeRef}
					className="absolute top-14 right-4 bottom-6 left-4 z-40 flex flex-col gap-2 rounded-xl bg-white px-4 pt-2 text-sm font-medium text-zinc-800 shadow-lg ring-1 shadow-zinc-800/5 ring-zinc-900/5 md:top-auto md:right-4 md:bottom-7.5 md:left-auto md:h-[35%] md:max-h-[35%] md:w-[60vw] dark:bg-zinc-800 dark:text-zinc-200 dark:opacity-95 dark:ring-white dark:backdrop-blur-xs"
				>
					{navigation.state === 'loading' && (
						<div className="absolute inset-0 z-50 flex items-center justify-center bg-gray-100/30 backdrop-blur-[1.5px]">
							<Spinner />
						</div>
					)}
					<div
						className="flex cursor-move items-start justify-between gap-2 px-2 pt-2"
						id="graphTop"
					>
						<div className="flex grow flex-wrap items-center gap-2">
							<DateRangeFilter />
							<AggregationFilter />
						</div>
						<div className="flex h-full items-start justify-end gap-4 py-2">
							<Tooltip>
								<TooltipTrigger asChild>
									<button
										type="button"
										onClick={handleConnectDotsClick}
										aria-pressed={connectDots}
										className={`cursor-pointer rounded p-1 ${
											connectDots ? 'bg-zinc-200 dark:bg-zinc-700' : ''
										}`}
									>
										<ChartLine />
									</button>
								</TooltipTrigger>

								<TooltipContent>
									<p>
										{connectDots ? t('disconnect_points') : t('connect_points')}
									</p>
								</TooltipContent>
							</Tooltip>
							{currentZoom !== null &&
								currentZoom.xMax !== 0 &&
								currentZoom.xMin !== 0 && (
									<Tooltip>
										<TooltipTrigger>
											<RefreshCcw
												onClick={handleResetZoomClick}
												className="cursor-pointer"
											/>
										</TooltipTrigger>
										<TooltipContent>
											<p>{t('reset_zoom')}</p>
										</TooltipContent>
									</Tooltip>
								)}

							<DropdownMenu>
								<DropdownMenuTrigger>
									<Download />
								</DropdownMenuTrigger>
								<DropdownMenuContent>
									<DropdownMenuItem onClick={handlePngDownloadClick}>
										PNG
									</DropdownMenuItem>
									{sensors.length < 2 && (
										<DropdownMenuItem onClick={handleCsvDownloadClick}>
											CSV
										</DropdownMenuItem>
									)}
								</DropdownMenuContent>
							</DropdownMenu>
							<X
								className="cursor-pointer"
								onClick={() => {
									searchParams.delete('date_to')
									searchParams.delete('date_from')
									searchParams.delete('aggregation')
									setSearchParams(searchParams)
									void navigate({
										pathname: `/explore/${sensors[0].deviceId}`,
										search: searchParams.toString(),
									})
								}}
							/>
						</div>
					</div>
					<div className="flex min-h-0 w-full flex-1 items-center justify-center">
						{(sensors[0].data.length === 0 && sensors[1] === undefined) ||
						(sensors[0].data.length === 0 && sensors[1].data.length === 0) ? (
							<div>{t('no_data_in_range')}</div>
						) : (
							<ClientOnly fallback={<Spinner />}>
								{() => (
									<GraphWithZoom
										chartData={chartData}
										options={options}
										chartRef={chartRef} // Pass chartRef as a prop
										onMouseLeave={handleChartMouseLeave}
									/>
								)}
							</ClientOnly>
						)}
					</div>
					{/* Overlay when the color picker is open */}
					{colorPickerState.open && (
						<>
							<div className="absolute inset-0 z-50 bg-black opacity-50"></div>{' '}
							{/* This is the overlay */}
							<div
								className="absolute z-50 rounded bg-white dark:bg-zinc-800"
								style={{
									left: '50%',
									top: '50%',
									transform: 'translate(-50%, -50%)', // Centers the color picker
								}}
							>
								<ColorPicker
									handleColorChange={handleColorChange}
									colorPickerState={colorPickerState}
									setColorPickerState={setColorPickerState}
								/>
							</div>
						</>
					)}
				</div>
			</Draggable>
		</>
	)
}

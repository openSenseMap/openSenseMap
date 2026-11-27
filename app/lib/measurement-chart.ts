import { type ChartData, type ChartDataset, type Point } from 'chart.js'

export interface MeasurementChartPoint extends Point {
	x: number
	timestamp: number
	y: number
	locationId: number | null
}

interface MeasurementChartMeasurement {
	time: Date | string | number
	value: unknown
	min_value?: unknown
	max_value?: unknown
	locationId?: number | null
}

interface NormalizedMeasurement {
	timestamp: number
	value: number
	minValue: number | null
	maxValue: number | null
	locationId: number | null
}

interface NormalizedAggregateMeasurement extends NormalizedMeasurement {
	minValue: number
	maxValue: number
}

export interface MeasurementChartSensor {
	title: string
	device_name?: string | null
	data: MeasurementChartMeasurement[]
	color: string
}

export type MeasurementChartDataset = ChartDataset<
	'line',
	MeasurementChartPoint[]
> & {
	label: string
	data: MeasurementChartPoint[]
	pointRadius: number
	showLine: boolean
	borderColor: string
	backgroundColor: string
	yAxisID: string
	fill: boolean | number
}

export interface MeasurementChartData extends ChartData<
	'line',
	MeasurementChartPoint[]
> {
	datasets: MeasurementChartDataset[]
}

function toTimestamp(time: Date | string | number) {
	const timestamp =
		time instanceof Date ? time.getTime() : new Date(time).getTime()

	return Number.isFinite(timestamp) ? timestamp : null
}

function toNumericValue(value: unknown) {
	if (value === null || value === undefined || value === '') return null

	const numericValue = Number(value)

	return Number.isFinite(numericValue) ? numericValue : null
}

// Filters once so that value/min/max series stay index-aligned.
function normalizeMeasurements(
	measurements: MeasurementChartMeasurement[],
): NormalizedMeasurement[] {
	return measurements
		.map((measurement): NormalizedMeasurement | null => {
			const timestamp = toTimestamp(measurement.time)
			const value = toNumericValue(measurement.value)

			if (timestamp === null || value === null) return null

			return {
				timestamp,
				value,
				minValue: toNumericValue(measurement.min_value),
				maxValue: toNumericValue(measurement.max_value),
				locationId: measurement.locationId ?? null,
			}
		})
		.filter((row): row is NormalizedMeasurement => row !== null)
		.sort((left, right) => left.timestamp - right.timestamp)
}

function hasAggregateBounds(
	measurement: NormalizedMeasurement,
): measurement is NormalizedAggregateMeasurement {
	return measurement.minValue !== null && measurement.maxValue !== null
}

function createPoints<T extends NormalizedMeasurement>(
	measurements: T[],
	getValue: (measurement: T) => number,
	includeLocation: boolean,
): MeasurementChartPoint[] {
	return measurements.map((measurement) => ({
		x: measurement.timestamp,
		timestamp: measurement.timestamp,
		y: getValue(measurement),
		locationId: includeLocation ? measurement.locationId : null,
	}))
}

export function createMeasurementChartData(
	sensors: MeasurementChartSensor[],
	isAggregated: boolean,
): MeasurementChartData {
	const includeDeviceName =
		sensors.length === 2 && sensors[0].device_name !== sensors[1].device_name

	return {
		datasets: sensors.flatMap((sensor, index) => {
			const label = includeDeviceName
				? `${sensor.title} (${sensor.device_name})`
				: sensor.title
			const normalizedMeasurements = normalizeMeasurements(sensor.data)
			const createBaseDataset = (
				measurements: NormalizedMeasurement[],
			): MeasurementChartDataset => ({
				label,
				data: createPoints(measurements, ({ value }) => value, true),
				pointRadius: 1,
				showLine: false,
				borderColor: sensor.color,
				backgroundColor: sensor.color,
				yAxisID: index === 0 ? 'y' : 'y1',
				fill: false,
			})

			if (!isAggregated || sensors.length !== 1) {
				return [createBaseDataset(normalizedMeasurements)]
			}

			const aggregateMeasurements =
				normalizedMeasurements.filter(hasAggregateBounds)
			const baseDataset = createBaseDataset(aggregateMeasurements)

			const minDataset: MeasurementChartDataset = {
				...baseDataset,
				label: `${label} (Min)`,
				data: createPoints(
					aggregateMeasurements,
					({ minValue }) => minValue,
					false,
				),
				borderColor: sensor.color + '33',
				backgroundColor: sensor.color + '33',
				fill: 1,
			}
			const maxDataset: MeasurementChartDataset = {
				...baseDataset,
				label: `${label} (Max)`,
				data: createPoints(
					aggregateMeasurements,
					({ maxValue }) => maxValue,
					false,
				),
				borderColor: sensor.color + '33',
				backgroundColor: sensor.color + '33',
				fill: 1,
			}

			return [maxDataset, baseDataset, minDataset]
		}),
	}
}

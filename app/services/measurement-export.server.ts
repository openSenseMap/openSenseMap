import {
	getSensorsForDevices,
	type SensorExportMetadata,
} from '~/db/models/sensor.server'
import {
	MEASUREMENT_EXPORT_AGGREGATIONS,
	streamMeasurementExportRows,
	type MeasurementExportAggregation,
	type MeasurementExportRow,
} from '~/db/models/measurement.stream.server'
import { escapeCSVValue } from '~/lib/csv'
import {
	getMeasurementTimeRangeFromSearchParams,
	MeasurementTimeRangeError,
} from '~/lib/measurement-time-range'

export type { MeasurementTimeRange } from '~/lib/measurement-time-range'

export const MAX_MEASUREMENT_EXPORT_DEVICES = 50
export const MEASUREMENT_EXPORT_RESOURCE_PATH =
	'/resources/measurements-download'

const MEASUREMENT_EXPORT_FORMATS = ['csv', 'json', 'txt'] as const

type MeasurementExportFormat = (typeof MEASUREMENT_EXPORT_FORMATS)[number]

type ParameterSource = {
	get(name: string): FormDataEntryValue | string | null
}

export type MeasurementExportFields = {
	title: boolean
	unit: boolean
	value: boolean
	timestamp: boolean
	coordinates: boolean
}

export type MeasurementExportOptions = {
	deviceIds: string[]
	format: MeasurementExportFormat
	aggregation: MeasurementExportAggregation
	fields: MeasurementExportFields
	phenomena: string[]
	fromDate?: Date
	toDate?: Date
}

export type MeasurementExportSensor = SensorExportMetadata

export class MeasurementExportValidationError extends Error {
	readonly status: number
	readonly archiveLink?: string

	constructor(message: string, status = 400, archiveLink?: string) {
		super(message)
		this.name = 'MeasurementExportValidationError'
		this.status = status
		this.archiveLink = archiveLink
	}
}

const timestampFormatter = new Intl.DateTimeFormat('en-US', {
	dateStyle: 'full',
	timeStyle: 'short',
})

function getString(source: ParameterSource, name: string) {
	const value = source.get(name)
	return typeof value === 'string' ? value : null
}

function parseCsv(value: string | null): string[] {
	if (!value) return []

	return value
		.split(',')
		.map((item) => item.trim())
		.filter(Boolean)
}

function unique(values: string[]) {
	return Array.from(new Set(values))
}

export function parseMeasurementExportParams(
	params: ParameterSource,
): MeasurementExportOptions {
	const deviceIds = unique(parseCsv(getString(params, 'devices')))
	if (deviceIds.length === 0) {
		throw new MeasurementExportValidationError('No devices selected.')
	}
	if (deviceIds.length >= MAX_MEASUREMENT_EXPORT_DEVICES) {
		throw new MeasurementExportValidationError(
			'Too many devices selected.',
			400,
			'https://archive.opensensemap.org/',
		)
	}

	const formatValue = getString(params, 'format') ?? 'csv'
	if (
		!MEASUREMENT_EXPORT_FORMATS.includes(formatValue as MeasurementExportFormat)
	) {
		throw new MeasurementExportValidationError('Unsupported export format.')
	}
	const format = formatValue as MeasurementExportFormat

	const aggregationValue = getString(params, 'aggregate') ?? 'raw'
	if (
		!MEASUREMENT_EXPORT_AGGREGATIONS.includes(
			aggregationValue as MeasurementExportAggregation,
		)
	) {
		throw new MeasurementExportValidationError('Unsupported aggregation.')
	}
	const aggregation = aggregationValue as MeasurementExportAggregation

	let timeRange
	try {
		timeRange = getMeasurementTimeRangeFromSearchParams(params, {
			strict: true,
		})
	} catch (error) {
		if (error instanceof MeasurementTimeRangeError) {
			throw new MeasurementExportValidationError(error.message)
		}
		throw error
	}

	return {
		deviceIds,
		format,
		aggregation,
		fields: {
			title: getString(params, 'title') === 'on',
			unit: getString(params, 'unit') === 'on',
			value: getString(params, 'value') === 'on',
			timestamp: getString(params, 'timestamp') === 'on',
			coordinates:
				aggregation === 'raw' && getString(params, 'coordinates') === 'on',
		},
		phenomena: unique(
			parseCsv(getString(params, 'phenomenon')).map((value) =>
				value.toLowerCase(),
			),
		),
		fromDate: timeRange?.from,
		toDate: timeRange?.to,
	}
}

function serializeMeasurementExportParams(options: MeasurementExportOptions) {
	const params = new URLSearchParams({
		devices: options.deviceIds.join(','),
		format: options.format,
		aggregate: options.aggregation,
	})

	for (const [field, included] of Object.entries(options.fields)) {
		if (included) params.set(field, 'on')
	}

	if (options.phenomena.length > 0) {
		params.set('phenomenon', options.phenomena.join(','))
	}
	if (options.fromDate && options.toDate) {
		params.set('fromDate', options.fromDate.toISOString())
		params.set('toDate', options.toDate.toISOString())
	}

	return params
}

function getFileMetadata(format: MeasurementExportFormat) {
	if (format === 'csv') {
		return {
			fileName: 'measurements.csv',
			contentType: 'text/csv; charset=utf-8',
		}
	}
	if (format === 'json') {
		return {
			fileName: 'measurements.json',
			contentType: 'application/json; charset=utf-8',
		}
	}
	return {
		fileName: 'measurements.txt',
		contentType: 'text/plain; charset=utf-8',
	}
}

export function createMeasurementExportLink(
	request: Request,
	params: ParameterSource,
) {
	const options = parseMeasurementExportParams(params)
	const query = serializeMeasurementExportParams(options)
	const { fileName } = getFileMetadata(options.format)
	const resourceUrl = new URL(MEASUREMENT_EXPORT_RESOURCE_PATH, request.url)
	resourceUrl.search = query.toString()

	return {
		href: `${resourceUrl.pathname}${resourceUrl.search}`,
		download: fileName,
	}
}

function filterAndOrderSensors(
	sensors: MeasurementExportSensor[],
	options: MeasurementExportOptions,
) {
	const deviceOrder = new Map(
		options.deviceIds.map((deviceId, index) => [deviceId, index]),
	)
	const filtered =
		options.phenomena.length === 0
			? sensors
			: sensors.filter((sensor) =>
					options.phenomena.includes(sensor.title.toLowerCase()),
				)

	return [...filtered].sort((left, right) => {
		const byDevice =
			(deviceOrder.get(left.deviceId) ?? Number.MAX_SAFE_INTEGER) -
			(deviceOrder.get(right.deviceId) ?? Number.MAX_SAFE_INTEGER)
		if (byDevice !== 0) return byDevice

		const byOrder = (left.order ?? 0) - (right.order ?? 0)
		if (byOrder !== 0) return byOrder

		const byCreatedAt = left.createdAt.getTime() - right.createdAt.getTime()
		if (byCreatedAt !== 0) return byCreatedAt

		return left.id.localeCompare(right.id)
	})
}

function createExportItem(
	row: MeasurementExportRow,
	sensor: MeasurementExportSensor,
	fields: MeasurementExportFields,
) {
	const item: Record<string, unknown> = { sensorId: row.sensor_id }
	if (fields.title) item.title = sensor.title
	if (fields.value) item.value = row.value
	if (fields.unit) item.unit = sensor.unit
	if (fields.timestamp) {
		item.timestamp = timestampFormatter.format(new Date(row.time))
	}
	if (fields.coordinates) {
		item.latitude = row.latitude
		item.longitude = row.longitude
	}
	return item
}

function getCsvColumns(fields: MeasurementExportFields) {
	return [
		{ header: 'SensorId', key: 'sensorId' },
		fields.title ? { header: 'Title', key: 'title' } : null,
		fields.value ? { header: 'Value', key: 'value' } : null,
		fields.unit ? { header: 'Unit', key: 'unit' } : null,
		fields.timestamp ? { header: 'Timestamp', key: 'timestamp' } : null,
		fields.coordinates ? { header: 'Latitude', key: 'latitude' } : null,
		fields.coordinates ? { header: 'Longitude', key: 'longitude' } : null,
	].filter(
		(column): column is { header: string; key: string } => column !== null,
	)
}

export async function* generateMeasurementExportChunks(
	rows: AsyncIterable<MeasurementExportRow[]>,
	sensors: MeasurementExportSensor[],
	options: MeasurementExportOptions,
): AsyncGenerator<string> {
	const sensorMap = new Map(sensors.map((sensor) => [sensor.id, sensor]))

	if (options.format === 'csv') {
		const columns = getCsvColumns(options.fields)
		yield `\uFEFF${columns.map((column) => column.header).join(',')}`

		for await (const batch of rows) {
			const lines = batch.flatMap((row) => {
				const sensor = sensorMap.get(row.sensor_id)
				if (!sensor) return []
				const item = createExportItem(row, sensor, options.fields)
				return [
					columns
						.map((column) => escapeCSVValue(item[column.key], ','))
						.join(','),
				]
			})

			if (lines.length > 0) yield `\n${lines.join('\n')}`
		}
		return
	}

	if (options.format === 'json') {
		yield '['
		let currentSensorId: string | undefined
		let hasGroups = false
		let hasRowsInGroup = false

		for await (const batch of rows) {
			let chunk = ''
			for (const row of batch) {
				const sensor = sensorMap.get(row.sensor_id)
				if (!sensor) continue

				if (currentSensorId !== row.sensor_id) {
					if (currentSensorId !== undefined) chunk += ']'
					if (hasGroups) chunk += ','
					chunk += '['
					currentSensorId = row.sensor_id
					hasRowsInGroup = false
					hasGroups = true
				}

				if (hasRowsInGroup) chunk += ','
				chunk += JSON.stringify(createExportItem(row, sensor, options.fields))
				hasRowsInGroup = true
			}

			if (chunk) yield chunk
		}

		yield currentSensorId === undefined ? ']' : ']]'
		return
	}

	let hasRows = false
	for await (const batch of rows) {
		const records = batch.flatMap((row) => {
			const sensor = sensorMap.get(row.sensor_id)
			if (!sensor) return []
			const item = createExportItem(row, sensor, options.fields)
			const lines = [`SensorId: ${String(item.sensorId)}`]
			if (options.fields.title) lines.push(`Title: ${String(item.title ?? '')}`)
			if (options.fields.value) lines.push(`Value: ${String(item.value ?? '')}`)
			if (options.fields.unit) lines.push(`Unit: ${String(item.unit ?? '')}`)
			if (options.fields.timestamp) {
				lines.push(`Timestamp: ${String(item.timestamp ?? '')}`)
			}
			if (options.fields.coordinates) {
				lines.push(`Latitude: ${String(item.latitude ?? '')}`)
				lines.push(`Longitude: ${String(item.longitude ?? '')}`)
			}
			return [`${lines.join('\n')}\n`]
		})

		if (records.length > 0) {
			yield `${hasRows ? '\n' : ''}${records.join('\n')}`
			hasRows = true
		}
	}
}

/**
 * Convert an async chunk source to a byte stream without eagerly draining it.
 * A zero high-water mark means the source advances only when the response
 * consumer asks for another chunk. Cancellation closes the database cursor via
 * the async generator's return method.
 */
export function createReadableStreamFromAsyncIterable(
	iterable: AsyncIterable<string>,
) {
	const iterator = iterable[Symbol.asyncIterator]()
	const encoder = new TextEncoder()
	let finished = false

	return new ReadableStream<Uint8Array>(
		{
			async pull(controller) {
				try {
					const next = await iterator.next()
					if (next.done) {
						finished = true
						controller.close()
						return
					}
					controller.enqueue(encoder.encode(next.value))
				} catch (error) {
					finished = true
					await iterator.return?.()
					controller.error(error)
				}
			},
			async cancel() {
				if (!finished) {
					finished = true
					await iterator.return?.()
				}
			},
		},
		{ highWaterMark: 0 },
	)
}

export async function createMeasurementExportResponse(request: Request) {
	const url = new URL(request.url)
	const options = parseMeasurementExportParams(url.searchParams)
	const loadedSensors = await getSensorsForDevices(options.deviceIds)
	const sensors = filterAndOrderSensors(loadedSensors, options)
	const rows = streamMeasurementExportRows({
		sensorIds: sensors.map((sensor) => sensor.id),
		aggregation: options.aggregation,
		fromDate: options.fromDate,
		toDate: options.toDate,
		includeCoordinates: options.fields.coordinates,
	})
	const chunks = generateMeasurementExportChunks(rows, sensors, options)
	const { fileName, contentType } = getFileMetadata(options.format)

	return new Response(createReadableStreamFromAsyncIterable(chunks), {
		headers: {
			'Cache-Control': 'private, no-store',
			'Content-Disposition': `attachment; filename="${fileName}"`,
			'Content-Type': contentType,
			'X-Content-Type-Options': 'nosniff',
		},
	})
}

export function measurementExportErrorResponse(error: unknown) {
	if (error instanceof MeasurementExportValidationError) {
		return Response.json(
			{
				error: error.message,
				...(error.archiveLink ? { link: error.archiveLink } : {}),
			},
			{ status: error.status },
		)
	}

	console.error('Measurement export failed:', error)
	return Response.json(
		{ error: 'Unable to export measurements.' },
		{ status: 500 },
	)
}

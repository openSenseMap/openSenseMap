import { type BoxesDataColumn } from '../lib/api-schemas/boxes-data-query-schema'
import { validLngLat } from '../lib/location'
import { assertDeviceIsWritable } from './device-service.server'
import {
	deviceExists,
	type DeviceWithoutSensors,
	getDeviceWithoutSensors,
	getDeviceForMeasurementWrite,
	getDeviceForSingleMeasurementWrite,
} from '~/db/models/device.server'
import { saveMeasurements } from '~/db/models/measurement.server'
import {
	getSensorsWithLastMeasurement,
	getSensorWithLastMeasurement,
} from '~/db/models/sensor.server'
import { type SensorWithLatestMeasurement } from '~/db/schema'
import {
	decodeMeasurements,
	hasDecoder,
} from '~/services/decoding-service.server'
import { type MeasurementTiming } from '~/lib/measurement-timing.server'

export type DeviceWithSensors = DeviceWithoutSensors & {
	sensors: SensorWithLatestMeasurement[]
}

export class MeasurementServiceError extends Error {
	constructor(
		name: string,
		message: string,
		public readonly statusCode: number,
	) {
		super(message)
		this.name = name
	}
}

export async function getLatestMeasurementsForSensor(
	boxId: string,
	sensorId: string,
	count?: number,
): Promise<SensorWithLatestMeasurement | null> {
	if (!(await deviceExists({ id: boxId }))) return null

	// single sensor, no need for having info about device
	return await getSensorWithLastMeasurement(boxId, sensorId, count)
}

/**
 *
 * @param boxId
 * @param sensorId
 * @param count
 */
export async function getLatestMeasurements(
	boxId: string,
	count?: number,
): Promise<DeviceWithSensors | null> {
	const device: DeviceWithoutSensors = await getDeviceWithoutSensors({
		id: boxId,
	})
	if (!device) return null

	const sensorsWithMeasurements = await getSensorsWithLastMeasurement(
		device.id,
		count,
	)

	const deviceWithSensors: DeviceWithSensors = device as DeviceWithSensors
	deviceWithSensors.sensors = sensorsWithMeasurements
	return deviceWithSensors
}

interface PostMeasurementsOptions {
	contentType: string
	luftdaten: boolean
	hackair: boolean
	authorization?: string | null
	isTrustedService?: boolean
}

interface SingleMeasurementBody {
	value: number
	createdAt?: string
	location?:
		| [number, number, number?]
		| { lat: number; lng: number; height?: number }
}

interface LocationData {
	lng: number
	lat: number
	height?: number
}

const normalizeLocation = (
	location: SingleMeasurementBody['location'],
): LocationData | null => {
	if (!location) return null

	if (Array.isArray(location)) {
		if (location.length < 2) return null

		return {
			lng: normalizeLongitude(location[0]),
			lat: location[1],
			height: location[2],
		}
	}

	if (typeof location === 'object' && 'lat' in location && 'lng' in location) {
		return {
			lng: normalizeLongitude(location.lng),
			lat: location.lat,
			height: location.height,
		}
	}

	return null
}

/**
 * Longitude at +180 are mathematically equal to longitudes at -180
 * and are therefore normalized to -180 for consistency.
 * @param lng The longitude value to normalize
 * @returns A normalized longitude in the value range [-180, 180)
 */
const normalizeLongitude = (lng: number): number => (lng === 180 ? -180 : lng)

export const postNewMeasurements = async (
	deviceId: string,
	body: any,
	options: PostMeasurementsOptions,
): Promise<void> => {
	const { luftdaten, hackair, authorization, isTrustedService } = options
	let { contentType } = options

	if (hackair) {
		contentType = 'hackair'
	} else if (luftdaten) {
		contentType = 'luftdaten'
	}

	if (!hasDecoder(contentType)) {
		throw new MeasurementServiceError(
			'UnsupportedMediaTypeError',
			'Unsupported content-type.',
			415,
		)
	}

	const device = await getDeviceForMeasurementWrite({ id: deviceId })
	if (!device) {
		throw new MeasurementServiceError('NotFoundError', 'Device not found', 404)
	}

	assertDeviceIsWritable(device)

	if ((device.useAuth || hackair) && device.apiKey && !isTrustedService) {
		if (device.apiKey !== authorization) {
			throw new MeasurementServiceError(
				'UnauthorizedError',
				'Device access token not valid!',
				401,
			)
		}
	}

	const measurements = await decodeMeasurements(body, {
		contentType,
		sensors: device.sensors,
	})

	if (measurements.length === 0) {
		throw new MeasurementServiceError(
			'UnprocessableEntityError',
			'Cannot save empty or invalid measurements.',
			422,
		)
	}

	if (measurements.length > 2500) {
		throw new MeasurementServiceError(
			'UnprocessableEntityError',
			'Too many measurements. Please submit at most 2500 measurements at once.',
			422,
		)
	}

	for (const m of measurements) {
		if (typeof m.sensor_id !== 'string' || m.sensor_id.trim() === '') {
			throw new MeasurementServiceError(
				'UnprocessableEntityError',
				'Missing sensor id',
				422,
			)
		}
		if (!Number.isFinite(m.value)) {
			throw new MeasurementServiceError(
				'UnprocessableEntityError',
				'Invalid measurement value',
				422,
			)
		}
		if (!Number.isFinite(new Date(m.createdAt).getTime())) {
			throw new MeasurementServiceError(
				'UnprocessableEntityError',
				'Invalid measurement timestamp',
				422,
			)
		}

		const locationData: LocationData | null = m.location ?? null
		if (
			locationData &&
			(!validLngLat(locationData.lng, locationData.lat) ||
				(locationData.height !== undefined &&
					!Number.isFinite(locationData.height)))
		) {
			throw new MeasurementServiceError(
				'UnprocessableEntityError',
				'Invalid location coordinates',
				422,
			)
		}
	}

	await saveMeasurements(device, measurements)
}

export const postSingleMeasurement = async (
	deviceId: string,
	sensorId: string,
	body: SingleMeasurementBody,
	authorization?: string | null,
	isTrustedService?: boolean,
	timing?: MeasurementTiming | null,
): Promise<void> => {
	try {
		if (typeof body.value !== 'number' || isNaN(body.value)) {
			const error = new Error('Invalid measurement value')
			error.name = 'UnprocessableEntityError'
			throw error
		}
		timing?.mark('validateBody')

		const device = await getDeviceForSingleMeasurementWrite({
			id: deviceId,
			sensorId,
		})
		timing?.mark('deviceLookup', {
			deviceFound: Boolean(device),
			sensorCount: device?.sensors.length ?? 0,
		})

		if (!device) {
			const error = new Error('Device not found')
			error.name = 'NotFoundError'
			throw error
		}

		assertDeviceIsWritable(device)

		if (device.sensors.length === 0) {
			const error = new Error('Sensor not found on device')
			error.name = 'NotFoundError'
			throw error
		}
		timing?.mark('validateDeviceAndSensor')

		if (device.useAuth && !isTrustedService) {
			if (device.apiKey !== authorization) {
				const error = new Error('Device access token not valid!')
				error.name = 'UnauthorizedError'
				throw error
			}
		}
		timing?.mark('authorizeDevice', {
			deviceUsesAuth: Boolean(device.useAuth),
			isTrustedService: Boolean(isTrustedService),
		})

		let timestamp: Date | undefined
		if (body.createdAt) {
			timestamp = new Date(body.createdAt)

			if (isNaN(timestamp.getTime())) {
				const error = new Error('Invalid timestamp format')
				error.name = 'UnprocessableEntityError'
				throw error
			}
		}
		timing?.mark('parseTimestamp')

		let locationData: LocationData | null = null
		if (body.location) {
			locationData = normalizeLocation(body.location)

			if (locationData && !validLngLat(locationData.lng, locationData.lat)) {
				const error = new Error('Invalid location coordinates')
				error.name = 'UnprocessableEntityError'
				throw error
			}
		}
		timing?.mark('validateLocation', {
			hasLocation: Boolean(locationData),
		})

		const measurements = [
			{
				sensor_id: sensorId,
				value: body.value,
				createdAt: timestamp,
				location: locationData,
			},
		]
		timing?.mark('buildMeasurements')

		await saveMeasurements(device, measurements, timing)
		timing?.mark('saveMeasurements')
	} catch (error) {
		if (
			error instanceof Error &&
			[
				'UnauthorizedError',
				'NotFoundError',
				'UnprocessableEntityError',
			].includes(error.name)
		) {
			throw error
		}

		console.error('Error in postSingleMeasurement:', error)
		throw error
	}
}

/**
 * Transform a measurement row into an object with requested columns.
 * - prefer measurement location if present
 * - otherwise fall back to sensor/device location (sensorsMap)
 */
export function transformMeasurement(
	m: {
		sensorId: string
		createdAt: Date | null
		value: number | null
		locationId: bigint | null
	},
	sensorsMap: Record<string, any>,
	locationsMap: Record<string, any>,
	columns: BoxesDataColumn[],
) {
	const sensor = sensorsMap[m.sensorId]
	const measurementLocation = m.locationId
		? locationsMap[m.locationId.toString()]
		: null

	const result: Record<string, any> = {}

	for (const col of columns) {
		switch (col) {
			case 'createdAt':
				result.createdAt = m.createdAt ? m.createdAt.toISOString() : null
				break
			case 'value':
				result.value = m.value === null ? null : m.value.toString()
				break
			case 'lat':
				result.lat = measurementLocation?.lat ?? sensor?.lat
				break
			case 'lon':
				result.lon = measurementLocation?.lon ?? sensor?.lon
				break
			case 'height':
				result.height = measurementLocation?.height ?? sensor?.height ?? null
				break
			case 'boxId':
				result.boxId = sensor?.boxId
				break
			case 'boxid':
				result.boxid = sensor?.boxId
				break
			case 'boxName':
				result.boxName = sensor?.boxName
				break
			case 'exposure':
				result.exposure = sensor?.exposure
				break
			case 'sensorId':
				result.sensorId = sensor?.sensorId
				break
			case 'phenomenon':
				result.phenomenon = sensor?.phenomenon
				break
			case 'unit':
				result.unit = sensor?.unit
				break
			case 'sensorType':
				result.sensorType = sensor?.sensorType
				break
			default:
				break
		}
	}

	return result
}

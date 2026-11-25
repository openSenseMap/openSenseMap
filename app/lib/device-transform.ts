import { type Device, type Sensor } from '~/db/schema'
import { type DeviceStatusType } from '~/lib/device-enums'
import { calculateHeightAboveSeaLevel } from '~/lib/elevation'
import { toIsoString } from '~/utils'

const ACTIVE_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000
const INACTIVE_THRESHOLD_MS = 30 * 24 * 60 * 60 * 1000

export type DeviceWithSensors = Omit<
	Device,
	'heightAboveGround' | 'terrainElevation' | 'terrainElevationDataset'
> & {
	heightAboveGround?: number | null
	terrainElevation?: number | null
	terrainElevationDataset?: string | null
	heightAboveSeaLevel?: number | null
	sensors: Sensor[]
}

export type TransformedDevice = {
	_id: string
	name: string
	description: string | null
	image: string | null
	website: string | null
	link: string | null
	grouptag: string[]
	exposure: string | null
	model: string | null
	latitude: number
	longitude: number
	heightAboveGround?: number | null
	heightAboveSeaLevel: number | null
	terrainElevation?: number | null
	terrainElevationDataset?: string | null
	/** Legacy alias for heightAboveSeaLevel. */
	height: number | null
	useAuth: boolean | null
	access_token: string | null
	public: boolean | null
	status: string | null
	createdAt: string
	updatedAt: string
	expiresAt: string | null
	userId: string
	sensorWikiModel?: string | null
	currentLocation: {
		type: 'Point'
		coordinates: number[]
		timestamp: string
	}
	lastMeasurementAt: string
	loc: Array<{
		type: 'Feature'
		geometry: {
			type: 'Point'
			coordinates: number[]
			timestamp: string
		}
	}>
	integrations: {
		mqtt: {
			enabled: boolean
		}
	}
	sensors: Array<{
		_id: string
		title: string | null
		unit: string | null
		sensorType: string | null
		lastMeasurement: {
			value: string
			createdAt: string
		} | null
	}>
}

/**
 * Transforms a device with sensors from database format to openSenseMap API format
 * @param box - Device object with sensors from database
 * @returns Transformed device in openSenseMap API format
 *
 * Note: Converts lastMeasurement.value from number to string to match API specification
 */
export function transformDeviceToApiFormat(
	box: DeviceWithSensors,
): TransformedDevice {
	const {
		id,
		tags,
		sensors,
		apiKey,
		heightAboveSeaLevel: selectedHeightAboveSeaLevel,
		...rest
	} = box
	const timestamp = box.updatedAt.toISOString()
	const heightAboveSeaLevel =
		selectedHeightAboveSeaLevel !== undefined
			? selectedHeightAboveSeaLevel
			: calculateHeightAboveSeaLevel(
					box.terrainElevation,
					box.heightAboveGround,
				)
	const coordinates =
		heightAboveSeaLevel === null
			? [box.longitude, box.latitude]
			: [box.longitude, box.latitude, heightAboveSeaLevel]

	return {
		_id: id,
		grouptag: tags || [],
		...rest,
		heightAboveSeaLevel,
		height: heightAboveSeaLevel,
		status: deriveDeviceStatus(sensors),
		createdAt: toIsoString(box.createdAt)!,
		updatedAt: toIsoString(box.updatedAt)!,
		expiresAt: toIsoString(box.expiresAt),
		currentLocation: {
			type: 'Point',
			coordinates,
			timestamp,
		},
		lastMeasurementAt: timestamp,
		loc: [
			{
				geometry: { type: 'Point', coordinates, timestamp },
				type: 'Feature',
			},
		],
		integrations: { mqtt: { enabled: false } },
		access_token: apiKey,
		sensors:
			sensors?.map((sensor) => ({
				_id: sensor.id,
				title: sensor.title,
				unit: sensor.unit,
				sensorType: sensor.sensorType,
				icon: sensor.icon,
				lastMeasurement: sensor.lastMeasurement
					? {
							createdAt: sensor.lastMeasurement.createdAt,
							// Convert number to string to match API specification
							value:
								typeof sensor.lastMeasurement.value === 'number'
									? String(sensor.lastMeasurement.value)
									: sensor.lastMeasurement.value,
						}
					: null,
			})) || [],
	}
}

export function deriveDeviceStatus(
	sensors: Sensor[] | null | undefined,
	now = Date.now(),
): DeviceStatusType {
	let latestMeasurementAt: number | null = null

	for (const sensor of sensors ?? []) {
		const createdAt = sensor.lastMeasurement?.createdAt
		if (!createdAt) continue

		const timestamp = Date.parse(createdAt)
		if (!Number.isFinite(timestamp)) continue

		if (latestMeasurementAt === null || timestamp > latestMeasurementAt) {
			latestMeasurementAt = timestamp
		}
	}

	if (latestMeasurementAt === null) return 'old'

	const age = now - latestMeasurementAt
	if (age < ACTIVE_THRESHOLD_MS) return 'active'
	if (age < INACTIVE_THRESHOLD_MS) return 'inactive'
	return 'old'
}

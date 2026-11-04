import {
	type DecoderValueMapping,
	sensorCommunityDecoderMappings,
} from '~/lib/sensor-community-mappings'
import {
	findUniqueSensorIdByTitle,
	type SensorLike,
} from '~/services/decoders/legacy-title-matcher'

/** Legacy title aliases used only for sensors without authoritative mappings. */
const luftdatenMatchings: Record<string, string[]> = {
	p0: ['pm01', 'pm0', 'p1.0', 'p0'],
	p01: ['pm0.1', 'p0.1'],
	p03: ['pm0.3', 'pm03', 'p0.3', 'p03'],
	p05: ['pm0.5', 'pm05', 'p0.5', 'p05'],
	p1: ['pm10', 'p10', 'p1'],
	p2: ['pm2.5', 'pm25', 'p2.5', 'p25', 'p2'],
	p4: ['pm4', 'p4'],
	p5: ['pm5', 'p5'],
	n1: ['nc1.0', 'nc1', 'n1.0', 'n1'],
	n01: ['nc0.1', 'n0.1', 'nc01', 'n01'],
	n03: ['nc0.3', 'n0.3', 'nc03', 'n03'],
	n05: ['nc0.5', 'n0.5', 'nc05', 'n05'],
	n4: ['nc4.0', 'n4.0', 'nc4', 'n4'],
	n5: ['nc5', 'n5'],
	n10: ['nc10', 'n10'],
	n25: ['nc2.5', 'n2.5'],
	co2: ['co2', 'carbon_dioxide', 'kohlendioxid', 'kohlenstoffdioxid'],
	co2_ppm: ['co2', 'carbon_dioxide', 'kohlendioxid', 'kohlenstoffdioxid'],
	temperature: ['temperatur'],
	humidity: ['rel. luftfeuchte', 'luftfeuchtigkeit', 'luftfeuchte'],
	pressure: ['luftdruck', 'druck'],
	signal: ['stärke', 'signal'],
	noise_laeq: ['schallpegel', 'geräuschpegel'],
}

type LuftdatenSensorMapping = {
	sensorId: string
	mapping: DecoderValueMapping
}

type LuftdatenRouteIndex = {
	definitionRoutes: Map<string, LuftdatenSensorMapping[]>
	legacySensors: SensorLike[]
}

/** Reads the stable catalogue identity persisted on newly created sensors. */
function getSensorDefinitionId(sensor: SensorLike): string | undefined {
	if (
		!sensor.data ||
		typeof sensor.data !== 'object' ||
		Array.isArray(sensor.data)
	) {
		return undefined
	}

	const sensorDefinitionId = (sensor.data as Record<string, unknown>)
		.sensorDefinitionId
	return typeof sensorDefinitionId === 'string' ? sensorDefinitionId : undefined
}

/** Splits an upload name into sensor-type and phenomenon parts. */
function parseLuftdatenValueType(valueType: string): {
	sensorType: string
	phenomenon: string
} {
	const normalizedValueType = valueType.toLowerCase()
	const separatorIndex = normalizedValueType.indexOf('_')
	let sensorType = normalizedValueType
	let phenomenon = ''

	if (separatorIndex > 0) {
		sensorType = normalizedValueType.slice(0, separatorIndex)
		phenomenon = normalizedValueType.slice(separatorIndex + 1)
	} else {
		const parts = normalizedValueType.split('_')
		sensorType = parts[0] ?? ''
		phenomenon = parts[1] ?? ''
	}

	// Older DHT and Wi-Fi payloads omit the usual sensor-type prefix.
	if (!phenomenon && ['temperature', 'humidity'].includes(sensorType)) {
		phenomenon = sensorType
		sensorType = 'dht'
	} else if (!phenomenon && sensorType === 'signal') {
		phenomenon = sensorType
		sensorType = 'wifi'
	}

	return { sensorType, phenomenon }
}

/**
 * Resolves sensors created before definition IDs existed by comparing the
 * incoming upload name with their sensor type and user-visible title.
 */
function findLuftdatenSensorIdByTitle(
	sensors: SensorLike[],
	valueType: string,
): string | undefined {
	if (!valueType) return undefined

	const { sensorType, phenomenon } = parseLuftdatenValueType(valueType)
	const aliases = luftdatenMatchings[phenomenon]
	if (!aliases) return undefined

	const compatibleSensors = sensors.filter((sensor) => {
		if (!sensor.id || !sensor.title) return false
		if (!sensor.sensorType) return true

		return sensor.sensorType.toLowerCase().startsWith(sensorType)
	})

	return findUniqueSensorIdByTitle(
		compatibleSensors,
		[phenomenon, ...aliases],
		aliases,
		`Ambiguous Luftdaten sensor mapping for value type ${valueType}`,
	)
}

/**
 * Builds exact routes for catalogue-backed sensors and keeps older sensors in
 * a separate collection for the title-based compatibility fallback.
 */
function buildLuftdatenRouteIndex(sensors: SensorLike[]): LuftdatenRouteIndex {
	const definitionRoutes = new Map<string, LuftdatenSensorMapping[]>()
	const legacySensors: SensorLike[] = []
	const decoderMappings = sensorCommunityDecoderMappings as Record<
		string,
		readonly DecoderValueMapping[] | undefined
	>

	for (const sensor of sensors) {
		const definitionId = getSensorDefinitionId(sensor)
		const hasAuthoritativeMapping =
			definitionId !== undefined &&
			Object.prototype.hasOwnProperty.call(decoderMappings, definitionId)

		if (!definitionId || !hasAuthoritativeMapping) {
			legacySensors.push(sensor)
			continue
		}

		for (const mapping of decoderMappings[definitionId] ?? []) {
			const normalizedValueType = mapping.valueType.toLowerCase()
			const routes = definitionRoutes.get(normalizedValueType) ?? []
			routes.push({ sensorId: sensor.id, mapping })
			definitionRoutes.set(normalizedValueType, routes)
		}
	}

	return { definitionRoutes, legacySensors }
}

/** Prefers an exact definition route and falls back to legacy title matching. */
function findLuftdatenSensorMapping(
	routeIndex: LuftdatenRouteIndex,
	valueType: string,
): LuftdatenSensorMapping | undefined {
	const normalizedValueType = valueType?.toLowerCase()
	if (!normalizedValueType) return undefined

	const definitionMatches =
		routeIndex.definitionRoutes.get(normalizedValueType) ?? []

	if (definitionMatches.length > 1) {
		console.warn(
			`Ambiguous Luftdaten sensor definition mapping for value type ${valueType}`,
		)
		return undefined
	}
	if (definitionMatches.length === 1) return definitionMatches[0]

	const legacySensorId = findLuftdatenSensorIdByTitle(
		routeIndex.legacySensors,
		valueType,
	)
	return legacySensorId
		? { sensorId: legacySensorId, mapping: { valueType } }
		: undefined
}

/**
 * Converts a Sensor.Community payload into measurements for the configured
 * device sensors, applying per-route unit conversions where necessary.
 */
export function decodeLuftdatenMeasurements(
	body: any,
	{ sensors }: { sensors: SensorLike[] },
): any[] {
	if (!body) throw new Error('Cannot decode empty message (luftdaten decoder)')
	if (!sensors) throw new Error('luftdaten handler needs sensors')
	if (!body.sensordatavalues || !Array.isArray(body.sensordatavalues)) {
		throw new Error('Invalid luftdaten json. Missing `sensordatavalues`')
	}

	const createdAt = new Date()
	const destinationSensorIds = new Set<string>()
	const routeIndex = buildLuftdatenRouteIndex(sensors)
	const measurements = []

	for (const sensorValue of body.sensordatavalues) {
		const resolved = findLuftdatenSensorMapping(
			routeIndex,
			sensorValue.value_type,
		)
		if (!resolved) continue

		const rawValue = parseFloat(sensorValue.value)
		if (!Number.isFinite(rawValue)) continue
		if (destinationSensorIds.has(resolved.sensorId)) {
			console.warn(
				`Multiple Luftdaten values resolved to sensor ${resolved.sensorId}; keeping the first value`,
			)
			continue
		}

		const value = rawValue * (resolved.mapping.multiplier ?? 1)
		if (!Number.isFinite(value)) continue

		destinationSensorIds.add(resolved.sensorId)
		measurements.push({
			sensor_id: resolved.sensorId,
			value,
			createdAt,
			location: null,
		})
	}

	if (measurements.length === 0) {
		throw new Error('No applicable values found')
	}

	return measurements
}

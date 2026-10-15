import { sensorDefinitions } from './sensor-definitions'

type SensorKey = keyof typeof sensorDefinitions

type SensorWithDefinitionId = (typeof sensorDefinitions)[SensorKey] & {
	id: SensorKey
}

export const luftdatenSensorDefinitionKeys = Object.entries(sensorDefinitions)
	.filter(([, definition]) => {
		if (!('decoderMappings' in definition)) return false
		return Boolean(definition.decoderMappings?.luftdaten?.length)
	})
	.map(([id]) => id as SensorKey)

const senseBoxHomeV2: readonly SensorKey[] = [
	'hdc1080_temperature',
	'hdc1080_humidity',
	'bmp280_pressure',
	'tsl45315_lightintensity',
	'veml6070_uvintensity',
	'sds011_pm10',
	'sds011_pm25',
	'bme680_humidity',
	'bme680_temperature',
	'bme680_pressure',
	'bme680_voc',
	'smt50_soilmoisture',
	'smt50_soiltemperature',
	'soundlevelmeter',
	'windspeed',
	'scd30_co2',
	'dps310_pressure',
	'sps30_pm1',
	'sps30_pm4',
	'sps30_pm10',
	'sps30_pm25',
] as const

const luftdatenSds011 = [
	'sds011_pm10',
	'sds011_pm25',
] as const satisfies readonly SensorKey[]

export const modelDefinitions = {
	senseBoxHomeV2,
	homeV2Lora: senseBoxHomeV2,
	homeV2Ethernet: senseBoxHomeV2,
	homeV2EthernetFeinstaub: senseBoxHomeV2,
	homeV2Wifi: senseBoxHomeV2,
	homeV2WifiFeinstaub: senseBoxHomeV2,

	'senseBox:Edu': [
		'hdc1080_temperature',
		'hdc1080_humidity',
		'bmp280_pressure',
		'tsl45315_lightintensity',
		'veml6070_uvintensity',
		'sds011_pm10',
		'sds011_pm25',
		'bme680_humidity',
		'bme680_temperature',
		'bme680_pressure',
		'bme680_voc',
		'smt50_soilmoisture',
		'smt50_soiltemperature',
		'soundlevelmeter',
		'windspeed',
		'scd30_co2',
		'dps310_pressure',
		'sps30_pm1',
		'sps30_pm4',
		'sps30_pm10',
		'sps30_pm25',
	] as const satisfies readonly SensorKey[],

	'luftdaten.info': luftdatenSensorDefinitionKeys,
	luftdaten_sds011: luftdatenSds011,
	luftdaten_sds011_dht11: [
		...luftdatenSds011,
		'dht11_temperature',
		'dht11_humidity',
	] as const satisfies readonly SensorKey[],
	luftdaten_sds011_dht22: [
		...luftdatenSds011,
		'dht22_temperature',
		'dht22_humidity',
	] as const satisfies readonly SensorKey[],
	luftdaten_sds011_bmp180: [
		...luftdatenSds011,
		'bmp180_temperature',
		'bmp180_pressure_pa',
	] as const satisfies readonly SensorKey[],
	luftdaten_sds011_bme280: [
		...luftdatenSds011,
		'bme280_temperature',
		'bme280_humidity',
		'bme280_pressure_pa',
	] as const satisfies readonly SensorKey[],
	hackair_home_v2: ['sds011_pm10', 'sds011_pm25'] as const,

	homeEthernet: [
		'hdc1008_temperature',
		'hdc1008_humidity',
		'bmp280_pressure',
		'tsl45315_lightintensity',
		'veml6070_uvintensity',
	] as const satisfies readonly SensorKey[],

	homeWifi: [
		'hdc1008_temperature',
		'hdc1008_humidity',
		'bmp280_pressure',
		'tsl45315_lightintensity',
		'veml6070_uvintensity',
	] as const satisfies readonly SensorKey[],

	homeEthernetFeinstaub: [
		'hdc1008_temperature',
		'hdc1008_humidity',
		'bmp280_pressure',
		'tsl45315_lightintensity',
		'veml6070_uvintensity',
		'sds011_pm10',
		'sds011_pm25',
	] as const satisfies readonly SensorKey[],

	homeWifiFeinstaub: [
		'hdc1008_temperature',
		'hdc1008_humidity',
		'bmp280_pressure',
		'tsl45315_lightintensity',
		'veml6070_uvintensity',
		'sds011_pm10',
		'sds011_pm25',
	] as const satisfies readonly SensorKey[],
} as const

export type ModelDefinitionKey = keyof typeof modelDefinitions

export const getSensorsForModel = (
	model: ModelDefinitionKey,
	sensorTemplates?: readonly string[],
): SensorWithDefinitionId[] => {
	const keys = modelDefinitions[model]
	if (!keys) return []

	const sensors = keys.map((key) => ({
		id: key,
		...sensorDefinitions[key],
	}))

	if (!sensorTemplates?.length) return sensors

	const normalizedTemplates = new Set(
		sensorTemplates.map((template) => template.toLowerCase()),
	)
	return sensors.filter(
		(sensor) =>
			normalizedTemplates.has(sensor.id.toLowerCase()) ||
			normalizedTemplates.has(sensor.sensorType.toLowerCase()),
	)
}

export function findUnsupportedSensorTemplates(
	model: ModelDefinitionKey,
	sensorTemplates: readonly string[],
): string[] {
	const modelSensors = getSensorsForModel(model)
	return sensorTemplates.filter((template) => {
		const normalized = template.toLowerCase()
		return !modelSensors.some(
			(sensor) =>
				sensor.id.toLowerCase() === normalized ||
				sensor.sensorType.toLowerCase() === normalized,
		)
	})
}

export type SensorTemplateMappingConflict = {
	valueType: string
	sensorDefinitionIds: string[]
}

export function findSensorTemplateMappingConflict(
	model: string | undefined,
	sensorTemplates: readonly string[] | undefined,
): SensorTemplateMappingConflict | undefined {
	if (model !== 'luftdaten.info' || !sensorTemplates?.length) return undefined

	const mappingsByValueType = new Map<
		string,
		{ valueType: string; sensorDefinitionIds: Set<SensorKey> }
	>()

	for (const sensor of getSensorsForModel('luftdaten.info', sensorTemplates)) {
		if (!('decoderMappings' in sensor)) continue

		for (const mapping of sensor.decoderMappings?.luftdaten ?? []) {
			const normalizedValueType = mapping.valueType.toLowerCase()
			const destination = mappingsByValueType.get(normalizedValueType) ?? {
				valueType: mapping.valueType,
				sensorDefinitionIds: new Set<SensorKey>(),
			}
			destination.sensorDefinitionIds.add(sensor.id)
			mappingsByValueType.set(normalizedValueType, destination)
		}
	}

	const conflict = [...mappingsByValueType.values()].find(
		({ sensorDefinitionIds }) => sensorDefinitionIds.size > 1,
	)
	if (!conflict) return undefined

	return {
		valueType: conflict.valueType,
		sensorDefinitionIds: [...conflict.sensorDefinitionIds],
	}
}

export function getSensorTemplateValidationError(
	model: string | undefined,
	sensorTemplates: readonly string[] | undefined,
): string | undefined {
	if (!model || model.toLowerCase() === 'custom') return undefined
	if (!Object.hasOwn(modelDefinitions, model)) {
		return `Unknown model: ${model}`
	}
	if (model === 'luftdaten.info' && !sensorTemplates?.length) {
		return `At least one sensor template is required for model ${model}`
	}

	const definitionModel = model as ModelDefinitionKey
	if (sensorTemplates?.length) {
		const unsupportedTemplates = findUnsupportedSensorTemplates(
			definitionModel,
			sensorTemplates,
		)
		if (unsupportedTemplates.length > 0) {
			return `Unsupported sensor templates for model ${model}: ${unsupportedTemplates.join(', ')}`
		}
	}

	const conflict = findSensorTemplateMappingConflict(model, sensorTemplates)
	if (conflict) {
		return `Ambiguous Luftdaten value type ${conflict.valueType} maps to multiple selected sensor definitions: ${conflict.sensorDefinitionIds.join(', ')}`
	}

	return undefined
}

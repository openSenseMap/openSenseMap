import { sensorDefinitions } from './sensor-definitions'

type SensorKey = keyof typeof sensorDefinitions

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
	'sps30_pm25',
	'sps30_pm4',
	'sps30_pm10',
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

	'luftdaten.info': [
		'pms1003_pm01',
		'pms1003_pm10',
		'pms1003_pm25',
		'pms3003_pm01',
		'pms3003_pm10',
		'pms3003_pm25',
		'pms5003_pm01',
		'pms5003_pm10',
		'pms5003_pm25',
		'pms7003_pm01',
		'pms7003_pm10',
		'pms7003_pm25',
		'sds011_pm10',
		'sds011_pm25',
		'sps30_pm1',
		'sps30_pm4',
		'sps30_pm10',
		'sps30_pm25',
		'sht3x_humidity',
		'sht3x_temperature',
		'bmp180_temperature',
		'bmp180_pressure_pa',
		'bmp180_pressure_hpa',
		'bme280_humidity',
		'bme280_temperature',
		'bme280_pressure_pa',
		'bme280_pressure_hpa',
		'dht11_humidity',
		'dht11_temperature',
		'dht22_humidity',
		'dht22_temperature',
	] as const satisfies readonly SensorKey[],

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

	hackair_home_v2: luftdatenSds011,
} as const

const normalizeSensorTemplate = (value: string) =>
	value.toLowerCase().replace(/[\s_-]+/g, '')

export const getSensorsForModel = (
	model: string,
	sensorTemplates?: readonly string[],
) => {
	const keys = modelDefinitions[model as keyof typeof modelDefinitions]
	if (!keys) return undefined

	const sensors = keys.map((key) => ({
		id: key,
		...sensorDefinitions[key],
	}))

	if (!sensorTemplates?.length) return sensors

	const normalizedTemplates = new Set(
		sensorTemplates.map(normalizeSensorTemplate),
	)

	return sensors.filter(
		(sensor) =>
			normalizedTemplates.has(normalizeSensorTemplate(sensor.id)) ||
			normalizedTemplates.has(normalizeSensorTemplate(sensor.sensorType)),
	)
}

export const getSensorTemplateValidationError = (
	model: string | undefined,
	sensorTemplates: readonly string[] | undefined,
): string | undefined => {
	if (!sensorTemplates?.length) return undefined
	if (!model || model === 'custom') {
		return 'sensorTemplates requires a predefined model.'
	}

	const modelSensors = getSensorsForModel(model)
	if (!modelSensors) return `Unknown model: ${model}`

	const unsupportedTemplates = sensorTemplates.filter((template) => {
		const normalizedTemplate = normalizeSensorTemplate(template)
		return !modelSensors.some(
			(sensor) =>
				normalizeSensorTemplate(sensor.id) === normalizedTemplate ||
				normalizeSensorTemplate(sensor.sensorType) === normalizedTemplate,
		)
	})

	if (unsupportedTemplates.length > 0) {
		return `Unsupported sensor templates for model ${model}: ${unsupportedTemplates.join(', ')}`
	}

	return undefined
}

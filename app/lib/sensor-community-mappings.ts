import { type SensorDefinitionId } from './sensor-definitions'

export type DecoderValueMapping = {
	valueType: string
	multiplier?: number
}

/**
 * Maps stable sensor-definition IDs to values emitted by the
 * Sensor.Community (formerly Luftdaten) payload format.
 *
 * This is intentionally separate from the presentation-oriented sensor
 * catalog: adding a sensor definition must not expose it through the generic
 * Sensor.Community model or make it eligible for decoder routing by accident.
 */
export const sensorCommunityDecoderMappings = {
	dht22_temperature: [
		{ valueType: 'temperature' },
		{ valueType: 'DHT22_temperature' },
	],
	sht3x_temperature: [{ valueType: 'SHT3X_temperature' }],
	pms5003_pm01: [{ valueType: 'PMS_P0' }],
	pms5003_pm25: [{ valueType: 'PMS_P2' }],
	bme280_pressure_pa: [{ valueType: 'BME280_pressure' }],
	bme280_humidity: [{ valueType: 'BME280_humidity' }],
	pms5003_pm10: [{ valueType: 'PMS_P1' }],
	bme280_temperature: [{ valueType: 'BME280_temperature' }],
	sht3x_humidity: [{ valueType: 'SHT3X_humidity' }],
	bmp180_temperature: [{ valueType: 'BMP180_temperature' }],
	sds011_pm25: [{ valueType: 'SDS_P2' }],
	sps30_pm10: [{ valueType: 'SPS30_P1' }],
	pms7003_pm25: [{ valueType: 'PMS_P2' }],
	dht22_humidity: [{ valueType: 'humidity' }, { valueType: 'DHT22_humidity' }],
	pms7003_pm01: [{ valueType: 'PMS_P0' }],
	pms7003_pm10: [{ valueType: 'PMS_P1' }],
	sps30_pm25: [{ valueType: 'SPS30_P2' }],
	bme280_pressure_hpa: [{ valueType: 'BME280_pressure', multiplier: 0.01 }],
	bmp180_pressure_pa: [{ valueType: 'BMP180_pressure' }],
	sds011_pm10: [{ valueType: 'SDS_P1' }],
	sps30_pm1: [{ valueType: 'SPS30_P0' }],
	pms1003_pm01: [{ valueType: 'PMS_P0' }],
	pms1003_pm25: [{ valueType: 'PMS_P2' }],
	scd30_co2: [{ valueType: 'SCD30_co2' }, { valueType: 'SCD30_co2_ppm' }],
	sps30_pm4: [{ valueType: 'SPS30_P4' }],
	sps30_nc05: [{ valueType: 'SPS30_N05' }],
	sps30_nc1: [{ valueType: 'SPS30_N1' }],
	sps30_nc25: [{ valueType: 'SPS30_N25' }],
	sps30_nc4: [{ valueType: 'SPS30_N4' }],
	sps30_nc10: [{ valueType: 'SPS30_N10' }],
	sen55_pm1: [
		{ valueType: 'SPS30_P0' },
		{ valueType: 'SEN5X_P0' },
		{ valueType: 'SEN55_P0' },
	],
	sen55_pm25: [
		{ valueType: 'SPS30_P2' },
		{ valueType: 'SEN5X_P2' },
		{ valueType: 'SEN55_P2' },
	],
	sen55_pm4: [
		{ valueType: 'SPS30_P4' },
		{ valueType: 'SEN5X_P4' },
		{ valueType: 'SEN55_P4' },
	],
	sen55_pm10: [
		{ valueType: 'SPS30_P1' },
		{ valueType: 'SEN5X_P1' },
		{ valueType: 'SEN55_P1' },
	],
	sen55_nc05: [
		{ valueType: 'SPS30_N05' },
		{ valueType: 'SEN5X_N05' },
		{ valueType: 'SEN55_N05' },
	],
	sen55_nc1: [
		{ valueType: 'SPS30_N1' },
		{ valueType: 'SEN5X_N1' },
		{ valueType: 'SEN55_N1' },
	],
	sen55_nc25: [
		{ valueType: 'SPS30_N25' },
		{ valueType: 'SEN5X_N25' },
		{ valueType: 'SEN55_N25' },
	],
	sen55_nc4: [
		{ valueType: 'SPS30_N4' },
		{ valueType: 'SEN5X_N4' },
		{ valueType: 'SEN55_N4' },
	],
	sen55_nc10: [
		{ valueType: 'SPS30_N10' },
		{ valueType: 'SEN5X_N10' },
		{ valueType: 'SEN55_N10' },
	],
	sen55_typical_particle_size: [
		{ valueType: 'SPS30_TS' },
		{ valueType: 'SEN5X_TS' },
		{ valueType: 'SEN55_TS' },
	],
	sen55_temperature: [
		{ valueType: 'SHT3X_temperature' },
		{ valueType: 'SEN5X_temperature' },
		{ valueType: 'SEN55_temperature' },
	],
	sen55_humidity: [
		{ valueType: 'SHT3X_humidity' },
		{ valueType: 'SEN5X_humidity' },
		{ valueType: 'SEN55_humidity' },
	],
	sen55_voc: [{ valueType: 'SEN5X_voc' }, { valueType: 'SEN55_voc' }],
	sen55_nox: [{ valueType: 'SEN5X_nox' }, { valueType: 'SEN55_nox' }],
	pms1003_pm10: [{ valueType: 'PMS_P1' }],
	pms3003_pm25: [{ valueType: 'PMS_P2' }],
	bmp180_pressure_hpa: [{ valueType: 'BMP180_pressure', multiplier: 0.01 }],
	pms3003_pm01: [{ valueType: 'PMS_P0' }],
	dht11_temperature: [
		{ valueType: 'temperature' },
		{ valueType: 'DHT11_temperature' },
	],
	dht11_humidity: [{ valueType: 'humidity' }, { valueType: 'DHT11_humidity' }],
	pms3003_pm10: [{ valueType: 'PMS_P1' }],
	dnms_la_eq: [{ valueType: 'DNMS_noise_LAeq' }],
} as const satisfies Partial<
	Record<SensorDefinitionId, readonly DecoderValueMapping[]>
>

/** Sensor definitions deliberately exposed by the generic Sensor.Community model. */
export const sensorCommunitySensorDefinitionIds = [
	'dht22_temperature',
	'sht3x_temperature',
	'pms5003_pm01',
	'pms5003_pm25',
	'bme280_pressure_pa',
	'bme280_humidity',
	'pms5003_pm10',
	'bme280_temperature',
	'sht3x_humidity',
	'bmp180_temperature',
	'sds011_pm25',
	'sps30_pm10',
	'pms7003_pm25',
	'dht22_humidity',
	'pms7003_pm01',
	'pms7003_pm10',
	'sps30_pm25',
	'bme280_pressure_hpa',
	'bmp180_pressure_pa',
	'sds011_pm10',
	'sps30_pm1',
	'pms1003_pm01',
	'pms1003_pm25',
	'scd30_co2',
	'sps30_pm4',
	'sps30_nc05',
	'sps30_nc1',
	'sps30_nc25',
	'sps30_nc4',
	'sps30_nc10',
	'sen55_pm1',
	'sen55_pm25',
	'sen55_pm4',
	'sen55_pm10',
	'sen55_nc05',
	'sen55_nc1',
	'sen55_nc25',
	'sen55_nc4',
	'sen55_nc10',
	'sen55_typical_particle_size',
	'sen55_temperature',
	'sen55_humidity',
	'sen55_voc',
	'sen55_nox',
	'pms1003_pm10',
	'pms3003_pm25',
	'bmp180_pressure_hpa',
	'pms3003_pm01',
	'dht11_temperature',
	'dht11_humidity',
	'pms3003_pm10',
	'dnms_la_eq',
] as const satisfies readonly (keyof typeof sensorCommunityDecoderMappings)[]

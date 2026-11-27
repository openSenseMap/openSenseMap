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
	'sps30_pm4',
	'sps30_pm10',
	'sps30_pm25',
] as const

const sds011 = ['sds011_pm10', 'sds011_pm25'] as const

export const modelDefinitions = {
	senseBoxHomeV2,
	homeV2Lora: senseBoxHomeV2,
	homeV2Ethernet: senseBoxHomeV2,
	homeV2EthernetFeinstaub: senseBoxHomeV2,
	homeV2Wifi: senseBoxHomeV2,
	homeV2WifiFeinstaub: senseBoxHomeV2,
	luftdaten_sds011: sds011,
	luftdaten_sds011_dht11: [...sds011, 'dht11_temperature', 'dht11_humidity'],
	luftdaten_sds011_dht22: [...sds011, 'dht22_temperature', 'dht22_humidity'],
	luftdaten_sds011_bmp180: [
		...sds011,
		'bmp180_temperature',
		'bmp180_pressure_pa',
	],
	luftdaten_sds011_bme280: [
		...sds011,
		'bme280_temperature',
		'bme280_humidity',
		'bme280_pressure_pa',
	],
	hackair_home_v2: sds011,

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
} as const

export const getSensorsForModel = (model: keyof typeof modelDefinitions) => {
	const keys = modelDefinitions[model]
	if (!keys) return []

	return keys.map((key) => ({
		id: key,
		...sensorDefinitions[key],
	}))
}

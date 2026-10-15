type SensorDefinition = {
	title: string
	unit: string
	sensorType: string
	icon: string
	image?: string
	phenomenon?: string
	decoderMappings?: {
		luftdaten?: readonly DecoderValueMapping[]
	}
}

export type DecoderValueMapping = {
	valueType: string
	multiplier?: number
}

const sensorDefinitionTemplates = {
	windspeed: {
		title: 'Windgeschwindigkeit',
		unit: 'm/s',
		sensorType: 'WINDSPEED',
		icon: 'osem-particulate-matter',
		image: '',
	},
	dht22_temperature: {
		title: 'Temperatur',
		unit: '°C',
		sensorType: 'DHT22',
		icon: 'osem-thermometer',
	},
	bme680_temperature: {
		title: 'Lufttemperatur',
		unit: '°C',
		sensorType: 'BME680',
		icon: 'osem-thermometer',
		image: '/img/sensor_images/BME680.jpg',
	},
	smt50_soilmoisture: {
		title: 'Bodenfeuchte',
		unit: '%',
		sensorType: 'SMT50',
		icon: 'osem-thermometer',
		image: '/img/sensor_images/SMT50.jpg',
	},
	sht3x_temperature: {
		title: 'Temperatur',
		unit: '°C',
		sensorType: 'SHT3X',
		icon: 'osem-thermometer',
	},
	pms5003_pm01: {
		title: 'PM01',
		unit: 'µg/m³',
		sensorType: 'PMS 5003',
		icon: 'osem-cloud',
	},
	pms5003_pm25: {
		title: 'PM2.5',
		unit: 'µg/m³',
		sensorType: 'PMS 5003',
		icon: 'osem-cloud',
	},
	bme280_pressure_pa: {
		title: 'Luftdruck',
		unit: 'Pa',
		sensorType: 'BME280',
		icon: 'osem-barometer',
	},
	bme680_humidity: {
		title: 'Luftfeuchte',
		unit: '%',
		sensorType: 'BME680',
		icon: 'osem-humidity',
		image: '/img/sensor_images/BME680.jpg',
	},
	bme280_humidity: {
		title: 'rel. Luftfeuchte',
		unit: '%',
		sensorType: 'BME280',
		icon: 'osem-humidity',
	},
	pms5003_pm10: {
		title: 'PM10',
		unit: 'µg/m³',
		sensorType: 'PMS 5003',
		icon: 'osem-cloud',
	},
	bme280_temperature: {
		title: 'Temperatur',
		unit: '°C',
		sensorType: 'BME280',
		icon: 'osem-thermometer',
	},
	veml6070_uvintensity: {
		title: 'UV-Intensität',
		unit: 'μW/cm²',
		sensorType: 'VEML6070',
		icon: 'osem-brightness',
		image: '/img/sensor_images/VEML6070.jpg',
	},
	sht3x_humidity: {
		title: 'rel. Luftfeuchte',
		unit: '%',
		sensorType: 'SHT3X',
		icon: 'osem-humidity',
	},
	bme680_pressure: {
		title: 'atm. Luftdruck',
		unit: 'hPa',
		sensorType: 'BME680',
		icon: 'osem-barometer',
		image: '/img/sensor_images/BME680.jpg',
	},
	tsl45315_lightintensity: {
		title: 'Beleuchtungsstärke',
		unit: 'lx',
		sensorType: 'TSL45315',
		icon: 'osem-brightness',
		image: '/img/sensor_images/VEML6070.jpg',
	},
	bmp180_temperature: {
		title: 'Temperatur',
		unit: '°C',
		sensorType: 'BMP180',
		icon: 'osem-thermometer',
	},
	sds011_pm25: {
		title: 'PM2.5',
		unit: 'µg/m³',
		sensorType: 'SDS 011',
		icon: 'osem-cloud',
		image: '/img/sensor_images/SDS011.png',
	},
	sps30_pm10: {
		title: 'PM10',
		unit: 'µg/m³',
		sensorType: 'SPS30',
		icon: 'osem-cloud',
		image: '/img/sensor_images/SPS30.jpg',
	},
	soundlevelmeter: {
		title: 'Lautstärke',
		unit: 'dB (A)',
		sensorType: 'SOUNDLEVELMETER',
		icon: 'osem-thermometer',
		image: '/img/sensor_images/SoundLevelSensor.jpg',
	},
	pms7003_pm25: {
		title: 'PM2.5',
		unit: 'µg/m³',
		sensorType: 'PMS 7003',
		icon: 'osem-cloud',
	},
	bme680_voc: {
		title: 'VOC',
		unit: 'kOhm',
		sensorType: 'BME680',
		icon: 'osem-thermometer',
		image: '/img/sensor_images/BME680.jpg',
	},
	dnms_la_min: {
		title: 'Schalldruckpegel (Min)',
		unit: 'db (A)',
		sensorType: 'DNMS',
		icon: 'osem-volume-up',
		image: '/img/sensor_images/DNMS.jpg',
	},
	dht22_humidity: {
		title: 'rel. Luftfeuchte',
		unit: '%',
		sensorType: 'DHT22',
		icon: 'osem-humidity',
	},
	pms7003_pm01: {
		title: 'PM01',
		unit: 'µg/m³',
		sensorType: 'PMS 7003',
		icon: 'osem-cloud',
	},
	dps310_temperature: {
		title: 'Temperatur',
		unit: '°C',
		sensorType: 'DPS310',
		icon: 'osem-thermometer',
		image: '/img/sensor_images/DPS310.jpg',
	},
	pms7003_pm10: {
		title: 'PM10',
		unit: 'µg/m³',
		sensorType: 'PMS 7003',
		icon: 'osem-cloud',
	},
	sps30_pm25: {
		title: 'PM2.5',
		unit: 'µg/m³',
		sensorType: 'SPS30',
		icon: 'osem-cloud',
		image: '/img/sensor_images/SPS30.jpg',
	},
	dps310_pressure: {
		title: 'Luftdruck',
		unit: 'hPa',
		sensorType: 'DPS310',
		icon: 'osem-barometer',
		image: '/img/sensor_images/DPS310.jpg',
	},
	bme280_pressure_hpa: {
		title: 'Luftdruck',
		unit: 'hPa',
		sensorType: 'BME280',
		icon: 'osem-barometer',
	},
	bmp180_pressure_pa: {
		title: 'Luftdruck',
		unit: 'Pa',
		sensorType: 'BMP180',
		icon: 'osem-humidity',
	},
	sds011_pm10: {
		title: 'PM10',
		unit: 'µg/m³',
		sensorType: 'SDS 011',
		icon: 'osem-cloud',
		image: '/img/sensor_images/SDS011.png',
	},
	sps30_pm1: {
		title: 'PM1',
		unit: 'µg/m³',
		sensorType: 'SPS30',
		icon: 'osem-cloud',
		image: '/img/sensor_images/SPS30.jpg',
	},
	pms1003_pm01: {
		title: 'PM01',
		unit: 'µg/m³',
		sensorType: 'PMS 1003',
		icon: 'osem-cloud',
	},
	hdc1080_temperature: {
		title: 'Temperatur',
		unit: '°C',
		sensorType: 'HDC1080',
		icon: 'osem-thermometer',
		image: '/img/sensor_images/HDC1080.jpg',
	},
	pms1003_pm25: {
		title: 'PM2.5',
		unit: 'µg/m³',
		sensorType: 'PMS 1003',
		icon: 'osem-cloud',
	},
	scd30_co2: {
		title: 'CO₂',
		unit: 'ppm',
		sensorType: 'SCD30',
		icon: 'osem-co2',
		image: '/img/sensor_images/SCD30.jpg',
	},
	hdc1008_temperature: {
		title: 'Temperatur',
		unit: '°C',
		sensorType: 'HDC1008',
		icon: 'osem-thermometer',
		image: '/img/sensor_images/HDC1008.png',
	},
	sps30_pm4: {
		title: 'PM4',
		unit: 'µg/m³',
		sensorType: 'SPS30',
		icon: 'osem-cloud',
		image: '/img/sensor_images/SPS30.jpg',
	},
	sps30_nc05: {
		title: 'NC0.5',
		unit: '#/cm³',
		sensorType: 'SPS30',
		icon: 'osem-cloud',
		image: '/img/sensor_images/SPS30.jpg',
	},
	sps30_nc1: {
		title: 'NC1.0',
		unit: '#/cm³',
		sensorType: 'SPS30',
		icon: 'osem-cloud',
		image: '/img/sensor_images/SPS30.jpg',
	},
	sps30_nc25: {
		title: 'NC2.5',
		unit: '#/cm³',
		sensorType: 'SPS30',
		icon: 'osem-cloud',
		image: '/img/sensor_images/SPS30.jpg',
	},
	sps30_nc4: {
		title: 'NC4.0',
		unit: '#/cm³',
		sensorType: 'SPS30',
		icon: 'osem-cloud',
		image: '/img/sensor_images/SPS30.jpg',
	},
	sps30_nc10: {
		title: 'NC10',
		unit: '#/cm³',
		sensorType: 'SPS30',
		icon: 'osem-cloud',
		image: '/img/sensor_images/SPS30.jpg',
	},
	sen55_pm1: {
		title: 'PM1',
		unit: 'µg/m³',
		sensorType: 'SEN55',
		icon: 'osem-cloud',
	},
	sen55_pm25: {
		title: 'PM2.5',
		unit: 'µg/m³',
		sensorType: 'SEN55',
		icon: 'osem-cloud',
	},
	sen55_pm4: {
		title: 'PM4',
		unit: 'µg/m³',
		sensorType: 'SEN55',
		icon: 'osem-cloud',
	},
	sen55_pm10: {
		title: 'PM10',
		unit: 'µg/m³',
		sensorType: 'SEN55',
		icon: 'osem-cloud',
	},
	sen55_nc05: {
		title: 'NC0.5',
		unit: '#/cm³',
		sensorType: 'SEN55',
		icon: 'osem-cloud',
	},
	sen55_nc1: {
		title: 'NC1.0',
		unit: '#/cm³',
		sensorType: 'SEN55',
		icon: 'osem-cloud',
	},
	sen55_nc25: {
		title: 'NC2.5',
		unit: '#/cm³',
		sensorType: 'SEN55',
		icon: 'osem-cloud',
	},
	sen55_nc4: {
		title: 'NC4.0',
		unit: '#/cm³',
		sensorType: 'SEN55',
		icon: 'osem-cloud',
	},
	sen55_nc10: {
		title: 'NC10',
		unit: '#/cm³',
		sensorType: 'SEN55',
		icon: 'osem-cloud',
	},
	sen55_typical_particle_size: {
		title: 'Typische Partikelgröße',
		unit: 'µm',
		sensorType: 'SEN55',
		icon: 'osem-cloud',
	},
	sen55_temperature: {
		title: 'Temperatur',
		unit: '°C',
		sensorType: 'SEN55',
		icon: 'osem-thermometer',
	},
	sen55_humidity: {
		title: 'rel. Luftfeuchte',
		unit: '%',
		sensorType: 'SEN55',
		icon: 'osem-humidity',
	},
	sen55_voc: {
		title: 'VOC-Index',
		unit: 'Index',
		sensorType: 'SEN55',
		icon: 'osem-gauge',
	},
	sen55_nox: {
		title: 'NOx-Index',
		unit: 'Index',
		sensorType: 'SEN55',
		icon: 'osem-gauge',
	},
	pms1003_pm10: {
		title: 'PM10',
		unit: 'µg/m³',
		sensorType: 'PMS 1003',
		icon: 'osem-cloud',
	},
	pms3003_pm25: {
		title: 'PM2.5',
		unit: 'µg/m³',
		sensorType: 'PMS 3003',
		icon: 'osem-cloud',
	},
	bmp180_pressure_hpa: {
		title: 'Luftdruck',
		unit: 'hPa',
		sensorType: 'BMP180',
		icon: 'osem-humidity',
	},
	dnms_la_max: {
		title: 'Schalldruckpegel (Max)',
		unit: 'db (A)',
		sensorType: 'DNMS',
		icon: 'osem-volume-up',
		image: '/img/sensor_images/DNMS.jpg',
	},
	hdc1080_humidity: {
		title: 'rel. Luftfeuchte',
		unit: '%',
		sensorType: 'HDC1080',
		icon: 'osem-humidity',
		image: '/img/sensor_images/HDC1080.jpg',
	},
	pms3003_pm01: {
		title: 'PM01',
		unit: 'µg/m³',
		sensorType: 'PMS 3003',
		icon: 'osem-cloud',
	},
	dht11_temperature: {
		title: 'Temperatur',
		unit: '°C',
		sensorType: 'DHT11',
		icon: 'osem-thermometer',
	},
	smt50_soiltemperature: {
		title: 'Bodentemperatur',
		unit: '°C',
		sensorType: 'SMT50',
		icon: 'osem-thermometer',
		image: '/img/sensor_images/SMT50.jpg',
	},
	dht11_humidity: {
		title: 'rel. Luftfeuchte',
		unit: '%',
		sensorType: 'DHT11',
		icon: 'osem-humidity',
	},
	pms3003_pm10: {
		title: 'PM10',
		unit: 'µg/m³',
		sensorType: 'PMS 3003',
		icon: 'osem-cloud',
	},
	dnms_la_eq: {
		title: 'Schalldruckpegel',
		unit: 'db (A)',
		sensorType: 'DNMS',
		icon: 'osem-volume-up',
		image: '/img/sensor_images/DNMS.jpg',
	},
	bmp280_pressure: {
		title: 'Luftdruck',
		unit: 'hPa',
		sensorType: 'BMP280',
		icon: 'osem-barometer',
		image: '/img/sensor_images/BMP280.png',
	},
	hdc1008_humidity: {
		title: 'rel. Luftfeuchte',
		unit: '%',
		sensorType: 'HDC1008',
		icon: 'osem-humidity',
		image: '/img/sensor_images/HDC1008.png',
	},
} as const satisfies Record<string, SensorDefinition>

type SensorDefinitionMetadata = {
	phenomenon: string
	decoderMappings?: SensorDefinition['decoderMappings']
}

const sensorDefinitionMetadata = {
	windspeed: { phenomenon: 'wind-speed' },
	dht22_temperature: {
		phenomenon: 'air-temperature',
		decoderMappings: {
			luftdaten: [
				{ valueType: 'temperature' },
				{ valueType: 'DHT22_temperature' },
			],
		},
	},
	bme680_temperature: { phenomenon: 'air-temperature' },
	smt50_soilmoisture: { phenomenon: 'soil-moisture' },
	sht3x_temperature: {
		phenomenon: 'air-temperature',
		decoderMappings: { luftdaten: [{ valueType: 'SHT3X_temperature' }] },
	},
	pms5003_pm01: {
		phenomenon: 'particulate-matter-mass-concentration-1um',
		decoderMappings: { luftdaten: [{ valueType: 'PMS_P0' }] },
	},
	pms5003_pm25: {
		phenomenon: 'particulate-matter-mass-concentration-2.5um',
		decoderMappings: { luftdaten: [{ valueType: 'PMS_P2' }] },
	},
	bme280_pressure_pa: {
		phenomenon: 'atmospheric-pressure',
		decoderMappings: { luftdaten: [{ valueType: 'BME280_pressure' }] },
	},
	bme680_humidity: { phenomenon: 'relative-humidity' },
	bme280_humidity: {
		phenomenon: 'relative-humidity',
		decoderMappings: { luftdaten: [{ valueType: 'BME280_humidity' }] },
	},
	pms5003_pm10: {
		phenomenon: 'particulate-matter-mass-concentration-10um',
		decoderMappings: { luftdaten: [{ valueType: 'PMS_P1' }] },
	},
	bme280_temperature: {
		phenomenon: 'air-temperature',
		decoderMappings: { luftdaten: [{ valueType: 'BME280_temperature' }] },
	},
	veml6070_uvintensity: { phenomenon: 'ultraviolet-intensity' },
	sht3x_humidity: {
		phenomenon: 'relative-humidity',
		decoderMappings: { luftdaten: [{ valueType: 'SHT3X_humidity' }] },
	},
	bme680_pressure: { phenomenon: 'atmospheric-pressure' },
	tsl45315_lightintensity: { phenomenon: 'illuminance' },
	bmp180_temperature: {
		phenomenon: 'air-temperature',
		decoderMappings: { luftdaten: [{ valueType: 'BMP180_temperature' }] },
	},
	sds011_pm25: {
		phenomenon: 'particulate-matter-mass-concentration-2.5um',
		decoderMappings: { luftdaten: [{ valueType: 'SDS_P2' }] },
	},
	sps30_pm10: {
		phenomenon: 'particulate-matter-mass-concentration-10um',
		decoderMappings: { luftdaten: [{ valueType: 'SPS30_P1' }] },
	},
	soundlevelmeter: { phenomenon: 'sound-pressure-level' },
	pms7003_pm25: {
		phenomenon: 'particulate-matter-mass-concentration-2.5um',
		decoderMappings: { luftdaten: [{ valueType: 'PMS_P2' }] },
	},
	bme680_voc: { phenomenon: 'volatile-organic-compounds' },
	dnms_la_min: { phenomenon: 'sound-pressure-level-minimum' },
	dht22_humidity: {
		phenomenon: 'relative-humidity',
		decoderMappings: {
			luftdaten: [{ valueType: 'humidity' }, { valueType: 'DHT22_humidity' }],
		},
	},
	pms7003_pm01: {
		phenomenon: 'particulate-matter-mass-concentration-1um',
		decoderMappings: { luftdaten: [{ valueType: 'PMS_P0' }] },
	},
	dps310_temperature: { phenomenon: 'air-temperature' },
	pms7003_pm10: {
		phenomenon: 'particulate-matter-mass-concentration-10um',
		decoderMappings: { luftdaten: [{ valueType: 'PMS_P1' }] },
	},
	sps30_pm25: {
		phenomenon: 'particulate-matter-mass-concentration-2.5um',
		decoderMappings: { luftdaten: [{ valueType: 'SPS30_P2' }] },
	},
	dps310_pressure: { phenomenon: 'atmospheric-pressure' },
	bme280_pressure_hpa: {
		phenomenon: 'atmospheric-pressure',
		decoderMappings: {
			luftdaten: [{ valueType: 'BME280_pressure', multiplier: 0.01 }],
		},
	},
	bmp180_pressure_pa: {
		phenomenon: 'atmospheric-pressure',
		decoderMappings: { luftdaten: [{ valueType: 'BMP180_pressure' }] },
	},
	sds011_pm10: {
		phenomenon: 'particulate-matter-mass-concentration-10um',
		decoderMappings: { luftdaten: [{ valueType: 'SDS_P1' }] },
	},
	sps30_pm1: {
		phenomenon: 'particulate-matter-mass-concentration-1um',
		decoderMappings: { luftdaten: [{ valueType: 'SPS30_P0' }] },
	},
	pms1003_pm01: {
		phenomenon: 'particulate-matter-mass-concentration-1um',
		decoderMappings: { luftdaten: [{ valueType: 'PMS_P0' }] },
	},
	hdc1080_temperature: { phenomenon: 'air-temperature' },
	pms1003_pm25: {
		phenomenon: 'particulate-matter-mass-concentration-2.5um',
		decoderMappings: { luftdaten: [{ valueType: 'PMS_P2' }] },
	},
	scd30_co2: {
		phenomenon: 'carbon-dioxide-concentration',
		decoderMappings: {
			luftdaten: [{ valueType: 'SCD30_co2' }, { valueType: 'SCD30_co2_ppm' }],
		},
	},
	hdc1008_temperature: { phenomenon: 'air-temperature' },
	sps30_pm4: {
		phenomenon: 'particulate-matter-mass-concentration-4um',
		decoderMappings: { luftdaten: [{ valueType: 'SPS30_P4' }] },
	},
	sps30_nc05: {
		phenomenon: 'particle-number-concentration-0.5um',
		decoderMappings: { luftdaten: [{ valueType: 'SPS30_N05' }] },
	},
	sps30_nc1: {
		phenomenon: 'particle-number-concentration-1um',
		decoderMappings: { luftdaten: [{ valueType: 'SPS30_N1' }] },
	},
	sps30_nc25: {
		phenomenon: 'particle-number-concentration-2.5um',
		decoderMappings: { luftdaten: [{ valueType: 'SPS30_N25' }] },
	},
	sps30_nc4: {
		phenomenon: 'particle-number-concentration-4um',
		decoderMappings: { luftdaten: [{ valueType: 'SPS30_N4' }] },
	},
	sps30_nc10: {
		phenomenon: 'particle-number-concentration-10um',
		decoderMappings: { luftdaten: [{ valueType: 'SPS30_N10' }] },
	},
	sen55_pm1: {
		phenomenon: 'particulate-matter-mass-concentration-1um',
		decoderMappings: {
			luftdaten: [
				{ valueType: 'SPS30_P0' },
				{ valueType: 'SEN5X_P0' },
				{ valueType: 'SEN55_P0' },
			],
		},
	},
	sen55_pm25: {
		phenomenon: 'particulate-matter-mass-concentration-2.5um',
		decoderMappings: {
			luftdaten: [
				{ valueType: 'SPS30_P2' },
				{ valueType: 'SEN5X_P2' },
				{ valueType: 'SEN55_P2' },
			],
		},
	},
	sen55_pm4: {
		phenomenon: 'particulate-matter-mass-concentration-4um',
		decoderMappings: {
			luftdaten: [
				{ valueType: 'SPS30_P4' },
				{ valueType: 'SEN5X_P4' },
				{ valueType: 'SEN55_P4' },
			],
		},
	},
	sen55_pm10: {
		phenomenon: 'particulate-matter-mass-concentration-10um',
		decoderMappings: {
			luftdaten: [
				{ valueType: 'SPS30_P1' },
				{ valueType: 'SEN5X_P1' },
				{ valueType: 'SEN55_P1' },
			],
		},
	},
	sen55_nc05: {
		phenomenon: 'particle-number-concentration-0.5um',
		decoderMappings: {
			luftdaten: [
				{ valueType: 'SPS30_N05' },
				{ valueType: 'SEN5X_N05' },
				{ valueType: 'SEN55_N05' },
			],
		},
	},
	sen55_nc1: {
		phenomenon: 'particle-number-concentration-1um',
		decoderMappings: {
			luftdaten: [
				{ valueType: 'SPS30_N1' },
				{ valueType: 'SEN5X_N1' },
				{ valueType: 'SEN55_N1' },
			],
		},
	},
	sen55_nc25: {
		phenomenon: 'particle-number-concentration-2.5um',
		decoderMappings: {
			luftdaten: [
				{ valueType: 'SPS30_N25' },
				{ valueType: 'SEN5X_N25' },
				{ valueType: 'SEN55_N25' },
			],
		},
	},
	sen55_nc4: {
		phenomenon: 'particle-number-concentration-4um',
		decoderMappings: {
			luftdaten: [
				{ valueType: 'SPS30_N4' },
				{ valueType: 'SEN5X_N4' },
				{ valueType: 'SEN55_N4' },
			],
		},
	},
	sen55_nc10: {
		phenomenon: 'particle-number-concentration-10um',
		decoderMappings: {
			luftdaten: [
				{ valueType: 'SPS30_N10' },
				{ valueType: 'SEN5X_N10' },
				{ valueType: 'SEN55_N10' },
			],
		},
	},
	sen55_typical_particle_size: {
		phenomenon: 'typical-particle-size',
		decoderMappings: {
			luftdaten: [
				{ valueType: 'SPS30_TS' },
				{ valueType: 'SEN5X_TS' },
				{ valueType: 'SEN55_TS' },
			],
		},
	},
	sen55_temperature: {
		phenomenon: 'air-temperature',
		decoderMappings: {
			luftdaten: [
				{ valueType: 'SHT3X_temperature' },
				{ valueType: 'SEN5X_temperature' },
				{ valueType: 'SEN55_temperature' },
			],
		},
	},
	sen55_humidity: {
		phenomenon: 'relative-humidity',
		decoderMappings: {
			luftdaten: [
				{ valueType: 'SHT3X_humidity' },
				{ valueType: 'SEN5X_humidity' },
				{ valueType: 'SEN55_humidity' },
			],
		},
	},
	sen55_voc: {
		phenomenon: 'volatile-organic-compounds-index',
		decoderMappings: {
			luftdaten: [{ valueType: 'SEN5X_voc' }, { valueType: 'SEN55_voc' }],
		},
	},
	sen55_nox: {
		phenomenon: 'nitrogen-oxides-index',
		decoderMappings: {
			luftdaten: [{ valueType: 'SEN5X_nox' }, { valueType: 'SEN55_nox' }],
		},
	},
	pms1003_pm10: {
		phenomenon: 'particulate-matter-mass-concentration-10um',
		decoderMappings: { luftdaten: [{ valueType: 'PMS_P1' }] },
	},
	pms3003_pm25: {
		phenomenon: 'particulate-matter-mass-concentration-2.5um',
		decoderMappings: { luftdaten: [{ valueType: 'PMS_P2' }] },
	},
	bmp180_pressure_hpa: {
		phenomenon: 'atmospheric-pressure',
		decoderMappings: {
			luftdaten: [{ valueType: 'BMP180_pressure', multiplier: 0.01 }],
		},
	},
	dnms_la_max: { phenomenon: 'sound-pressure-level-maximum' },
	hdc1080_humidity: { phenomenon: 'relative-humidity' },
	pms3003_pm01: {
		phenomenon: 'particulate-matter-mass-concentration-1um',
		decoderMappings: { luftdaten: [{ valueType: 'PMS_P0' }] },
	},
	dht11_temperature: {
		phenomenon: 'air-temperature',
		decoderMappings: {
			luftdaten: [
				{ valueType: 'temperature' },
				{ valueType: 'DHT11_temperature' },
			],
		},
	},
	smt50_soiltemperature: { phenomenon: 'soil-temperature' },
	dht11_humidity: {
		phenomenon: 'relative-humidity',
		decoderMappings: {
			luftdaten: [{ valueType: 'humidity' }, { valueType: 'DHT11_humidity' }],
		},
	},
	pms3003_pm10: {
		phenomenon: 'particulate-matter-mass-concentration-10um',
		decoderMappings: { luftdaten: [{ valueType: 'PMS_P1' }] },
	},
	dnms_la_eq: {
		phenomenon: 'equivalent-continuous-sound-pressure-level',
		decoderMappings: { luftdaten: [{ valueType: 'DNMS_noise_LAeq' }] },
	},
	bmp280_pressure: { phenomenon: 'atmospheric-pressure' },
	hdc1008_humidity: { phenomenon: 'relative-humidity' },
} as const satisfies Record<
	keyof typeof sensorDefinitionTemplates,
	SensorDefinitionMetadata
>

type SensorDefinitions = {
	[Key in keyof typeof sensorDefinitionTemplates]: (typeof sensorDefinitionTemplates)[Key] &
		(typeof sensorDefinitionMetadata)[Key]
}

export const sensorDefinitions = Object.fromEntries(
	Object.entries(sensorDefinitionTemplates).map(([id, definition]) => [
		id,
		{
			...definition,
			...sensorDefinitionMetadata[id as keyof typeof sensorDefinitionMetadata],
		},
	]),
) as SensorDefinitions

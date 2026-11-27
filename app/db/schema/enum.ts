import { pgEnum } from 'drizzle-orm/pg-core'

import {
	DEVICE_EXPOSURE_VALUES,
	DEVICE_STATUS_VALUES,
} from '~/lib/device-enums'

export const DeviceExposureEnum = pgEnum('exposure', DEVICE_EXPOSURE_VALUES)

export const DeviceStatusEnum = pgEnum('status', DEVICE_STATUS_VALUES)

// Enum for device model types
export const DeviceModelEnum = pgEnum('model', [
	'homeV2Lora',
	'homeV2Ethernet',
	'homeV2Wifi',
	'homeEthernet',
	'homeWifi',
	'homeEthernetFeinstaub',
	'homeWifiFeinstaub',
	'luftdaten_sds011',
	'luftdaten_sds011_dht11',
	'luftdaten_sds011_dht22',
	'luftdaten_sds011_bmp180',
	'luftdaten_sds011_bme280',
	'hackair_home_v2',
	'senseBox:Edu',
	'luftdaten.info',
	'custom',
])

export const themePreference = pgEnum('theme_preference', [
	'light',
	'dark',
	'system',
])

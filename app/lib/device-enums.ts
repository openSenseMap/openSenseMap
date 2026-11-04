import { z } from 'zod'

export const DEVICE_EXPOSURE_VALUES = [
	'indoor',
	'outdoor',
	'mobile',
	'unknown',
] as const

export const DEVICE_STATUS_VALUES = ['active', 'inactive', 'old'] as const

export const LEGACY_PREDEFINED_DEVICE_MODEL_VALUES = [
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
] as const

/** Models accepted by the public API. */
export const API_DEVICE_MODEL_VALUES = [
	...LEGACY_PREDEFINED_DEVICE_MODEL_VALUES,
	'senseBox:Edu',
	'luftdaten.info',
	'custom',
] as const

/** Models available through the device-registration UI. */
export const UI_DEVICE_MODEL_VALUES = [
	'homeV2Lora',
	'homeV2Ethernet',
	'homeV2Wifi',
	'senseBox:Edu',
	'luftdaten.info',
	'custom',
] as const

export const DeviceExposureZodEnum = z.enum(DEVICE_EXPOSURE_VALUES)
export const DeviceStatusZodEnum = z.enum(DEVICE_STATUS_VALUES)
export const ApiDeviceModelZodEnum = z.enum(API_DEVICE_MODEL_VALUES)
export const UiDeviceModelZodEnum = z.enum(UI_DEVICE_MODEL_VALUES, {
	error: () => 'Please select a device.',
})

export type DeviceExposureType = z.infer<typeof DeviceExposureZodEnum>
export type DeviceStatusType = z.infer<typeof DeviceStatusZodEnum>
export type ApiDeviceModelType = z.infer<typeof ApiDeviceModelZodEnum>
export type UiDeviceModelType = z.infer<typeof UiDeviceModelZodEnum>

export function parseDeviceExposure(value: unknown): DeviceExposureType | null {
	const normalized = typeof value === 'string' ? value.toLowerCase() : value

	const result = DeviceExposureZodEnum.safeParse(normalized)

	return result.success ? result.data : null
}

export function getDeviceExposure(value: unknown): DeviceExposureType {
	return parseDeviceExposure(value) ?? 'unknown'
}

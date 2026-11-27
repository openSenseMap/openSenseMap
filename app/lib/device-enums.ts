import { z } from 'zod'

export const DEVICE_EXPOSURE_VALUES = [
	'indoor',
	'outdoor',
	'mobile',
	'unknown',
] as const

export const DEVICE_STATUS_VALUES = ['active', 'inactive', 'old'] as const

export const DeviceExposureZodEnum = z.enum(DEVICE_EXPOSURE_VALUES)
export const DeviceStatusZodEnum = z.enum(DEVICE_STATUS_VALUES)

export type DeviceExposureType = z.infer<typeof DeviceExposureZodEnum>
export type DeviceStatusType = z.infer<typeof DeviceStatusZodEnum>

export function parseDeviceExposure(value: unknown): DeviceExposureType | null {
	const normalized = typeof value === 'string' ? value.toLowerCase() : value

	const result = DeviceExposureZodEnum.safeParse(normalized)

	return result.success ? result.data : null
}

export function getDeviceExposure(value: unknown): DeviceExposureType {
	return parseDeviceExposure(value) ?? 'unknown'
}

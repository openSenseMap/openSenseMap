import { pgEnum } from 'drizzle-orm/pg-core'

import {
	API_DEVICE_MODEL_VALUES,
	DEVICE_EXPOSURE_VALUES,
	DEVICE_STATUS_VALUES,
} from '~/lib/device-enums'

export const DeviceExposureEnum = pgEnum('exposure', DEVICE_EXPOSURE_VALUES)

export const DeviceStatusEnum = pgEnum('status', DEVICE_STATUS_VALUES)

// Enum for device model types
export const DeviceModelEnum = pgEnum('model', API_DEVICE_MODEL_VALUES)

export const themePreference = pgEnum('theme_preference', [
	'light',
	'dark',
	'system',
])

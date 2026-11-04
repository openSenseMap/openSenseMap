import { pgEnum } from 'drizzle-orm/pg-core'

import {
	DEVICE_EXPOSURE_VALUES,
	DEVICE_STATUS_VALUES,
	PERSISTED_DEVICE_MODEL_VALUES,
} from '~/lib/device-enums'

export const DeviceExposureEnum = pgEnum('exposure', DEVICE_EXPOSURE_VALUES)

export const DeviceStatusEnum = pgEnum('status', DEVICE_STATUS_VALUES)

// Enum for device model types
export const DeviceModelEnum = pgEnum('model', PERSISTED_DEVICE_MODEL_VALUES)

export const themePreference = pgEnum('theme_preference', [
	'light',
	'dark',
	'system',
])

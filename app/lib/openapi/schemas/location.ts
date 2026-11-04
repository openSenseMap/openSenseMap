import z from 'zod/v4'
import { LOCATION_LIMITS } from '~/lib/location'
import { IsoDateTimeSchema } from './common'

export const LongitudeSchema = z
	.number()
	.min(LOCATION_LIMITS.longitude.min)
	.max(LOCATION_LIMITS.longitude.max)
	.meta({
		description: 'Longitude',
		example: 7.68123,
	})

export const LatitudeSchema = z
	.number()
	.min(LOCATION_LIMITS.latitude.min)
	.max(LOCATION_LIMITS.latitude.max)
	.meta({
		description: 'Latitude',
		example: 51.9123,
	})

export const HeightSchema = z.number().finite().meta({
	description: 'Height in meters. The reference level depends on the context.',
	example: 3.5,
})

export const CoordinatesSchema = z
	.tuple([LongitudeSchema, LatitudeSchema])
	.meta({
		description: '[longitude, latitude]',
		example: [7.68123, 51.9123],
		override: { minItems: 2, maxItems: 2, items: false },
	})

export const CoordinatesWithHeightSchema = z
	.union([
		CoordinatesSchema,
		z
			.tuple([
				LongitudeSchema,
				LatitudeSchema,
				HeightSchema.meta({
					description: 'Height above sea level in meters.',
					example: 66.6,
				}),
			])
			.meta({
				override: { minItems: 3, maxItems: 3, items: false },
			}),
	])
	.meta({
		id: 'CoordinatesWithHeight',
		description:
			'[longitude, latitude, height?], where height is above sea level in meters',
		example: [7.68123, 51.9123, 66.6],
	})

export const LongitudeLatitudeLocationObjectSchema = z
	.object({
		longitude: LongitudeSchema,
		latitude: LatitudeSchema,
		height: HeightSchema.optional().meta({
			description: 'Height above sea level in meters.',
			example: 66.6,
		}),
	})
	.meta({
		id: 'LongitudeLatitudeLocationObject',
		description:
			'Location object with longitude, latitude, and optional height.',
	})

export const LocationObjectSchema = z
	.object({
		lng: LongitudeSchema,
		lat: LatitudeSchema,
		height: HeightSchema.optional().meta({
			description: 'Height above sea level in meters.',
			example: 66.6,
		}),
	})
	.meta({
		id: 'LocationObject',
		description:
			'Location object with longitude, latitude, and optional height.',
	})
	.or(LongitudeLatitudeLocationObjectSchema)
	.transform((location) => {
		if ('lng' in location) return location

		return {
			lng: location.longitude,
			lat: location.latitude,
			height: location.height,
		}
	})

export const DeviceLocationInputSchema = z
	.union([
		z.object({
			lng: LongitudeSchema,
			lat: LatitudeSchema,
			height: HeightSchema.optional().meta({
				description: 'Device height above the local ground surface in meters.',
				example: 3.5,
			}),
		}),
		z.object({
			longitude: LongitudeSchema,
			latitude: LatitudeSchema,
			height: HeightSchema.optional().meta({
				description: 'Device height above the local ground surface in meters.',
				example: 3.5,
			}),
		}),
	])
	.transform((location) => {
		if ('lng' in location) return location

		return {
			lng: location.longitude,
			lat: location.latitude,
			height: location.height,
		}
	})
	.meta({
		id: 'DeviceLocationInput',
		description:
			'Device coordinates with an optional height above ground. The supplied value is persisted as height above ground. The server also attempts to resolve and persist the terrain elevation and its source dataset; height above sea level is calculated from those atomic values when needed. If terrain elevation is unavailable, height above sea level remains unset without failing the write. When height is omitted during an update, the existing above-ground height is retained.',
	})

export const GeoJsonPointSchema = z
	.object({
		type: z.literal('Point'),
		coordinates: CoordinatesWithHeightSchema,
	})
	.meta({
		id: 'GeoJsonPoint',
		description: 'GeoJSON Point geometry.',
	})

export const TimestampedGeoJsonPointSchema = GeoJsonPointSchema.extend({
	timestamp: IsoDateTimeSchema.optional().meta({
		description: 'Timestamp associated with the location.',
		example: '2023-01-01T00:00:00.000Z',
	}),
}).meta({
	id: 'TimestampedGeoJsonPoint',
	description: 'GeoJSON Point-like object with an optional timestamp.',
})

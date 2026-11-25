import * as z from 'zod/v4'
import { IsoDateTimeSchema } from './common'
import {
	GeoJsonPointSchema,
	HeightSchema,
	LatitudeSchema,
	LongitudeSchema,
	TimestampedGeoJsonPointSchema,
} from './location'

export const ApiSensorSchema = z
	.looseObject({
		_id: z.string().optional().meta({
			description: 'Sensor id in API format',
			example: 'sensor123',
		}),
		id: z.string().optional().meta({
			description: 'Sensor id',
			example: 'sensor123',
		}),
		title: z.string().nullable().optional().meta({
			description: 'Sensor title',
			example: 'Temperature',
		}),
		unit: z.string().nullable().optional().meta({
			description: 'Sensor unit',
			example: '°C',
		}),
		sensorType: z.string().nullable().optional().meta({
			description: 'Sensor type',
			example: 'HDC1080',
		}),
		lastMeasurement: z
			.object({
				createdAt: IsoDateTimeSchema.optional().meta({
					example: '2023-01-01T00:00:00.000Z',
				}),
				value: z.union([z.string(), z.number()]).nullable().optional().meta({
					example: '25.13',
				}),
			})
			.nullable()
			.optional(),
	})
	.meta({
		id: 'ApiSensor',
		description: 'Sensor belonging to a box/device.',
	})

export const DeviceSensorUpdateSchema = z
	.object({
		_id: z.string().optional().meta({
			description: 'Existing sensor id in legacy API format.',
			example: '60a13611a877b3001b8ffd59',
		}),
		id: z.string().optional().meta({
			description:
				'Existing sensor id. `_id` is used by the legacy API and is preferred for backwards compatibility.',
			example: '60a13611a877b3001b8ffd59',
		}),
		new: z
			.union([z.literal(true), z.literal('true')])
			.optional()
			.meta({
				description: 'Whether this sensor should be created as new.',
				example: true,
			}),
		edited: z
			.union([z.literal(true), z.literal('true')])
			.optional()
			.meta({
				description: 'Whether this sensor should be created or updated.',
				example: true,
			}),
		deleted: z
			.union([z.literal(true), z.literal('true')])
			.optional()
			.meta({
				description: 'Whether this sensor should be deleted.',
				example: true,
			}),
		title: z.string().optional().meta({
			example: 'PM10',
		}),
		unit: z.string().optional().meta({
			example: 'µg/m³',
		}),
		sensorType: z.string().optional().meta({
			example: 'SDS 011',
		}),
		icon: z.string().optional().meta({
			description: 'Visual representation of this sensor.',
			example: 'osem-thermometer',
		}),
	})
	.transform(({ id, ...sensor }) => ({
		...sensor,
		...((sensor._id ?? id) ? { _id: sensor._id ?? id } : {}),
	}))
	.meta({
		id: 'DeviceSensorUpdate',
		description: 'Sensor update or creation payload.',
	})

export type DeviceSensorUpdate = z.infer<typeof DeviceSensorUpdateSchema>

const ApiDeviceLocationFeatureSchema = z
	.object({
		type: z.literal('Feature'),
		geometry: TimestampedGeoJsonPointSchema,
	})
	.meta({
		id: 'ApiDeviceLocationFeature',
		description:
			'Device location feature whose coordinates are [longitude, latitude, height?].',
	})

export const DeviceAddonsUpdateSchema = z
	.object({
		add: z.string().optional().meta({
			description:
				'Addon to add to the device. The special value `feinstaub` may update the model and add PM sensors for compatible home models.',
			example: 'feinstaub',
		}),
	})
	.meta({
		id: 'DeviceAddonsUpdate',
		description: 'Legacy addon update payload.',
	})

export const ApiDeviceSchema = z
	.looseObject({
		_id: z.string().optional().meta({
			description: 'Unique device identifier in API format',
			example: 'clx1234567890abcdef',
		}),
		id: z.string().optional().meta({
			description: 'Unique device identifier',
			example: 'clx1234567890abcdef',
		}),
		name: z.string().optional().meta({
			description: 'Device name',
			example: 'My Weather Station',
		}),
		description: z.string().nullable().optional().meta({
			description: 'Device description',
			example: 'A weather monitoring station',
		}),
		image: z.string().nullable().optional().meta({
			description: 'Device image URL',
			example: 'https://example.com/image.jpg',
		}),
		link: z.string().nullable().optional().meta({
			description: 'Device website link',
			example: 'https://example.com',
		}),
		grouptag: z
			.array(z.string())
			.optional()
			.meta({
				description: 'Device group tags',
				example: ['weather', 'outdoor'],
			}),
		exposure: z.string().nullable().optional().meta({
			description: 'Device exposure type',
			example: 'outdoor',
		}),
		model: z.string().nullable().optional().meta({
			description: 'Device model',
			example: 'homeV2Wifi',
		}),
		latitude: LatitudeSchema.nullable().optional().meta({
			description: 'Device latitude',
			example: 52.520008,
		}),
		longitude: LongitudeSchema.nullable().optional().meta({
			description: 'Device longitude',
			example: 13.404954,
		}),
		height: HeightSchema.nullable().optional().meta({
			description:
				'Device height above sea level in meters. Kept as a legacy alias for heightAboveSeaLevel.',
			example: 66.6,
		}),
		heightAboveGround: HeightSchema.nullable().optional().meta({
			description:
				'User-provided device height above the local ground surface in meters.',
			example: 3.5,
		}),
		heightAboveSeaLevel: HeightSchema.nullable().optional().meta({
			description:
				'Device height above sea level in meters, calculated from terrainElevation and heightAboveGround. Null when either source value is unavailable.',
			example: 66.6,
		}),
		terrainElevation: HeightSchema.nullable().optional().meta({
			description:
				'Terrain elevation in meters returned by the elevation service.',
			example: 63.1,
		}),
		terrainElevationDataset: z.string().nullable().optional().meta({
			description:
				'GPXZ data source identifier from which terrainElevation was retrieved. Null when no terrain elevation is available.',
			example: 'germany_nrw_1m_dtm',
		}),
		useAuth: z.boolean().optional().meta({
			description: 'Whether the device requires authentication',
			example: true,
		}),
		public: z.boolean().optional().meta({
			description: 'Whether the device is public',
			example: false,
		}),
		status: z.string().nullable().optional().meta({
			description: 'Device status',
			example: 'inactive',
		}),
		createdAt: IsoDateTimeSchema.optional().meta({
			description: 'Device creation timestamp',
			example: '2024-01-15T10:30:00.000Z',
		}),
		updatedAt: IsoDateTimeSchema.optional().meta({
			description: 'Device last update timestamp',
			example: '2024-01-15T10:30:00.000Z',
		}),
		expiresAt: IsoDateTimeSchema.nullable().optional().meta({
			description: 'Device expiration date',
			example: '2024-12-31T23:59:59.000Z',
		}),
		userId: z.string().optional().meta({
			description: 'Owner user id',
			example: 'user_123456',
		}),
		sensorWikiModel: z.string().nullable().optional().meta({
			description: 'Sensor Wiki model identifier',
			example: 'homeV2Wifi',
		}),
		currentLocation: TimestampedGeoJsonPointSchema.optional().meta({
			description: 'Current location as GeoJSON Point-like object',
		}),
		lastMeasurementAt: IsoDateTimeSchema.nullable().optional().meta({
			description: 'Last measurement timestamp',
			example: '2023-01-01T00:00:00.000Z',
		}),
		loc: z.array(ApiDeviceLocationFeatureSchema).optional().meta({
			description: 'Location history as GeoJSON features',
		}),
		integrations: z
			.looseObject({})
			.optional()
			.meta({
				description: 'Device integrations',
				example: {
					mqtt: {
						enabled: false,
					},
				},
			}),
		sensors: z.array(ApiSensorSchema).optional().meta({
			description: 'Sensors belonging to this device',
		}),
	})
	.meta({
		id: 'ApiDevice',
		description:
			'Device object returned by the API. Additional fields may be included depending on the database model and API transformation.',
	})

export const DevicesResponseSchema = z.array(ApiDeviceSchema).meta({
	id: 'DevicesResponse',
	description: 'List of devices.',
})

export const DevicesGeoJsonResponseSchema = z
	.object({
		type: z.literal('FeatureCollection'),
		features: z.array(
			z.object({
				type: z.literal('Feature'),
				geometry: GeoJsonPointSchema,
				properties: ApiDeviceSchema,
			}),
		),
	})
	.meta({
		id: 'DevicesGeoJsonResponse',
		description:
			'GeoJSON FeatureCollection of devices. Returned when `format=geojson`.',
		example: {
			type: 'FeatureCollection',
			features: [
				{
					type: 'Feature',
					geometry: {
						type: 'Point',
						coordinates: [13.404954, 52.520008, 66.6],
					},
					properties: {
						id: 'clx1234567890abcdef',
						name: 'My Weather Station',
					},
				},
			],
		},
	})

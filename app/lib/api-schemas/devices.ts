import { z } from 'zod'
import {
	DeviceLocationInputSchema,
	HeightSchema,
	LatitudeSchema,
	LongitudeSchema,
} from '~/lib/openapi/schemas/location'
import { ElevationLookupConsentSchema } from '~/lib/openapi/schemas/consent'
import { ApiDeviceModelZodEnum } from '~/lib/device-enums'
import { getSensorTemplateValidationError } from '~/lib/model-definitions'
import { parseFiniteNumber } from '~/lib/numbers'

const CommaSeparatedStringArraySchema = z
	.union([z.string(), z.array(z.string())])
	.transform((values) =>
		(Array.isArray(values) ? values : [values]).flatMap((value) =>
			value
				.split(',')
				.map((entry) => entry.trim())
				.filter(Boolean),
		),
	)

const DeviceLocationArrayInputSchema = z
	.union([
		z.tuple([LongitudeSchema, LatitudeSchema]).meta({
			override: { minItems: 2, maxItems: 2, items: false },
		}),
		z
			.tuple([
				LongitudeSchema,
				LatitudeSchema,
				HeightSchema.meta({
					description:
						'Device height above the local ground surface in meters.',
					example: 3.5,
				}),
			])
			.meta({
				override: { minItems: 3, maxItems: 3, items: false },
			}),
	])
	.meta({
		description:
			'Coordinates as [longitude, latitude, height?], where height is above the local ground surface in meters.',
		example: [7.68123, 51.9123, 3.5],
	})

const LegacyBooleanSchema = z
	.union([z.boolean(), z.enum(['true', 'false'])])
	.transform((value) => value === true || value === 'true')

const parseQueryNumber = (value: string): number =>
	parseFiniteNumber(value) ?? Number.NaN

export const CreateDeviceSchema = z
	.object({
		// public API request shape
		name: z.string().min(1).max(100),
		description: z
			.string()
			.max(5000, 'Description should not exceed 5000 characters')
			.optional()
			.nullable(),
		exposure: z
			.enum(['indoor', 'outdoor', 'mobile', 'unknown'])
			.optional()
			.default('unknown'),
		location: z
			.union([DeviceLocationArrayInputSchema, DeviceLocationInputSchema])
			.transform((loc) => {
				if (Array.isArray(loc)) return loc
				return [
					loc.lng,
					loc.lat,
					...(loc.height !== undefined ? [loc.height] : []),
				]
			}),
		elevationLookupConsent: ElevationLookupConsentSchema.optional(),
		grouptag: CommaSeparatedStringArraySchema.optional(),
		tag: CommaSeparatedStringArraySchema.optional(),
		model: ApiDeviceModelZodEnum.optional().default('custom'),
		useAuth: LegacyBooleanSchema.optional(),
		sensorTemplates: CommaSeparatedStringArraySchema.optional(),
		mqtt: z.unknown().optional(),
		ttn: z.unknown().optional(),
		sharedBox: z.unknown().optional(),
		serialPort: z.unknown().optional(),
		soilDigitalPort: z.unknown().optional(),
		soundMeterPort: z.unknown().optional(),
		windSpeedPort: z.unknown().optional(),
		sensors: z
			.array(
				z.object({
					icon: z.string().optional(),
					title: z.string().min(1),
					unit: z.string().min(1),
					sensorType: z.string().min(1),
				}),
			)
			.optional()
			.default([]),
	})
	.transform(({ tag, ...data }) => ({
		...data,
		grouptag: data.grouptag ?? tag ?? [],
	}))
	.superRefine((data, ctx) => {
		if (data.sensors.length > 0 && data.model !== 'custom') {
			ctx.addIssue({
				code: 'custom',
				path: ['sensors'],
				message:
					'Parameters model and sensors cannot be specified at the same time.',
			})
			return
		}

		const sensorTemplateError = getSensorTemplateValidationError(
			data.model,
			data.sensorTemplates,
		)
		if (sensorTemplateError) {
			ctx.addIssue({
				code: 'custom',
				path: ['sensorTemplates'],
				message: sensorTemplateError,
			})
		}
	})

export const DevicesQuerySchema = z.object({
	format: z
		.enum(['json', 'geojson'], {
			error: () => "Format must be either 'json' or 'geojson'",
		})
		.default('json'),
	minimal: z
		.enum(['true', 'false'])
		.default('false')
		.transform((v) => v === 'true'),
	full: z
		.enum(['true', 'false'])
		.default('false')
		.transform((v) => v === 'true'),
	classify: z
		.enum(['true', 'false'])
		.optional()
		.transform((v) => v === 'true'),
	limit: z
		.string()
		.default('5')
		.transform((val) => parseInt(val, 10))
		.refine((val) => !isNaN(val), { message: 'Limit must be a number' })
		.refine((val) => val >= 1, { message: 'Limit must be at least 1' })
		.refine((val) => val <= 20, { message: 'Limit must not exceed 20' }),

	name: z.string().optional(),
	date: z
		.preprocess(
			(val) => {
				if (typeof val === 'string') return val.split(',')
				if (Array.isArray(val))
					return val.flatMap((entry) => String(entry).split(','))
				return val
			},
			z
				.array(
					z.string().refine((value) => Number.isFinite(Date.parse(value)), {
						message: 'Date must be a valid RFC3339 timestamp',
					}),
				)
				.min(1, 'At least one date required')
				.max(2, 'At most two dates allowed')
				.refine(
					([fromDate, toDate]) =>
						toDate === undefined || Date.parse(fromDate) <= Date.parse(toDate),
					{ message: 'The start date must not be after the end date' },
				)
				.transform((arr) => {
					const [fromDateStr, toDateStr] = arr
					const fromDate = new Date(fromDateStr)

					if (!toDateStr) {
						return {
							fromDate: new Date(fromDate.getTime() - 4 * 60 * 60 * 1000),
							toDate: new Date(fromDate.getTime() + 4 * 60 * 60 * 1000),
						}
					}

					const toDate = new Date(toDateStr)
					return { fromDate, toDate }
				}),
		)
		.optional(),
	phenomenon: z.string().optional(),
	grouptag: CommaSeparatedStringArraySchema.optional(),
	model: CommaSeparatedStringArraySchema.optional(),
	exposure: CommaSeparatedStringArraySchema.pipe(
		z.array(z.enum(['unknown', 'indoor', 'outdoor', 'mobile'])),
	).optional(),

	near: z
		.string()
		.transform((val) => val.split(',').map(parseQueryNumber))
		.refine(
			(coordinates) =>
				coordinates.length === 2 && coordinates.every(Number.isFinite),
			{
				message: "Invalid 'near' parameter format. Expected: 'lng,lat'",
			},
		)
		.transform((coordinates) => coordinates as [number, number])
		.refine(([lng, lat]) => Math.abs(lng) <= 180 && Math.abs(lat) <= 90, {
			message: "Invalid 'near' coordinates",
		})
		.optional(),

	maxDistance: z
		.string()
		.transform(parseQueryNumber)
		.refine(Number.isFinite, { message: 'maxDistance must be finite' })
		.refine((v) => v >= 0, { message: 'maxDistance must not be negative' })
		.optional(),

	bbox: z
		.string()
		.transform((val) => val.split(',').map(parseQueryNumber))
		.refine((coords) => coords.length === 4 && coords.every(Number.isFinite), {
			message: 'Invalid bbox parameter',
		})
		.refine(
			([swLng, swLat, neLng, neLat]) =>
				Math.abs(swLng) <= 180 &&
				Math.abs(neLng) <= 180 &&
				Math.abs(swLat) <= 90 &&
				Math.abs(neLat) <= 90,
			{ message: 'Bounding box coordinates are outside WGS84 bounds' },
		)
		.refine(
			([swLng, swLat, neLng, neLat]) => swLng !== neLng && swLat !== neLat,
			{ message: 'Bounding box must have a non-zero area' },
		)
		.transform((coords) => {
			const [swLng, swLat, neLng, neLat] = coords
			return {
				coordinates: [
					[
						[swLat, swLng],
						[neLat, swLng],
						[neLat, neLng],
						[swLat, neLng],
						[swLat, swLng],
					],
				],
			}
		})
		.optional(),

	fromDate: z
		.string()
		.datetime()
		.transform((v) => new Date(v))
		.optional(),
	toDate: z
		.string()
		.datetime()
		.transform((v) => new Date(v))
		.optional(),
})

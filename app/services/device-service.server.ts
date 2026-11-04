import { sql } from 'drizzle-orm'
import { z } from 'zod'
import { drizzleClient } from '~/db.server'
import {
	ArchivedDeviceError,
	createDevice as createDeviceInDb,
	deleteDevice as deleteDeviceById,
	updateDevice as updateDeviceById,
	type UpdateDeviceArgs,
} from '~/db/models/device.server'
import { verifyLogin } from '~/db/models/user.server'
import { type Device, type User } from '~/db/schema'
import { uploadedDeviceSchemaV1 } from '~/lib/device-schemas/device-schema-v1'
import { deleteDeviceImage } from '~/lib/s3.server'

export const CreateDeviceServiceSchema = z
	.object({
		name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
		description: z
			.string()
			.max(5000, 'Description should not exceed 5000 characters')
			.optional()
			.nullable(),
		exposure: z
			.enum(['indoor', 'outdoor', 'mobile', 'unknown'])
			.optional()
			.default('unknown'),
		expiresAt: z.string().optional().nullable(),
		tags: z.array(z.string()).optional().default([]),
		latitude: z.number(),
		longitude: z.number(),
		heightAboveGround: z.number().optional().nullable(),
		terrainElevation: z.number().optional().nullable(),
		terrainElevationDataset: z.string().optional().nullable(),
		model: z
			.enum([
				'homeV2Lora',
				'homeV2Ethernet',
				'homeV2Wifi',
				'senseBox:Edu',
				'luftdaten.info',
				'custom',
			])
			.optional(),
		sensorTemplates: z.array(z.string()).optional(),
		sensors: z
			.array(
				z.object({
					title: z.string().min(1, 'Sensor title is required'),
					unit: z.string().min(1, 'Sensor unit is required'),
					sensorType: z.string().min(1, 'Sensor type is required'),
					icon: z.string().optional(),
				}),
			)
			.optional(),
		deviceSchema: uploadedDeviceSchemaV1.optional(),
		deviceSchemaVersionId: z.string().optional(),
	})
	.refine((data) => !(data.model && data.sensors && data.model !== 'custom'), {
		message: 'Model and sensors cannot be specified at the same time.',
		path: ['sensors'],
	})

export type CreateDeviceServiceInput = z.infer<typeof CreateDeviceServiceSchema>

export const createDevice = async (
	userId: User['id'],
	input: CreateDeviceServiceInput,
): Promise<Device> => {
	const validated = CreateDeviceServiceSchema.parse({
		...input,
		description: input.description?.trim() || null,
	})

	return createDeviceInDb(validated, userId)
}

export const BoxesQuerySchema = z.object({
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
				if (typeof val === 'string') return [val]
				if (Array.isArray(val)) return val
				return val
			},
			z
				.array(z.string())
				.min(1, 'At least one date required')
				.max(2, 'At most two dates allowed')
				.transform((arr) => {
					const [fromDateStr, toDateStr] = arr
					const fromDate = new Date(fromDateStr)
					if (isNaN(fromDate.getTime()))
						throw new Error(`Invalid date: ${fromDateStr}`)

					if (!toDateStr) {
						return {
							fromDate: new Date(fromDate.getTime() - 4 * 60 * 60 * 1000),
							toDate: new Date(fromDate.getTime() + 4 * 60 * 60 * 1000),
						}
					}

					const toDate = new Date(toDateStr)
					if (isNaN(toDate.getTime()))
						throw new Error(`Invalid date: ${toDateStr}`)
					return { fromDate, toDate }
				}),
		)
		.optional(),
	phenomenon: z.string().optional(),
	grouptag: z
		.string()
		.transform((v) => [v])
		.optional(),
	model: z
		.string()
		.transform((v) => [v])
		.optional(),
	exposure: z
		.string()
		.transform((v) => [v])
		.optional(),

	near: z
		.string()
		.regex(/^[-+]?\d+(\.\d+)?,[-+]?\d+(\.\d+)?$/, {
			message: "Invalid 'near' parameter format. Expected: 'lat,lng'",
		})
		.transform((val) => val.split(',').map(Number) as [number, number])
		.optional(),

	maxDistance: z
		.string()
		.transform((v) => Number(v))
		.optional(),

	bbox: z
		.string()
		.transform((val) => {
			const coords = val.split(',').map(Number)
			if (coords.length !== 4 || coords.some((n) => isNaN(n))) {
				throw new Error('Invalid bbox parameter')
			}
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
//   .refine(
//     (data) =>
//       !(data.date && !data.phenomenon) && !(data.phenomenon && !data.date),
//     {
//       message: "Date and phenomenon must be used together",
//       path: ["date"],
//     }
//   );

export type BoxesQueryParams = z.infer<typeof BoxesQuerySchema>

export function assertDeviceIsWritable(
	device: Pick<Device, 'id' | 'archivedAt'>,
): void {
	if (device.archivedAt) {
		throw new ArchivedDeviceError(device.id)
	}
}

/**
 * Updates a device after verifying the user is entitled (device owner).
 *
 * @param user   The user performing the update
 * @param device The device to update (must belong to user)
 * @param args   Update payload
 * @returns The updated device, or "unauthorized" if not entitled
 */
export const updateDevice = async (
	userId: User['id'],
	device: Device,
	args: UpdateDeviceArgs,
): Promise<Device | 'unauthorized' | 'archived'> => {
	if (device.userId !== userId) return 'unauthorized'
	assertDeviceIsWritable(device)

	return updateDeviceById(device.id, args)
}
/**
 * Deletes a device after verifiying that the user is entitled by checking
 * the password.
 * @param user The user deleting the device
 * @param password The users password to verify
 * @returns True if the device was deleted, otherwise false or "unauthorized"
 * if the user is not entitled to delete the device with the given parameters
 */
export const deleteDevice = async (
	user: User,
	device: Device,
	password: string,
): Promise<boolean | 'unauthorized'> => {
	const verifiedUser = await verifyLogin(user.email, password)
	if (verifiedUser === null) return 'unauthorized'

	if (device.image) {
		try {
			await deleteDeviceImage(device.image)
		} catch (e) {
			console.error('Failed to delete device image:', e)
		}
	}
	return (await deleteDeviceById({ id: device.id })).count > 0
}

type TagsRow = {
	tags: string[]
}

/**
 * Queries the database for a distinct list of all tags known to the
 * application across all registered devices.
 * @returns An array containing the names of the tags or an empty array if there are none
 */
export const getTags = async function findTags(): Promise<string[]> {
	const result = await drizzleClient.execute<TagsRow>(
		sql`
			SELECT COALESCE(array_agg(DISTINCT u.val ORDER BY u.val), ARRAY[]::text[]) AS tags
			FROM device d
			CROSS JOIN LATERAL unnest(d.tags) AS u(val);
		`,
	)

	return result[0]?.tags ?? []
}

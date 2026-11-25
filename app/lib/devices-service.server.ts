import { z } from 'zod'
import { deleteDeviceIntegrations } from '~/lib/integration-service.server'
import {
	ArchivedDeviceError,
	createDevice as createDeviceInDb,
	deleteDevice as deleteDeviceById,
	updateDevice as updateDeviceById,
	type UpdateDeviceArgs,
} from '~/models/device.server'
import { verifyLogin } from '~/models/user.server'
import { type Device, type User } from '~/schema'
import { deleteDeviceImage } from '~/utils/s3.server'

export const CreateBoxSchema = z.object({
  // public API request shape
  name: z.string().min(1).max(100),
  description: z
    .string()
    .max(5000, 'Description should not exceed 5000 characters')
    .optional()
    .nullable(),
  exposure: z.enum(['indoor', 'outdoor', 'mobile', 'unknown']).optional().default('unknown'),
  location: z
    .union([
      z.array(z.number()).min(2).max(3),
      z.object({
        lng: z.number(),
        lat: z.number(),
        height: z.number().optional(),
      }),
    ])
    .transform((loc) => {
      if (Array.isArray(loc)) return loc
      return [loc.lng, loc.lat, ...(loc.height ? [loc.height] : [])]
    }),
  grouptag: z.array(z.string()).optional().default([]),
  model: z
    .enum([
      'homeV2Lora',
      'homeV2Ethernet',
      'homeV2Wifi',
      'senseBox:Edu',
      'luftdaten.info',
      'custom',
    ])
    .optional()
    .default('custom'),
  sensors: z
    .array(
      z.object({
        id: z.string(),
        icon: z.string().optional(),
        title: z.string().min(1),
        unit: z.string().min(1),
        sensorType: z.string().min(1),
      }),
    )
    .optional()
    .default([]),
})

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
  })
  .refine(
    (data) => !(data.model && data.sensors && data.model !== 'custom'),
    {
      message: 'Model and sensors cannot be specified at the same time.',
      path: ['sensors'],
    },
  )

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
			errorMap: () => ({
				message: "Format must be either 'json' or 'geojson'",
			}),
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
 * Deletes a device and its integrations after checking ownership and password.
 */
export const deleteDevice = async (
	user: Pick<User, 'id' | 'email'>,
	device: Pick<Device, 'id' | 'userId' | 'image'>,
	password: string,
): Promise<
	boolean | 'unauthorized' | 'forbidden' | 'integration-cleanup-failed'
> => {
	if (device.userId !== user.id) return 'forbidden'

	const verifiedUser = await verifyLogin(user.email, password)
	if (verifiedUser?.id !== user.id) return 'unauthorized'

	try {
		const failures = (await deleteDeviceIntegrations(device.id)).filter(
			(result) => result.status === 'failed',
		)
		if (failures.length > 0) {
			console.error('Failed to delete device integrations', {
				deviceId: device.id,
				failures,
			})
			return 'integration-cleanup-failed'
		}
	} catch (error) {
		console.error('Failed to check device integrations', {
			deviceId: device.id,
			error,
		})
		return 'integration-cleanup-failed'
	}

	if (device.image) {
		try {
			await deleteDeviceImage(device.image)
		} catch (e) {
			console.error('Failed to delete device image:', e)
		}
	}
	return (await deleteDeviceById({ id: device.id })).count > 0
}

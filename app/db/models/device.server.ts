import { point } from '@turf/helpers'
import {
	eq,
	sql,
	asc,
	desc,
	ilike,
	arrayContains,
	and,
	between,
	isNull,
	type ExtractTablesWithRelations,
	isNotNull,
	type SQL,
	gte,
	lt,
	lte,
	exists,
	inArray,
} from 'drizzle-orm'
import { alias, type PgTransaction } from 'drizzle-orm/pg-core'
import { type PostgresJsQueryResultHKT } from 'drizzle-orm/postgres-js'
import { type Point } from 'geojson'
import {
	device,
	deviceToLocation,
	location,
	measurement,
	sensor,
	user,
	type Device,
	type Sensor,
} from '~/db/schema'
import type * as schema from '~/db/schema/index'
import { drizzleClient } from '~/db.server'
import BaseNewDeviceEmail, {
	messages as BaseNewDeviceMessages,
} from '~/emails/base-new-device'
import { messages as NewLufdatenDeviceMessages } from '~/emails/new-device-luftdaten'
import { messages as NewSenseboxDeviceMessages } from '~/emails/new-device-sensebox'
import { createDeviceApiKey } from '~/lib/jwt'
import { sendMail } from '~/lib/mail.server'
import { getSensorsForModel } from '~/lib/model-definitions'
import {
	createOrReusePrivateDeviceSchemaVersionFromUpload,
	getVisibleDeviceSchemaVersionForCreation,
} from './device-schema.server'
import { calculatedDeviceHeightAboveSeaLevel } from './device-height'
import { toGeoJsonPosition } from '~/lib/location'

const BASE_DEVICE_COLUMNS = {
	id: true,
	name: true,
	description: true,
	image: true,
	website: true,
	link: true,
	tags: true,
	exposure: true,
	model: true,
	latitude: true,
	longitude: true,
	heightAboveGround: true,
	terrainElevation: true,
	terrainElevationDataset: true,
	status: true,
	createdAt: true,
	updatedAt: true,
	archivedAt: true,
	orphanedAt: true,
	expiresAt: true,
	useAuth: true,
	apiKey: true,
	sensorWikiModel: true,
	public: true,
	userId: true,
	deviceSchemaVersionId: true,
} as const

const DEVICE_COLUMNS_WITH_SENSORS = {
	...BASE_DEVICE_COLUMNS,
	heightAboveGround: false,
	terrainElevation: false,
	terrainElevationDataset: false,
} as const

export class DeviceUpdateError extends Error {
	constructor(
		message: string,
		public statusCode: number = 400,
	) {
		super(message)
		this.name = 'DeviceUpdateError'
	}
}

export class ArchivedDeviceError extends Error {
	constructor(deviceId?: string) {
		super(
			deviceId
				? `Device ${deviceId} is archived and read-only`
				: 'Archived devices are read-only',
		)
		this.name = 'ArchivedDeviceError'
	}
}

export function assertDeviceIsMutable(
	device: Pick<Device, 'id' | 'archivedAt'>,
) {
	if (device.archivedAt) {
		throw new ArchivedDeviceError(device.id)
	}
}

export function getDevice({ id }: Pick<Device, 'id'>) {
	return drizzleClient.query.device.findFirst({
		where: (device, { eq }) => eq(device.id, id),
		columns: BASE_DEVICE_COLUMNS,
		with: {
			user: {
				columns: {
					id: true,
				},
			},
			logEntries: {
				where: (entry, { eq }) => eq(entry.public, true),
				orderBy: (entry, { desc }) => [desc(entry.createdAt)],
				columns: {
					id: true,
					content: true,
					createdAt: true,
					public: true,
					deviceId: true,
				},
			},
			locations: {
				// https://github.com/drizzle-team/drizzle-orm/pull/2778
				// with: {
				//   geometry: true
				// },
				columns: {
					// time: true,
				},
				extras: {
					time: sql<Date>`time`.as('time'),
				},
				with: {
					geometry: {
						columns: {
							heightAboveGround: true,
						},
						extras: {
							x: sql<number>`ST_X(${location.location})`.as('x'),
							y: sql<number>`ST_Y(${location.location})`.as('y'),
						},
					},
				},
				// limit: 1000,
			},
			sensors: true,
		},
	})
}

export type DeviceForMeasurementWrite = Awaited<
	ReturnType<typeof getDeviceForMeasurementWrite>
>

export type DeviceForSingleMeasurementWrite = Awaited<
	ReturnType<typeof getDeviceForSingleMeasurementWrite>
>

export function getDeviceForMeasurementWrite({ id }: Pick<Device, 'id'>) {
	return drizzleClient.query.device.findFirst({
		where: (device, { eq }) => eq(device.id, id),
		columns: {
			id: true,
			archivedAt: true,
			useAuth: true,
			apiKey: true,
		},
		with: {
			sensors: {
				columns: {
					id: true,
					title: true,
					sensorType: true,
				},
			},
		},
	})
}

export async function getDeviceForSingleMeasurementWrite({
	id,
	sensorId,
}: Pick<Device, 'id'> & { sensorId: string }) {
	const prepared = await drizzleClient
		.select({
			id: device.id,
			archivedAt: device.archivedAt,
			useAuth: device.useAuth,
			apiKey: device.apiKey,
			sensorId: sensor.id,
		})
		.from(device)
		.leftJoin(
			sensor,
			and(
				eq(sensor.deviceId, device.id),
				eq(sensor.id, sql.placeholder('sensorId')),
			),
		)
		.where(eq(device.id, sql.placeholder('deviceId')))
		.limit(1)
		.prepare('getDeviceForSingleMeasurementWrite')

	const [row] = await prepared.execute({ deviceId: id, sensorId: sensorId })

	if (!row) return undefined

	return {
		id: row.id,
		archivedAt: row.archivedAt,
		useAuth: row.useAuth,
		apiKey: row.apiKey,
		sensors: row.sensorId ? [{ id: row.sensorId }] : [],
	}
}

export function getUserDevice({ id, userId }: Pick<Device, 'id' | 'userId'>) {
	return drizzleClient.query.device.findFirst({
		where: (d, { and, eq }) => and(eq(d.id, id), eq(d.userId, userId)),
		columns: {
			id: true,
			name: true,
			description: true,
			exposure: true,
			image: true,
			tags: true,
			website: true,
			updatedAt: true,
			latitude: true,
			longitude: true,
			userId: true,
		},
	})
}

export function getLocations(
	{ id }: Pick<Device, 'id'>,
	fromDate: Date,
	toDate: Date,
) {
	return drizzleClient
		.select({
			time: deviceToLocation.time,
			x: sql<number>`ST_X(${location.location})`.as('x'),
			y: sql<number>`ST_Y(${location.location})`.as('y'),
			heightAboveGround: location.heightAboveGround,
		})
		.from(location)
		.innerJoin(deviceToLocation, eq(deviceToLocation.locationId, location.id))
		.where(
			and(
				eq(deviceToLocation.deviceId, id),
				between(deviceToLocation.time, fromDate, toDate),
			),
		)
		.orderBy(asc(deviceToLocation.time))
}
export function getDeviceWithoutSensors({ id }: Pick<Device, 'id'>) {
	return drizzleClient.query.device.findFirst({
		where: (device, { eq }) => eq(device.id, id),
		columns: {
			id: true,
			name: true,
			description: true,
			exposure: true,
			image: true,
			tags: true,
			website: true,
			link: true,
			createdAt: true,
			updatedAt: true,
			latitude: true,
			longitude: true,
			heightAboveGround: true,
			userId: true,
			useAuth: true,
			model: true,
			apiKey: true,
			deviceSchemaVersionId: true,
		},
	})
}

export async function deviceExists({ id }: Pick<Device, 'id'>) {
	const [existingDevice] = await drizzleClient
		.select({ id: device.id })
		.from(device)
		.where(eq(device.id, id))
		.limit(1)

	return existingDevice !== undefined
}

export async function detachDeviceSchema({
	id,
	userId,
}: Pick<Device, 'id' | 'userId'>) {
	const [existingDevice] = await drizzleClient
		.select()
		.from(device)
		.where(and(eq(device.id, id), eq(device.userId, userId)))
		.limit(1)

	if (!existingDevice) {
		throw new DeviceUpdateError(`Device ${id} not found`, 404)
	}

	assertDeviceIsMutable(existingDevice)

	const tags = (existingDevice.tags ?? []).filter(
		(tag) => !tag.startsWith('schema:'),
	)

	const [updatedDevice] = await drizzleClient
		.update(device)
		.set({
			tags,
			deviceSchemaVersionId: null,
			updatedAt: sql`NOW()`,
		})
		.where(and(eq(device.id, id), eq(device.userId, userId)))
		.returning()

	if (!updatedDevice) {
		throw new DeviceUpdateError(`Device ${id} not found`, 404)
	}

	return updatedDevice
}

export type DeviceWithoutSensors = Awaited<
	ReturnType<typeof getDeviceWithoutSensors>
>

export function getDeviceLocationForEdit({ id }: Pick<Device, 'id'>) {
	return drizzleClient.query.device.findFirst({
		where: (device, { eq }) => eq(device.id, id),
		columns: {
			id: true,
			latitude: true,
			longitude: true,
			heightAboveGround: true,
			terrainElevation: true,
			terrainElevationDataset: true,
			userId: true,
		},
	})
}

export async function updateDeviceLocation({
	id,
	latitude,
	longitude,
	heightAboveGround,
	terrainElevation,
	terrainElevationDataset,
}: Pick<
	Device,
	| 'id'
	| 'latitude'
	| 'longitude'
	| 'heightAboveGround'
	| 'terrainElevation'
	| 'terrainElevationDataset'
>) {
	const [existingDevice] = await drizzleClient
		.select({ id: device.id, archivedAt: device.archivedAt })
		.from(device)
		.where(eq(device.id, id))
		.limit(1)

	if (!existingDevice) {
		throw new DeviceUpdateError(`Device ${id} not found`, 404)
	}

	assertDeviceIsMutable(existingDevice)

	return drizzleClient
		.update(device)
		.set({
			latitude,
			longitude,
			heightAboveGround,
			terrainElevation,
			terrainElevationDataset,
			updatedAt: sql`NOW()`,
		})
		.where(eq(device.id, id))
}

export type UpdateDeviceArgs = {
	name?: string
	exposure?: string
	grouptag?: string | string[]
	description?: string
	website?: string
	link?: string
	image?: string
	model?: string
	useAuth?: boolean
	generateAccessToken?: boolean
	location?: {
		lat: number
		lng: number
		heightAboveGround?: number | null
		terrainElevation?: number | null
		terrainElevationDataset?: string | null
	}
	sensors?: SensorUpdateArgs[]
}

type SensorUpdateArgs = {
	_id?: string
	title?: string
	unit?: string
	sensorType?: string
	icon?: string
	deleted?: any
	edited?: any
	new?: any
}

export async function updateDevice(
	deviceId: string,
	args: UpdateDeviceArgs,
): Promise<Device> {
	const result = await drizzleClient.transaction(async (tx) => {
		const [existingDevice] = await tx
			.select()
			.from(device)
			.where(eq(device.id, deviceId))
			.limit(1)

		if (!existingDevice) {
			throw new DeviceUpdateError(`Device ${deviceId} not found`, 404)
		}

		assertDeviceIsMutable(existingDevice)

		const setColumns: Record<string, any> = {}
		const updatableFields: (keyof UpdateDeviceArgs)[] = [
			'name',
			'exposure',
			'description',
			'website',
			'image',
			'model',
			'useAuth',
			'link',
		]

		for (const field of updatableFields) {
			if (args[field] !== undefined) {
				if (
					(field === 'description' || field === 'link' || field === 'image') &&
					args[field] === ''
				) {
					setColumns[field] = null
				} else {
					setColumns[field] = args[field]
				}
			}
		}

		if ('grouptag' in args) {
			if (Array.isArray(args.grouptag)) {
				setColumns['tags'] = args.grouptag.length === 0 ? null : args.grouptag
			} else if (args.grouptag != null) {
				setColumns['tags'] = args.grouptag === '' ? null : [args.grouptag]
			} else {
				setColumns['tags'] = null
			}
		}

		if (args.location) {
			const {
				lat,
				lng,
				heightAboveGround,
				terrainElevation,
				terrainElevationDataset,
			} = args.location
			const pointWKT = `POINT(${lng} ${lat})`

			const [existingLocation] = await tx
				.select()
				.from(location)
				.where(
					sql`ST_Equals(${location.location}, ST_GeomFromText(${pointWKT}, 4326))
						AND ${location.heightAboveGround} IS NOT DISTINCT FROM ${heightAboveGround ?? null}`,
				)
				.limit(1)

			let locationId: bigint

			if (existingLocation) {
				locationId = existingLocation.id
			} else {
				const [newLocation] = await tx
					.insert(location)
					.values({
						location: sql`ST_GeomFromText(${pointWKT}, 4326)`,
						heightAboveGround: heightAboveGround ?? null,
					})
					.returning()

				if (!newLocation) {
					throw new Error('Failed to create location')
				}

				locationId = newLocation.id
			}

			await tx
				.insert(deviceToLocation)
				.values({
					deviceId,
					locationId,
					time: sql`NOW()`,
				})
				.onConflictDoNothing()

			setColumns['latitude'] = lat
			setColumns['longitude'] = lng
			if (heightAboveGround !== undefined) {
				setColumns['heightAboveGround'] = heightAboveGround
			}
			if (terrainElevation !== undefined) {
				setColumns['terrainElevation'] = terrainElevation
				setColumns['terrainElevationDataset'] =
					terrainElevation === null ? null : (terrainElevationDataset ?? null)
			} else if (terrainElevationDataset !== undefined) {
				setColumns['terrainElevationDataset'] = terrainElevationDataset
			}
		}

		let updatedDevice = existingDevice

		if (Object.keys(setColumns).length > 0) {
			;[updatedDevice] = await tx
				.update(device)
				.set({ ...setColumns, updatedAt: sql`NOW()` })
				.where(eq(device.id, deviceId))
				.returning()

			if (!updatedDevice) {
				throw new DeviceUpdateError(`Device ${deviceId} not found`, 404)
			}
		}

		if (args.sensors?.length) {
			const existingSensors = await tx
				.select()
				.from(sensor)
				.where(eq(sensor.deviceId, deviceId))
			const existingSensorIds = new Set(
				existingSensors.map((existing) => existing.id),
			)

			const sensorsToDelete = new Set(
				args.sensors
					.filter(
						(s) =>
							s.deleted === true &&
							s._id !== undefined &&
							existingSensorIds.has(s._id),
					)
					.map((s) => s._id as string),
			)
			const remainingSensorCount = existingSensors.length - sensorsToDelete.size

			if (sensorsToDelete.size > 0 && remainingSensorCount < 1) {
				throw new DeviceUpdateError(
					'Unable to delete sensor(s). A box needs at least one sensor.',
				)
			}

			let nextSensorOrder =
				Math.max(...existingSensors.map((sensor) => sensor.order ?? -1)) + 1

			for (const s of args.sensors) {
				const isDeleted = s.deleted === true
				const isEdited = s.edited === true
				const isNew = s.new === true
				const sensorExists = Boolean(s._id && existingSensorIds.has(s._id))

				if (sensorExists && isDeleted && s._id) {
					await tx.delete(sensor).where(eq(sensor.id, s._id))
				} else if (isEdited && isNew && !sensorExists) {
					if (!s.title || !s.unit || !s.sensorType) {
						throw new DeviceUpdateError(
							'New sensor requires title, unit, and sensorType',
						)
					}

					await tx.insert(sensor).values({
						title: s.title,
						unit: s.unit,
						sensorType: s.sensorType,
						icon: s.icon,
						deviceId,
						order: nextSensorOrder,
					})
					nextSensorOrder += 1
				} else if (sensorExists && isEdited && s._id) {
					if (!s.title || !s.unit || !s.sensorType) {
						throw new DeviceUpdateError(
							'Editing sensor requires all properties: _id, title, unit, sensorType, icon',
						)
					}

					await tx
						.update(sensor)
						.set({
							title: s.title,
							unit: s.unit,
							sensorType: s.sensorType,
							icon: s.icon,
							updatedAt: sql`NOW()`,
						})
						.where(eq(sensor.id, s._id))
				} else if (!sensorExists) {
					throw new DeviceUpdateError(
						`Sensor with id ${s._id} not found for ${isDeleted ? 'deletion' : 'editing'}.`,
						404,
					)
				}
			}
		}

		if (args.generateAccessToken === true) {
			const { apiKey } = await addOrReplaceDeviceApiKey(updatedDevice, tx)
			updatedDevice = { ...updatedDevice, apiKey }
		} else if (args.useAuth === true && !updatedDevice.apiKey) {
			const { apiKey } = await addOrReplaceDeviceApiKey(updatedDevice, tx)
			updatedDevice = { ...updatedDevice, apiKey }
		}

		return updatedDevice
	})

	return result
}

export function deleteDevice({ id }: Pick<Device, 'id'>) {
	return drizzleClient.delete(device).where(eq(device.id, id))
}

export function deleteUserDevice({
	id,
	userId,
}: Pick<Device, 'id' | 'userId'>) {
	return drizzleClient
		.delete(device)
		.where(and(eq(device.id, id), eq(device.userId, userId)))
}

export function getUserDevices(
	userId: Device['userId'],
	options: { limit?: number; offset?: number } = {},
) {
	return drizzleClient.query.device.findMany({
		where: (device, { eq }) => eq(device.userId, userId),
		orderBy: (device, { asc }) => [asc(device.createdAt)],
		columns: DEVICE_COLUMNS_WITH_SENSORS,
		extras: {
			heightAboveSeaLevel: calculatedDeviceHeightAboveSeaLevel().as(
				'height_above_sea_level',
			),
		},
		with: {
			sensors: true,
		},
		...(options.limit !== undefined && { limit: options.limit }),
		...(options.offset !== undefined && { offset: options.offset }),
	})
}

export function getUserDeviceLocations(userId: Device['userId']) {
	return drizzleClient.query.device.findMany({
		where: (device, { and, eq, isNull }) =>
			and(eq(device.userId, userId), isNull(device.archivedAt)),
		columns: {
			id: true,
			latitude: true,
			longitude: true,
		},
	})
}

export function getUserDeviceIds(userId: Device['userId']) {
	return drizzleClient.query.device
		.findMany({
			where: (device, { eq }) => eq(device.userId, userId),
			columns: { id: true },
		})
		.then((d) => d.map((d) => d.id))
}

type DevicesFormat = 'json' | 'geojson'

type DeviceMapProperties = Pick<
	Device,
	'id' | 'name' | 'latitude' | 'longitude' | 'exposure' | 'tags'
> & {
	heightAboveSeaLevel: number | null
	status: Device['status']
}

type DeviceListItem = DeviceMapProperties & Pick<Device, 'createdAt'>

// Extract the cached ISO timestamp from sensor.lastMeasurement JSON as a
// PostgreSQL timestamp so it can be compared and aggregated in SQL.
const cachedLastMeasurementAt = sql<Date | null>`
	(${sensor.lastMeasurement}->>'createdAt')::timestamptz
`

const deriveDeviceStatus = (lastMeasurementAt: SQL) => sql<Device['status']>`
	CASE
		WHEN ${lastMeasurementAt} > now() - interval '7 days' THEN 'active'::status
		WHEN ${lastMeasurementAt} > now() - interval '30 days' THEN 'inactive'::status
		ELSE 'old'::status
	END
`

export async function getDevices(format: 'json'): Promise<DeviceListItem[]>
export async function getDevices(
	format: 'geojson',
): Promise<GeoJSON.FeatureCollection<Point, DeviceMapProperties>>
export async function getDevices(
	format?: DevicesFormat,
): Promise<
	DeviceListItem[] | GeoJSON.FeatureCollection<Point, DeviceMapProperties>
>

export async function getDevices(format: DevicesFormat = 'json') {
	const latestMeasurementAt = sql<Date | null>`max(${cachedLastMeasurementAt})`
	const rows = await drizzleClient
		.select({
			device: {
				id: device.id,
				name: device.name,
				latitude: device.latitude,
				longitude: device.longitude,
				heightAboveSeaLevel: calculatedDeviceHeightAboveSeaLevel(),
				exposure: device.exposure,
				createdAt: device.createdAt,
				tags: device.tags,
			},
			status: deriveDeviceStatus(latestMeasurementAt),
		})
		.from(device)
		.leftJoin(sensor, eq(sensor.deviceId, device.id))
		.where(isNull(device.archivedAt))
		.groupBy(device.id)

	const devices = rows.map((row) => ({
		...row.device,
		status: row.status,
	}))

	if (format === 'geojson') {
		const geojson: GeoJSON.FeatureCollection<Point> = {
			type: 'FeatureCollection',
			features: [],
		}

		for (const device of devices) {
			const coordinates = toGeoJsonPosition(
				device.longitude,
				device.latitude,
				device.heightAboveSeaLevel,
			)
			const feature = point(coordinates, device)
			geojson.features.push(feature)
		}

		return geojson
	}

	return devices
}

export async function getArchivedDevices() {
	const devices = await drizzleClient.query.device.findMany({
		where: (device) => isNotNull(device.archivedAt),
		columns: {
			id: true,
			name: true,
			latitude: true,
			longitude: true,
			exposure: true,
			status: true,
			createdAt: true,
			tags: true,
			archivedAt: true,
		},
		extras: {
			heightAboveSeaLevel: calculatedDeviceHeightAboveSeaLevel().as(
				'height_above_sea_level',
			),
		},
	})
	return devices
}

export type MeasurementTimeRange = {
	from: Date
	to: Date
}

export async function getDevicesWithSensors(options?: {
	measurementTimeRange?: MeasurementTimeRange
}) {
	// exclude archived devices always
	const conditions: SQL[] = [isNull(device.archivedAt)]

	if (options?.measurementTimeRange) {
		const sFilter = alias(sensor, 's_filter')
		const mFilter = alias(measurement, 'm_filter')

		const measurementsExistForDevice = drizzleClient
			.select({ one: sql`1` })
			.from(sFilter)
			.innerJoin(mFilter, eq(mFilter.sensorId, sFilter.id))
			.where(
				and(
					eq(sFilter.deviceId, device.id),
					gte(mFilter.time, options.measurementTimeRange.from),
					lt(mFilter.time, options.measurementTimeRange.to),
				),
			)

		conditions.push(exists(measurementsExistForDevice))
	}

	const rows = await drizzleClient
		.select({
			device: {
				id: device.id,
				name: device.name,
				latitude: device.latitude,
				longitude: device.longitude,
				heightAboveSeaLevel: calculatedDeviceHeightAboveSeaLevel(),
				exposure: device.exposure,
				tags: device.tags,
			},
			// Keep one result row per sensor, but calculate the newest cached sensor
			// measurement across the device and derive the same status on every row.
			status: deriveDeviceStatus(
				sql`max(${cachedLastMeasurementAt}) over (partition by ${device.id})`,
			),
			sensor: {
				id: sensor.id,
				title: sensor.title,
				sensorWikiPhenomenon: sensor.sensorWikiPhenomenon,
				lastMeasurement: sensor.lastMeasurement,
			},
		})
		.from(device)
		.leftJoin(sensor, eq(sensor.deviceId, device.id))
		.where(and(...conditions))

	const geojson: GeoJSON.FeatureCollection<Point, any> = {
		type: 'FeatureCollection',
		features: [],
	}

	type PartialSensor = Pick<
		Sensor,
		'id' | 'title' | 'sensorWikiPhenomenon' | 'lastMeasurement'
	>

	const deviceMap = new Map<
		string,
		{ device: DeviceMapProperties & { sensors: PartialSensor[] } }
	>()

	const resultArray: Array<{
		device: DeviceMapProperties & { sensors: PartialSensor[] }
	}> = rows.reduce(
		(acc, row) => {
			const currentDevice = { ...row.device, status: row.status }
			const currentSensor = row.sensor

			if (!deviceMap.has(currentDevice.id)) {
				const newDevice = {
					device: {
						...currentDevice,
						sensors: currentSensor ? [currentSensor] : [],
					},
				}

				deviceMap.set(currentDevice.id, newDevice)
				acc.push(newDevice)
			} else if (currentSensor) {
				deviceMap.get(currentDevice.id)!.device.sensors.push(currentSensor)
			}

			return acc
		},
		[] as Array<{
			device: DeviceMapProperties & { sensors: PartialSensor[] }
		}>,
	)

	for (const result of resultArray) {
		const coordinates = toGeoJsonPosition(
			result.device.longitude,
			result.device.latitude,
			result.device.heightAboveSeaLevel,
		)
		const feature = point(coordinates, result.device)
		geojson.features.push(feature)
	}

	return geojson
}

interface BuildWhereClauseOptions {
	name?: string
	phenomenon?: string
	fromDate?: string | Date
	toDate?: string | Date
	bbox?: {
		coordinates: (number | undefined)[][][]
	}
	near?: [number, number] // [lng, lat]
	maxDistance?: number
	grouptag?: string[]
	exposure?: string[]
	model?: string[]
}

export interface FindDevicesOptions extends BuildWhereClauseOptions {
	minimal?: string | boolean
	full?: string | boolean
	classify?: boolean
	limit?: number
	format?: 'json' | 'geojson'
}

interface WhereClauseResult {
	includeColumns: Record<string, any>
	whereClause: any[]
}

const buildWhereClause = function buildWhereClause(
	opts: BuildWhereClauseOptions = {},
): WhereClauseResult {
	const {
		name,
		phenomenon,
		fromDate,
		toDate,
		bbox,
		near,
		maxDistance,
		grouptag,
	} = opts
	const clause = []
	const columns: Record<string, any> = {}

	if (name) {
		clause.push(ilike(device.name, `%${name}%`))
	}

	if (phenomenon) {
		columns['sensors'] = {
			where: ilike(sensor.title, `%${phenomenon}%`),
		}

		const sensorConditions: SQL[] = [
			eq(sensor.deviceId, device.id),
			ilike(sensor.title, `%${phenomenon}%`),
		]
		let matchingSensors = drizzleClient
			.select({ id: sensor.id })
			.from(sensor)
			.$dynamic()

		if (fromDate || toDate) {
			matchingSensors = matchingSensors.innerJoin(
				measurement,
				eq(measurement.sensorId, sensor.id),
			)
			if (fromDate)
				sensorConditions.push(gte(measurement.time, new Date(fromDate)))
			if (toDate) sensorConditions.push(lte(measurement.time, new Date(toDate)))
		}

		clause.push(exists(matchingSensors.where(and(...sensorConditions))))
	}

	if (opts.exposure?.length) {
		clause.push(
			inArray(
				device.exposure,
				opts.exposure as Array<NonNullable<Device['exposure']>>,
			),
		)
	}

	if (opts.model?.length) {
		clause.push(
			inArray(device.model, opts.model as Array<NonNullable<Device['model']>>),
		)
	}

	if (grouptag) {
		clause.push(arrayContains(device.tags, grouptag))
	}

	// https://orm.drizzle.team/learn/guides/postgis-geometry-point
	if (bbox && bbox.coordinates[0]) {
		const [latSW, lngSW] = bbox.coordinates[0][0]
		const [latNE, lngNE] = bbox.coordinates[0][2]
		clause.push(
			sql`ST_Contains(
			ST_MakeEnvelope(${lngSW}, ${latSW}, ${lngNE}, ${latNE}, 4326),
			ST_SetSRID(ST_MakePoint(${device.longitude}, ${device.latitude}), 4326)
		  )`,
		)
	}

	if (near && maxDistance !== undefined) {
		clause.push(
			sql`ST_DWithin(
			ST_SetSRID(ST_MakePoint(${device.longitude}, ${device.latitude}), 4326)::geography,
			ST_SetSRID(ST_MakePoint(${near[0]}, ${near[1]}), 4326)::geography,
			${maxDistance}
		)`,
		)
	}

	return {
		includeColumns: columns,
		whereClause: clause,
	}
}

const MINIMAL_COLUMNS = {
	id: true,
	name: true,
	exposure: true,
	longitude: true,
	latitude: true,
	updatedAt: true,
}

const DEFAULT_COLUMNS = {
	id: true,
	name: true,
	model: true,
	exposure: true,
	tags: true,
	image: true,
	description: true,
	website: true,
	link: true,
	createdAt: true,
	updatedAt: true,
	longitude: true,
	latitude: true,
	heightAboveGround: true,
	terrainElevation: true,
	terrainElevationDataset: true,
	useAuth: true,
	public: true,
	expiresAt: true,
	sensorWikiModel: true,
}

export async function findDevices(
	opts: FindDevicesOptions = {},
	columns: Record<string, any> = {},
	relations: Record<string, any> = {},
) {
	const { minimal, limit } = opts
	const { includeColumns, whereClause } = buildWhereClause(opts)
	columns = minimal ? MINIMAL_COLUMNS : { ...DEFAULT_COLUMNS, ...columns }
	relations = {
		...relations,
		...includeColumns,
	}
	const devices = await drizzleClient.query.device.findMany({
		...(Object.keys(columns).length !== 0 && { columns }),
		extras: {
			heightAboveSeaLevel: calculatedDeviceHeightAboveSeaLevel().as(
				'height_above_sea_level',
			),
		},
		...(Object.keys(relations).length !== 0 && { with: relations }),
		...(Object.keys(whereClause).length !== 0 && {
			where: (_, { and }) => and(...whereClause),
		}),
		limit,
	})

	return devices
}

export async function createDevice(deviceData: any, userId: string) {
	try {
		const [newDevice, usr] = await drizzleClient.transaction(async (tx) => {
			// Get the user info
			const [u] = await tx
				.select()
				.from(user)
				.where(eq(user.id, userId))
				.limit(1)

			// Determine sensors to use
			let sensorsToAdd = deviceData.sensors
			let storedDeviceSchemaVersion = null
			const isCustomDevice =
				!deviceData.model || deviceData.model?.toLowerCase() === 'custom'

			// If model and sensors are both specified, reject (backwards compatibility)
			if (
				deviceData.model &&
				deviceData.sensors &&
				deviceData.model.toLowerCase() !== 'custom'
			) {
				throw new Error(
					'Parameters model and sensors cannot be specified at the same time.',
				)
			}

			// If a predefined model is specified without sensors, use its layout.
			if (deviceData.model && !deviceData.sensors && !isCustomDevice) {
				const modelSensors = getSensorsForModel(
					deviceData.model,
					deviceData.sensorTemplates,
				)

				if (!modelSensors || modelSensors.length === 0) {
					throw new Error(`Unknown model: ${deviceData.model}`)
				}

				sensorsToAdd = modelSensors
			}

			if (isCustomDevice && deviceData.sensors) {
				sensorsToAdd = deviceData.sensors ?? []
			}

			if (isCustomDevice && deviceData.deviceSchema) {
				storedDeviceSchemaVersion =
					await createOrReusePrivateDeviceSchemaVersionFromUpload(
						tx,
						userId,
						deviceData.deviceSchema,
					)

				sensorsToAdd = storedDeviceSchemaVersion.content.sensors
			}

			if (isCustomDevice && deviceData.deviceSchemaVersionId) {
				storedDeviceSchemaVersion =
					await getVisibleDeviceSchemaVersionForCreation(
						tx,
						userId,
						deviceData.deviceSchemaVersionId,
					)

				if (!storedDeviceSchemaVersion) {
					throw new Error('Device schema version not found.')
				}

				sensorsToAdd = storedDeviceSchemaVersion.content.sensors
			}

			const schemaTags = storedDeviceSchemaVersion?.content.tags ?? []
			const schemaIdentityTag = storedDeviceSchemaVersion
				? `schema:${storedDeviceSchemaVersion.schemaSlug}`
				: null
			const tags = Array.from(
				new Set([
					...(deviceData.tags ?? []),
					...schemaTags,
					...(schemaIdentityTag ? [schemaIdentityTag] : []),
				]),
			)

			// Create the device
			const [createdDevice] = await tx
				.insert(device)
				.values({
					id: deviceData.id,
					useAuth: deviceData.useAuth ?? true,
					model: deviceData.model,
					tags,
					userId: userId,
					name: deviceData.name,
					description: deviceData.description,
					image: deviceData.image,
					link: deviceData.link,
					exposure: deviceData.exposure,
					public: deviceData.public ?? false,
					expiresAt: deviceData.expiresAt
						? new Date(deviceData.expiresAt)
						: null,
					latitude: deviceData.latitude,
					longitude: deviceData.longitude,
					heightAboveGround: deviceData.heightAboveGround ?? null,
					terrainElevation: deviceData.terrainElevation ?? null,
					terrainElevationDataset:
						deviceData.terrainElevation == null
							? null
							: (deviceData.terrainElevationDataset ?? null),
					deviceSchemaVersionId: storedDeviceSchemaVersion?.id,
				})
				.returning()

			if (!createdDevice) {
				throw new Error('Failed to create device.')
			}

			const initialHeightAboveGround = deviceData.heightAboveGround ?? null
			const point = sql`ST_SetSRID(ST_MakePoint(${deviceData.longitude}, ${deviceData.latitude}), 4326)`
			let [initialLocation] = await tx
				.insert(location)
				.values({
					location: point,
					heightAboveGround: initialHeightAboveGround,
				})
				.onConflictDoNothing()
				.returning()

			if (!initialLocation) {
				;[initialLocation] = await tx
					.select()
					.from(location)
					.where(
						sql`ST_Equals(${location.location}, ${point})
							AND ${location.heightAboveGround} IS NOT DISTINCT FROM ${initialHeightAboveGround}`,
					)
					.limit(1)
			}

			if (!initialLocation) {
				throw new Error('Failed to create initial device location.')
			}

			await tx.insert(deviceToLocation).values({
				deviceId: createdDevice.id,
				locationId: initialLocation.id,
				time: createdDevice.createdAt,
			})

			// Add sensors in the same transaction and collect them
			const createdSensors = []
			if (
				sensorsToAdd &&
				Array.isArray(sensorsToAdd) &&
				sensorsToAdd.length > 0
			) {
				for (const [index, sensorData] of sensorsToAdd.entries()) {
					const [newSensor] = await tx
						.insert(sensor)
						.values({
							title: sensorData.title,
							unit: sensorData.unit,
							sensorType: sensorData.sensorType,
							icon: sensorData.icon,
							sensorWikiType: sensorData.sensorWikiType,
							sensorWikiPhenomenon: sensorData.sensorWikiPhenomenon,
							sensorWikiUnit: sensorData.sensorWikiUnit,
							deviceId: createdDevice.id,
							data: storedDeviceSchemaVersion
								? { deviceSchemaSensorId: sensorData.id }
								: sensorData.data,
							order: sensorData.order ?? index,
						})
						.returning()

					if (newSensor) {
						createdSensors.push(newSensor)
					}
				}
			}

			let apiKey: string = ''
			if (createdDevice.useAuth) {
				apiKey = (await addOrReplaceDeviceApiKey(createdDevice, tx)).apiKey
			}

			// Return device with sensors
			return [
				{
					...createdDevice,
					sensors: createdSensors,
					apiKey: apiKey,
				},
				u,
			]
		})

		const userLanguage = usr.language?.split('_')[0]
		const lng: 'de' | 'en' = userLanguage === 'de' ? 'de' : 'en'
		try {
			switch (newDevice.model) {
				case 'luftdaten.info':
				case 'luftdaten_sds011':
				case 'luftdaten_sds011_bme280':
				case 'luftdaten_sds011_bmp180':
				case 'luftdaten_sds011_dht11':
				case 'luftdaten_sds011_dht22':
					await sendMail({
						recipientAddress: usr.email,
						recipientName: usr.name,
						subject: NewLufdatenDeviceMessages[lng].heading,
						body: BaseNewDeviceEmail({
							user: { name: usr.name },
							device: newDevice,
							language: lng,
							content: NewLufdatenDeviceMessages,
						}),
					})
					break
				case 'homeV2Ethernet':
				case 'homeV2Lora':
				case 'homeV2Wifi':
				case 'homeEthernet':
				case 'homeEthernetFeinstaub':
				case 'homeWifi':
				case 'homeWifiFeinstaub':
				case 'senseBox:Edu':
					await sendMail({
						recipientAddress: usr.email,
						recipientName: usr.name,
						subject: NewSenseboxDeviceMessages[lng].heading,
						body: BaseNewDeviceEmail({
							user: { name: usr.name },
							device: newDevice,
							language: lng,
							content: NewSenseboxDeviceMessages,
						}),
					})
					break
				default:
					await sendMail({
						recipientAddress: usr.email,
						recipientName: usr.name,
						subject: BaseNewDeviceMessages[lng].heading,
						body: BaseNewDeviceEmail({
							user: { name: usr.name },
							device: newDevice,
							language: lng,
							content: BaseNewDeviceMessages,
						}),
					})
					break
			}
		} catch (error) {
			console.error('Failed to send new-device email:', {
				deviceId: newDevice.id,
				error,
			})
		}

		return newDevice
	} catch (error) {
		console.error('Error creating device with sensors:', error)
		throw new Error(
			`Failed to create device and its sensors: ${error instanceof Error ? error.message : String(error)}`,
		)
	}
}

// get the 10 latest created (createdAt property) devices with id, name, latitude, and longitude
export async function getLatestDevices() {
	const devices = await drizzleClient
		.select({
			id: device.id,
			name: device.name,
			latitude: device.latitude,
			longitude: device.longitude,
		})
		.from(device)
		.orderBy(desc(device.createdAt))
		.limit(10)

	return devices
}

export async function addOrReplaceDeviceApiKey(
	d: Device,
	tx?: PgTransaction<
		PostgresJsQueryResultHKT,
		typeof schema,
		ExtractTablesWithRelations<typeof schema>
	>,
): Promise<{ apiKey: string }> {
	const { key } = await createDeviceApiKey(d)
	const result = await (tx ?? drizzleClient)
		.update(device)
		.set({ apiKey: key })
		.where(eq(device.id, d.id))
		.returning()

	if (result[0].apiKey === null)
		throw new Error('device api key cannot be null after inserting')

	return { apiKey: result[0].apiKey }
}

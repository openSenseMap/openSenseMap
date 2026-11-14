import { eq, inArray, sql, type ExtractTablesWithRelations } from 'drizzle-orm'
import { type PgTransaction } from 'drizzle-orm/pg-core'
import { type PostgresJsQueryResultHKT } from 'drizzle-orm/postgres-js'
import {
	type User,
	type Profile,
	profile,
	device,
	sensor,
	measurements10minView,
} from '~/db/schema'
import type * as schema from '~/db/schema'
import { drizzleClient } from '~/db.server'

export async function getProfileByUserId(userId: User['id']) {
	return drizzleClient.query.profile.findFirst({
		where: (profile, { eq }) => eq(profile.userId, userId),
		with: {
			profileImage: true,
			user: {
				with: {
					devices: true,
				},
			},
		},
	})
}

export async function getProfileMapPreferencesByUserId(userId: User['id']) {
	return drizzleClient.query.profile.findFirst({
		where: (profile, { eq }) => eq(profile.userId, userId),
		columns: {
			homeLatitude: true,
			homeLongitude: true,
			homeZoom: true,
		},
	})
}

export async function getProfileByUsername(username: string) {
	const userRecord = await drizzleClient.query.user.findFirst({
		where: (u, { eq }) => eq(u.name, username),
	})
	if (!userRecord) return null
	return getProfileByUserId(userRecord.id)
}

export async function getProfileSensorCount(deviceIds: string[]) {
	if (deviceIds.length === 0) return 0
	return drizzleClient.$count(sensor, inArray(sensor.deviceId, deviceIds))
}

// The ten-minute aggregate stores raw measurement counts per bucket. Recent
// measurements and historical buckets awaiting backfill may be absent.
export async function getProfileEstimatedMeasurementCount(userId: User['id']) {
	const [result] = await drizzleClient
		.select({
			count: sql<string>`coalesce(sum(${measurements10minView.total_values}), 0)`,
		})
		.from(measurements10minView)
		.innerJoin(sensor, eq(measurements10minView.sensorId, sensor.id))
		.innerJoin(device, eq(sensor.deviceId, device.id))
		.where(eq(device.userId, userId))

	return Number(result?.count ?? 0)
}

export async function updateProfile(
	id: Profile['id'],
	values: {
		displayName: Profile['displayName']
		public: boolean
		homeLatitude?: number | null
		homeLongitude?: number | null
		homeZoom?: number | null
	},
) {
	const updateValues: Partial<Profile> = {
		displayName: values.displayName,
		public: values.public,
	}

	if ('homeLatitude' in values) updateValues.homeLatitude = values.homeLatitude
	if ('homeLongitude' in values)
		updateValues.homeLongitude = values.homeLongitude
	if ('homeZoom' in values) updateValues.homeZoom = values.homeZoom

	const [updatedProfile] = await drizzleClient
		.update(profile)
		.set(updateValues)
		.where(eq(profile.id, id))
		.returning()

	return updatedProfile
}

export async function createProfile(
	userId: User['id'],
	displayName: Profile['displayName'],
) {
	return drizzleClient.transaction((t) =>
		createProfileWithTransaction(t, userId, displayName),
	)
}

export async function createProfileWithTransaction(
	transaction: PgTransaction<
		PostgresJsQueryResultHKT,
		typeof schema,
		ExtractTablesWithRelations<typeof schema>
	>,
	userId: User['id'],
	displayName: Profile['displayName'],
) {
	return transaction.insert(profile).values({
		displayName,
		public: false,
		userId,
	})
}

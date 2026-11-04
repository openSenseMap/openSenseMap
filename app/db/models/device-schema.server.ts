import { and, desc, eq, ilike, ne, or, sql } from 'drizzle-orm'
import { drizzleClient } from '~/db.server'
import { deviceSchema, deviceSchemaVersion } from '~/db/schema'
import {
	uploadedDeviceSchemaV1,
	type UploadedDeviceSchemaV1,
} from '~/lib/device-schemas/device-schema-v1'
import {
	createDeviceSchemaHash,
	slugifyDeviceSchemaName,
} from '~/lib/device-schemas/util'

export type StoredDeviceSchemaVersion = {
	id: string
	deviceSchemaId: string
	version: string
	formatVersion: string
	content: UploadedDeviceSchemaV1
	hash: string
	schemaSlug: string
	schemaName: string
}

export async function createOrReusePrivateDeviceSchemaVersionFromUpload(
	tx: any,
	userId: string,
	input: unknown,
): Promise<StoredDeviceSchemaVersion> {
	const parsedSchema = uploadedDeviceSchemaV1.parse(input)
	const hash = createDeviceSchemaHash(parsedSchema)

	const [existingVersion] = await tx
		.select({
			id: deviceSchemaVersion.id,
			deviceSchemaId: deviceSchemaVersion.deviceSchemaId,
			version: deviceSchemaVersion.version,
			formatVersion: deviceSchemaVersion.formatVersion,
			content: deviceSchemaVersion.content,
			hash: deviceSchemaVersion.hash,
			schemaSlug: deviceSchema.slug,
			schemaName: deviceSchema.name,
		})
		.from(deviceSchemaVersion)
		.innerJoin(
			deviceSchema,
			eq(deviceSchema.id, deviceSchemaVersion.deviceSchemaId),
		)
		.where(
			and(
				eq(deviceSchema.ownerUserId, userId),
				eq(deviceSchemaVersion.hash, hash),
			),
		)
		.limit(1)

	if (existingVersion) return existingVersion

	const slugBase = slugifyDeviceSchemaName(parsedSchema.name)
	const slug = `${slugBase}-${hash.slice(0, 8)}`

	const [createdSchema] = await tx
		.insert(deviceSchema)
		.values({
			slug,
			name: parsedSchema.name,
			description: parsedSchema.description ?? null,
			tags: parsedSchema.tags ?? [],
			ownerUserId: userId,
			visibility: 'private',
		})
		.returning()

	if (!createdSchema) throw new Error('Failed to create device schema.')

	const [createdVersion] = await tx
		.insert(deviceSchemaVersion)
		.values({
			deviceSchemaId: createdSchema.id,
			version: parsedSchema.version,
			formatVersion: parsedSchema.schemaVersion,
			content: parsedSchema,
			hash,
			status: 'current',
			createdByUserId: userId,
			publishedAt: new Date(),
		})
		.returning()

	if (!createdVersion)
		throw new Error('Failed to create device schema version.')

	return {
		id: createdVersion.id,
		deviceSchemaId: createdVersion.deviceSchemaId,
		version: createdVersion.version,
		formatVersion: createdVersion.formatVersion,
		content: createdVersion.content,
		hash: createdVersion.hash,
		schemaSlug: createdSchema.slug,
		schemaName: createdSchema.name,
	}
}

export async function getPublicDeviceSchemasForUser(userId: string) {
	return drizzleClient
		.select({
			id: deviceSchema.id,
			slug: deviceSchema.slug,
			name: deviceSchema.name,
			description: deviceSchema.description,
			tags: deviceSchema.tags,
			createdAt: deviceSchema.createdAt,
			versionId: deviceSchemaVersion.id,
			version: deviceSchemaVersion.version,
			formatVersion: deviceSchemaVersion.formatVersion,
			hash: deviceSchemaVersion.hash,
			publishedAt: deviceSchemaVersion.publishedAt,
			content: deviceSchemaVersion.content,
		})
		.from(deviceSchema)
		.innerJoin(
			deviceSchemaVersion,
			eq(deviceSchemaVersion.deviceSchemaId, deviceSchema.id),
		)
		.where(
			and(
				eq(deviceSchema.ownerUserId, userId),
				eq(deviceSchema.visibility, 'public'),
				eq(deviceSchemaVersion.status, 'current'),
			),
		)
		.orderBy(desc(deviceSchemaVersion.publishedAt))
}

export async function getVisibleDeviceSchemaVersions(options: {
	userId?: string | null
	query?: string | null
	limit?: number
}) {
	const { userId, query, limit = 20 } = options
	const visibilityClause = userId
		? or(
				eq(deviceSchema.visibility, 'public'),
				eq(deviceSchema.ownerUserId, userId),
			)
		: eq(deviceSchema.visibility, 'public')
	const searchClause = query?.trim()
		? or(
				ilike(deviceSchema.name, `%${query.trim()}%`),
				ilike(deviceSchema.description, `%${query.trim()}%`),
				ilike(deviceSchema.slug, `%${query.trim()}%`),
			)
		: undefined

	return drizzleClient
		.select({
			id: deviceSchema.id,
			slug: deviceSchema.slug,
			name: deviceSchema.name,
			description: deviceSchema.description,
			tags: deviceSchema.tags,
			visibility: deviceSchema.visibility,
			ownerUserId: deviceSchema.ownerUserId,
			versionId: deviceSchemaVersion.id,
			version: deviceSchemaVersion.version,
			formatVersion: deviceSchemaVersion.formatVersion,
			hash: deviceSchemaVersion.hash,
			publishedAt: deviceSchemaVersion.publishedAt,
			content: deviceSchemaVersion.content,
		})
		.from(deviceSchema)
		.innerJoin(
			deviceSchemaVersion,
			eq(deviceSchemaVersion.deviceSchemaId, deviceSchema.id),
		)
		.where(
			and(
				visibilityClause,
				eq(deviceSchemaVersion.status, 'current'),
				searchClause,
			),
		)
		.orderBy(desc(deviceSchemaVersion.publishedAt))
		.limit(limit)
}

export async function getVisibleDeviceSchemaVersionForCreation(
	tx: any,
	userId: string,
	versionId: string,
): Promise<StoredDeviceSchemaVersion | undefined> {
	const [schemaVersion] = await tx
		.select({
			id: deviceSchemaVersion.id,
			deviceSchemaId: deviceSchemaVersion.deviceSchemaId,
			version: deviceSchemaVersion.version,
			formatVersion: deviceSchemaVersion.formatVersion,
			content: deviceSchemaVersion.content,
			hash: deviceSchemaVersion.hash,
			schemaSlug: deviceSchema.slug,
			schemaName: deviceSchema.name,
		})
		.from(deviceSchemaVersion)
		.innerJoin(
			deviceSchema,
			eq(deviceSchema.id, deviceSchemaVersion.deviceSchemaId),
		)
		.where(
			and(
				eq(deviceSchemaVersion.id, versionId),
				eq(deviceSchemaVersion.status, 'current'),
				or(
					eq(deviceSchema.visibility, 'public'),
					eq(deviceSchema.ownerUserId, userId),
				),
			),
		)
		.limit(1)

	return schemaVersion
}

export async function getOwnedDeviceSchemasWithVersions(userId: string) {
	const rows = await drizzleClient
		.select({
			id: deviceSchema.id,
			slug: deviceSchema.slug,
			name: deviceSchema.name,
			description: deviceSchema.description,
			tags: deviceSchema.tags,
			visibility: deviceSchema.visibility,
			createdAt: deviceSchema.createdAt,
			updatedAt: deviceSchema.updatedAt,
			versionId: deviceSchemaVersion.id,
			version: deviceSchemaVersion.version,
			formatVersion: deviceSchemaVersion.formatVersion,
			hash: deviceSchemaVersion.hash,
			status: deviceSchemaVersion.status,
			createdAtVersion: deviceSchemaVersion.createdAt,
			publishedAt: deviceSchemaVersion.publishedAt,
			deprecatedAt: deviceSchemaVersion.deprecatedAt,
			content: deviceSchemaVersion.content,
		})
		.from(deviceSchema)
		.innerJoin(
			deviceSchemaVersion,
			eq(deviceSchemaVersion.deviceSchemaId, deviceSchema.id),
		)
		.where(eq(deviceSchema.ownerUserId, userId))
		.orderBy(desc(deviceSchema.updatedAt), desc(deviceSchemaVersion.createdAt))

	const grouped = new Map<
		string,
		{
			id: string
			slug: string
			name: string
			description: string | null
			tags: string[] | null
			visibility: 'private' | 'public'
			createdAt: Date
			updatedAt: Date
			versions: Array<{
				id: string
				version: string
				formatVersion: string
				hash: string
				status: 'current' | 'deprecated'
				createdAt: Date
				publishedAt: Date | null
				deprecatedAt: Date | null
				content: UploadedDeviceSchemaV1
			}>
		}
	>()

	for (const row of rows) {
		const schema = grouped.get(row.id) ?? {
			id: row.id,
			slug: row.slug,
			name: row.name,
			description: row.description,
			tags: row.tags,
			visibility: row.visibility,
			createdAt: row.createdAt,
			updatedAt: row.updatedAt,
			versions: [],
		}

		schema.versions.push({
			id: row.versionId,
			version: row.version,
			formatVersion: row.formatVersion,
			hash: row.hash,
			status: row.status,
			createdAt: row.createdAtVersion,
			publishedAt: row.publishedAt,
			deprecatedAt: row.deprecatedAt,
			content: row.content,
		})

		grouped.set(row.id, schema)
	}

	return Array.from(grouped.values())
}

export async function createCurrentDeviceSchemaVersion(
	userId: string,
	schemaId: string,
	input: unknown,
) {
	const parsedSchema = uploadedDeviceSchemaV1.parse(input)
	const hash = createDeviceSchemaHash(parsedSchema)

	return drizzleClient.transaction(async (tx) => {
		const [ownedSchema] = await tx
			.select({
				id: deviceSchema.id,
				name: deviceSchema.name,
			})
			.from(deviceSchema)
			.where(
				and(
					eq(deviceSchema.id, schemaId),
					eq(deviceSchema.ownerUserId, userId),
				),
			)
			.limit(1)

		if (!ownedSchema) {
			throw new Error('Device schema not found.')
		}

		const [referenceVersion] = await tx
			.select({
				content: deviceSchemaVersion.content,
			})
			.from(deviceSchemaVersion)
			.where(eq(deviceSchemaVersion.deviceSchemaId, schemaId))
			.limit(1)

		if (
			referenceVersion?.content.id &&
			referenceVersion.content.id !== parsedSchema.id
		) {
			throw new Error('Uploaded schema id does not match this schema.')
		}

		const [existingVersion] = await tx
			.select({ id: deviceSchemaVersion.id })
			.from(deviceSchemaVersion)
			.where(
				and(
					eq(deviceSchemaVersion.deviceSchemaId, schemaId),
					eq(deviceSchemaVersion.version, parsedSchema.version),
				),
			)
			.limit(1)

		if (existingVersion) {
			throw new Error('This schema version already exists.')
		}

		const [existingHash] = await tx
			.select({ id: deviceSchemaVersion.id })
			.from(deviceSchemaVersion)
			.where(
				and(
					eq(deviceSchemaVersion.deviceSchemaId, schemaId),
					eq(deviceSchemaVersion.hash, hash),
				),
			)
			.limit(1)

		if (existingHash) {
			throw new Error('This schema content already exists.')
		}

		const now = new Date()

		const [createdVersion] = await tx
			.insert(deviceSchemaVersion)
			.values({
				deviceSchemaId: schemaId,
				version: parsedSchema.version,
				formatVersion: parsedSchema.schemaVersion,
				content: parsedSchema,
				hash,
				status: 'current',
				createdByUserId: userId,
				publishedAt: now,
			})
			.returning()

		if (!createdVersion) {
			throw new Error('Failed to create schema version.')
		}

		await tx
			.update(deviceSchemaVersion)
			.set({
				status: 'deprecated',
				deprecatedAt: now,
			})
			.where(
				and(
					eq(deviceSchemaVersion.deviceSchemaId, schemaId),
					eq(deviceSchemaVersion.status, 'current'),
					ne(deviceSchemaVersion.id, createdVersion.id),
				),
			)

		await tx
			.update(deviceSchema)
			.set({ updatedAt: sql`NOW()` })
			.where(eq(deviceSchema.id, schemaId))

		return createdVersion
	})
}

export async function updateDeviceSchemaVisibility(
	userId: string,
	schemaId: string,
	visibility: 'private' | 'public',
) {
	const [updatedSchema] = await drizzleClient
		.update(deviceSchema)
		.set({ visibility })
		.where(
			and(eq(deviceSchema.id, schemaId), eq(deviceSchema.ownerUserId, userId)),
		)
		.returning()

	return updatedSchema
}

/**
 * Loads a schema version for places where schema content may be shared outside
 * the owner-only settings view. Anonymous users only see public current
 * versions; signed-in owners may also access their own private or deprecated
 * versions.
 */
export async function getSharedDeviceSchemaVersion(
	versionId: string,
	userId?: string | null,
) {
	const [schemaVersion] = await drizzleClient
		.select({
			slug: deviceSchema.slug,
			name: deviceSchema.name,
			visibility: deviceSchema.visibility,
			version: deviceSchemaVersion.version,
			content: deviceSchemaVersion.content,
		})
		.from(deviceSchemaVersion)
		.innerJoin(
			deviceSchema,
			eq(deviceSchema.id, deviceSchemaVersion.deviceSchemaId),
		)
		.where(
			and(
				eq(deviceSchemaVersion.id, versionId),
				userId
					? or(
							and(
								eq(deviceSchema.visibility, 'public'),
								eq(deviceSchemaVersion.status, 'current'),
							),
							eq(deviceSchema.ownerUserId, userId),
						)
					: and(
							eq(deviceSchema.visibility, 'public'),
							eq(deviceSchemaVersion.status, 'current'),
						),
			),
		)
		.limit(1)

	return schemaVersion
}

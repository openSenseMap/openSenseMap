import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import { count, eq, sql } from 'drizzle-orm'
import { createProfileWithTransaction } from './profile.server'
import {
	type Password,
	type User,
	password as passwordTable,
	user,
	tosUserState,
	device,
} from '~/db/schema'
import { drizzleClient } from '~/db.server'
import { deleteProfileImage } from '~/lib/s3.server'
import { logServerWarning } from '~/lib/sentry.server'
import { type ThemePreference } from '~/lib/theme'

export async function getUserById(id: User['id']) {
	return drizzleClient.query.user.findFirst({
		where: (user, { eq }) => eq(user.id, id),
	})
}

export async function getUserByEmail(email: User['email']) {
	return drizzleClient.query.user.findFirst({
		where: (user, { eq }) => eq(user.email, email),
	})
}

export async function getUserByUnconfirmedEmail(unconfirmedEmail: string) {
	return drizzleClient.query.user.findFirst({
		where: (user, { eq }) => eq(user.unconfirmedEmail, unconfirmedEmail),
	})
}

/**
 * Returns a user if the email is taken either as a confirmed as unconfirmed email.
 */
export async function getUserByAnyEmail(email: User['email']) {
	return drizzleClient.query.user.findFirst({
		where: (user, { eq, or }) =>
			or(eq(user.email, email), eq(user.unconfirmedEmail, email)),
	})
}

export async function getUserByUsername(username: User['name']) {
	return drizzleClient.query.user.findFirst({
		where: (user, { eq }) => eq(user.name, username),
	})
}

// export async function getUserWithDevicesByName(name: User["name"]) {
//   return prisma.user.findUnique({
//     where: { name },
//     include: { devices: true },
//   });
// }

// export async function getUserWithDevicesByNameOrId(
//   name: User["name"],
//   id: User["id"]
// ) {
//   return prisma.user.findUnique({
//     where: {
//       OR: [],
//     },
//     include: { devices: true },
//   });
// }

export async function deleteUserByEmail(email: User['email']) {
	const userToDelete = await drizzleClient.query.user.findFirst({
		where: (user, { eq }) => eq(user.email, email),
		columns: { id: true },
	})
	const imageKey = userToDelete
		? await getProfileImageKey(userToDelete.id)
		: null
	const result = await drizzleClient.delete(user).where(eq(user.email, email))
	await cleanUpDeletedProfileImage(imageKey, userToDelete?.id)
	return result
}

export async function deleteUserById(id: User['id']) {
	const imageKey = await getProfileImageKey(id)
	const result = await drizzleClient.delete(user).where(eq(user.id, id))
	await cleanUpDeletedProfileImage(imageKey, id)
	return result
}

async function getProfileImageKey(userId: User['id']) {
	const profile = await drizzleClient.query.profile.findFirst({
		where: (profile, { eq }) => eq(profile.userId, userId),
		columns: { image: true },
	})
	return profile?.image ?? null
}

async function cleanUpDeletedProfileImage(
	imageKey: string | null,
	userId?: User['id'],
) {
	if (!imageKey) return

	try {
		await deleteProfileImage(imageKey)
	} catch (error) {
		logServerWarning(
			'Failed to delete profile image after user deletion',
			error,
			{
				'user.id': userId ?? 'unknown',
			},
		)
	}
}

//* user name shouldn't be unique
/* export async function getUserByName(name: User["name"]) {
  return prisma.user.findUnique({ where: { name } });
} */

export const updateUserEmail = (
	userToUpdate: User,
	newEmail: User['email'],
) => {
	return drizzleClient
		.update(user)
		.set({
			unconfirmedEmail: newEmail,
		})
		.where(eq(user.id, userToUpdate.id))
		.returning()
}

export async function updateUserName(
	email: User['email'],
	newUserName: string,
) {
	return drizzleClient
		.update(user)
		.set({
			name: newUserName,
		})
		.where(eq(user.email, email))
}

export async function updateUserPassword(
	userId: Password['userId'],
	newPassword: string,
) {
	const hashedPassword = await bcrypt.hash(preparePasswordHash(newPassword), 13)
	return drizzleClient
		.update(passwordTable)
		.set({
			hash: hashedPassword,
		})
		.where(eq(passwordTable.userId, userId))
		.returning()
}

type UpdateUserPreferencesArgs = {
	language?: User['language']
	themePreference?: ThemePreference
	newsletterOptIn?: User['newsletterOptIn']
}

export async function updateUserPreferencesById(
	id: User['id'],
	args: UpdateUserPreferencesArgs,
) {
	const values: Partial<
		Pick<User, 'language' | 'themePreference' | 'newsletterOptIn'>
	> = {}

	if (args.language !== undefined) {
		values.language = args.language
	}

	if (args.themePreference !== undefined) {
		values.themePreference = args.themePreference
	}

	if (args.newsletterOptIn !== undefined) {
		values.newsletterOptIn = args.newsletterOptIn
	}

	if (Object.keys(values).length === 0) {
		throw new Error('No user preference fields provided')
	}

	const [updated] = await drizzleClient
		.update(user)
		.set({
			...values,
			updatedAt: sql`NOW()`,
		})
		.where(eq(user.id, id))
		.returning()

	if (!updated) {
		throw new Error(`User ${id} not found`)
	}

	return updated
}

type UpdateUserArgs = {
	name: string
	email: string
	language: string
	role: 'admin' | 'user'
	emailIsConfirmed: boolean
}

export async function updateUserById(id: string, args: UpdateUserArgs) {
	const [updated] = await drizzleClient
		.update(user)
		.set({
			name: args.name,
			email: args.email,
			language: args.language,
			role: args.role,
			emailIsConfirmed: args.emailIsConfirmed,
			updatedAt: sql`NOW()`,
		})
		.where(eq(user.id, id))
		.returning()

	if (!updated) {
		throw new Error(`User ${id} not found`)
	}

	return updated
}

export async function getUsers() {
	return drizzleClient.query.user.findMany()
}

export async function getUsersForAdminList() {
	return drizzleClient
		.select({
			id: user.id,
			name: user.name,
			email: user.email,
			role: user.role,
			language: user.language,
			emailIsConfirmed: user.emailIsConfirmed,
			createdAt: user.createdAt,
			updatedAt: user.updatedAt,
			devicesCount: count(device.id),
		})
		.from(user)
		.leftJoin(device, eq(device.userId, user.id))
		.groupBy(
			user.id,
			user.name,
			user.email,
			user.role,
			user.language,
			user.emailIsConfirmed,
			user.createdAt,
			user.updatedAt,
		)
}

export const preparePasswordHash = function preparePasswordHash(
	plaintextPassword: string,
) {
	// first round: hash plaintextPassword with sha512
	const hash = crypto.createHash('sha512')
	hash.update(plaintextPassword.toString(), 'utf8')
	const hashed = hash.digest('base64') // base64 for more entropy than hex

	return hashed
}

export async function createUser(
	name: User['name'],
	email: User['email'],
	language: User['language'],
	password: string,
	tosVersionId?: string,
	newsletterOptIn = false,
) {
	const hashedPassword = await bcrypt.hash(preparePasswordHash(password), 13) // make salt_factor configurable oSeM API uses 13 by default

	return await drizzleClient.transaction(async (t) => {
		const newUser = await t
			.insert(user)
			.values({
				name,
				email,
				language,
				unconfirmedEmail: email,
				acceptedTosVersionId: tosVersionId,
				acceptedTosAt: new Date(),
				newsletterOptIn,
			})
			.returning()
		await t.insert(passwordTable).values({
			hash: hashedPassword,
			userId: newUser[0].id,
		})
		await createProfileWithTransaction(t, newUser[0].id, name)
		if (tosVersionId) {
			await t
				.insert(tosUserState)
				.values({
					userId: newUser[0].id,
					tosVersionId,
					acceptedAt: new Date(),
				})
				.onConflictDoNothing()
		}
		return newUser
	})
}

export async function verifyLogin(identifier: string, password: string) {
	const trimmedIdentifier = identifier.trim()

	const userWithPassword = await drizzleClient.query.user.findFirst({
		where: (user, { eq, or }) =>
			or(eq(user.email, trimmedIdentifier), eq(user.name, trimmedIdentifier)),
		with: {
			profile: true,
			password: true,
		},
	})

	if (!userWithPassword || !userWithPassword.password) {
		return null
	}

	const isValid = await bcrypt.compare(
		preparePasswordHash(password),
		userWithPassword.password.hash,
	)

	if (!isValid) {
		return null
	}

	const { password: _password, ...userWithoutPassword } = userWithPassword
	return userWithoutPassword
}

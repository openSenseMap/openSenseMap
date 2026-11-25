import { createHmac } from 'node:crypto'
import { eq } from 'drizzle-orm'
import jsonwebtoken, { type JwtPayload, type Algorithm } from 'jsonwebtoken'
import invariant from 'tiny-invariant'
import { v4 as uuidv4 } from 'uuid'
import { getUserByEmail } from '~/db/models/user.server'
import { type Device, type User } from '~/db/schema'
import { refreshToken, tokenRevocation } from '~/db/schema/refreshToken'
import { drizzleClient } from '~/db.server'
import { StandardResponse } from './responses'
import { apiMessages } from './openapi/messages'

const { sign, verify } = jsonwebtoken

const {
	JWT_ALGORITHM,
	JWT_ISSUER,
	JWT_VALIDITY_MS,
	JWT_SECRET,
	REFRESH_TOKEN_ALGORITHM,
	REFRESH_TOKEN_SECRET,
	REFRESH_TOKEN_VALIDITY_MS,
} = process.env

const jwtSignOptions = {
	algorithm: JWT_ALGORITHM as Algorithm,
	issuer: JWT_ISSUER,
	expiresIn: Math.round(Number(JWT_VALIDITY_MS) / 1000),
}

const jwtVerifyOptions = {
	algorithm: [JWT_ALGORITHM as Algorithm],
	issuer: JWT_ISSUER,
}

const ONE_DAY_IN_MS = 1000 * 60 * 60 * 24

/**
 *
 * @param user
 * @returns
 */
export const createToken = (
	user: User,
): Promise<{
	token: string
	refreshToken: string
}> => {
	invariant(typeof JWT_ALGORITHM === 'string')
	invariant(typeof JWT_ISSUER === 'string')
	invariant(typeof JWT_VALIDITY_MS === 'string')
	invariant(typeof JWT_SECRET === 'string')

	invariant(typeof REFRESH_TOKEN_VALIDITY_MS === 'string')
	const payload = { role: user.role }
	const signOptions = Object.assign(
		{ subject: user.email, jwtid: uuidv4() },
		jwtSignOptions,
	)

	return new Promise(function (resolve, reject) {
		sign(
			payload,
			JWT_SECRET,
			signOptions,
			async (err: Error | null, token: string | undefined) => {
				if (err) return reject(err)
				if (typeof token === 'undefined')
					return reject('Generated token was undefined and thus not valid')

				// JWT generation was successful
				// we now create the refreshToken.
				// and set the refreshTokenExpires to 1 week
				// it is a HMAC of the jwt string
				const refreshToken = hashJwt(token)
				const refreshTokenExpiresAt: Date = new Date(
					Date.now() + Number(REFRESH_TOKEN_VALIDITY_MS),
				)
				try {
					await addRefreshToken(user.id, refreshToken, refreshTokenExpiresAt)
					return resolve({ token, refreshToken })
				} catch (err) {
					return reject(err)
				}
			},
		)
	})
}

export const revokeToken = async (user: User, jwtString: string) => {
	invariant(typeof JWT_ALGORITHM === 'string')
	invariant(typeof JWT_ISSUER === 'string')
	invariant(typeof JWT_SECRET === 'string')

	const hash = hashJwt(jwtString)
	await deleteRefreshToken(hash)
	const jwt = await decodeJwtString(jwtString, JWT_SECRET, jwtVerifyOptions)

	if (jwt.jti)
		await drizzleClient.insert(tokenRevocation).values({
			hash,
			token: jwt,
			expiresAt: jwt.exp === undefined ? new Date() : new Date(jwt.exp),
		})
}

export const revokeRefreshToken = async (refreshToken: string) => {
	await drizzleClient.insert(tokenRevocation).values({
		hash: refreshToken,
		token: '',
		expiresAt: new Date(Date.now() + ONE_DAY_IN_MS * 7),
	})
}

/**
 *
 * @param r
 * @returns
 */
export const getUserFromJwt = async (
	r: Request,
): Promise<User | 'no_token' | 'invalid_token_type' | 'verification_error'> => {
	invariant(typeof JWT_ALGORITHM === 'string')
	invariant(typeof JWT_ISSUER === 'string')
	invariant(typeof JWT_SECRET === 'string')

	// check if Authorization header is present
	const rawAuthorizationHeader = r.headers.get('authorization')
	if (!rawAuthorizationHeader) return 'no_token'

	const [bearer, jwtString] = rawAuthorizationHeader.split(' ')
	if (bearer !== 'Bearer') return 'invalid_token_type'

	let decodedJwt: JwtPayload | undefined = undefined
	try {
		decodedJwt = await decodeJwtString(jwtString, JWT_SECRET, {
			...jwtVerifyOptions,
			ignoreExpiration: r.url.endsWith('/users/refresh-auth'), // ignore expiration for refresh endpoint
		})
	} catch (err: any) {
		if (typeof err === 'string') return err as 'verification_error'
	}

	invariant(decodedJwt !== undefined)
	invariant(decodedJwt.sub !== undefined)
	const user = await getUserByEmail(decodedJwt.sub)
	if (!user)
		throw new Error('User was not found despite a verified jwt provided')
	return user
}

export const withAuthenticatedUser = async (
	request: Request,
	handler: (user: User) => Promise<Response> | Response,
): Promise<Response> => {
	const jwtResponse = await getUserFromJwt(request)

	if (typeof jwtResponse === 'string') {
		return StandardResponse.forbidden(apiMessages.invalidJwt)
	}

	return handler(jwtResponse)
}

const decodeJwtString = (
	jwtString: string,
	jwtSecret: jsonwebtoken.Secret,
	options: jsonwebtoken.VerifyOptions & { complete?: false },
): Promise<JwtPayload> => {
	return new Promise((resolve, reject) => {
		verify(jwtString, jwtSecret, options, async (err, decodedJwt) => {
			if (err) reject('verification_error')
			if (decodedJwt === undefined) {
				reject('verification_error')
				return
			}

			// Our tokens are signed with an object, therefore tokens that
			// verify and decode to a string cannot be valid
			if (typeof decodedJwt === 'string') {
				reject('verification_error')
				return
			}

			// We sign our jwt with the user email as the subject, so if there is
			// no subject, the jwt cannot be valid as well.
			if (decodedJwt.sub === undefined) {
				reject('verification_error')
				return
			}

			// check if the token is blacklisted by performing a hmac digest
			// on the string representation of the jwt.
			// also checks the existence of the jti claim
			if (await isTokenRevoked(decodedJwt, jwtString)) {
				reject('verification_error')
				return
			}

			resolve(decodedJwt)
			return
		})
	})
}

const addRefreshToken = async (
	userId: string,
	token: string,
	expiresAt: Date,
) => {
	await drizzleClient.insert(refreshToken).values({
		userId,
		token,
		expiresAt,
	})
}

const deleteRefreshToken = async (tokenHash: string) => {
	await drizzleClient
		.delete(refreshToken)
		.where(eq(refreshToken.token, tokenHash))
}

const isTokenRevoked = async (token: JwtPayload, tokenString: string) => {
	if (!token.jti) {
		// token has no id.. -> shouldn't be accepted
		return true
	}

	const hash = hashJwt(tokenString)

	const revokedToken = await drizzleClient
		.select()
		.from(tokenRevocation)
		.where(eq(tokenRevocation.hash, hash))

	if (revokedToken.length > 0) return true
	return false
}

export const hashJwt = (jwt: string) => {
	invariant(typeof REFRESH_TOKEN_ALGORITHM === 'string')
	invariant(typeof REFRESH_TOKEN_SECRET === 'string')

	return createHmac(REFRESH_TOKEN_ALGORITHM, REFRESH_TOKEN_SECRET)
		.update(jwt)
		.digest('base64')
}

export const refreshJwt = async (
	u: User,
	refreshToken: string,
): Promise<{ token: string; refreshToken: string } | null> => {
	// We have to check if the refresh token actually belongs to the user
	const userForToken = await drizzleClient.query.refreshToken.findFirst({
		where: (r, { eq }) => eq(r.token, refreshToken),
		with: {
			user: true,
		},
	})
	if (userForToken == undefined || userForToken.userId !== u.id) return null

	await revokeRefreshToken(refreshToken)
	return await createToken(u)
}

export const createDeviceApiKey = (
	device: Device,
): Promise<{
	key: string
}> => {
	invariant(typeof JWT_ALGORITHM === 'string')
	invariant(typeof JWT_ISSUER === 'string')
	invariant(typeof JWT_VALIDITY_MS === 'string')
	invariant(typeof JWT_SECRET === 'string')

	const payload = { role: device.id }
	const signOptions = Object.assign(
		{ subject: device.id, jwtid: uuidv4() },
		jwtSignOptions,
	)

	return new Promise(function (resolve, reject) {
		sign(
			payload,
			JWT_SECRET,
			signOptions,
			async (err: Error | null, token: string | undefined) => {
				if (err) return reject(err)
				if (typeof token === 'undefined')
					return reject('Generated token was undefined and thus not valid')

				// We use the signature part of the jwt as a deviceApiKey
				const k = token.split('.').at(-1)
				if (k === undefined)
					throw new Error('signature part of jwt may never be undefined')
				return resolve({ key: k })
			},
		)
	})
}

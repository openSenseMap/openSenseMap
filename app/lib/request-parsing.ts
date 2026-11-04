import z from 'zod'
import { apiMessages } from './openapi/messages'
import { BearerTokenSchema } from './openapi/schemas/auth'
import { StandardResponse } from './responses'
import { RefreshAuthRequestSchema } from '~/routes/api.users.refresh-auth'

/**
 * Parses request data from either JSON or form data format.
 * Automatically detects the content type and parses accordingly.
 * Provides backward compatibility for old devices that send JSON while
 * supporting new devices that send form data.
 *
 * @param request - The incoming request
 * @returns Parsed data object
 * @throws Error if parsing fails
 */
export async function parseRequestData(
	request: Request,
): Promise<Record<string, any>> {
	const contentType = request.headers.get('content-type') || ''

	// Parse JSON only if content-type is application/json
	if (contentType.includes('application/json')) {
		try {
			return await request.json()
		} catch (error) {
			throw new Error(`Failed to parse JSON data: ${error}`)
		}
	}

	// For all other cases (including application/x-www-form-urlencoded and multipart/form-data), parse as form data
	try {
		const formData = await request.formData()
		return Object.fromEntries(formData)
	} catch (error) {
		throw new Error(`Failed to parse form data: ${error}`)
	}
}

function parseBoolean(value: unknown): boolean {
	return value === true || value === 'true' || value === 'on'
}

/**
 * Convenience function to parse user registration data with field mapping.
 * Handles both JSON and form data formats with backward compatibility.
 *
 * @param request - The incoming request
 * @returns Parsed registration data with mapped field names
 */
export async function parseUserRegistrationData(request: Request): Promise<{
	name: string
	email: string
	password: string
	language: string
	tosAccepted: boolean
	newsletterOptIn: boolean
}> {
	const data = await parseRequestData(request)

	return {
		name: data.name || '',
		email: data.email || '',
		password: data.password || '',
		language: data.language || 'en_US',
		tosAccepted: parseBoolean(data.tosAccepted),
		newsletterOptIn: parseBoolean(
			data.newsletterOptIn ?? data.newsletter_optIn,
		),
	}
}

/**
 * Convenience function to parse user sign-in data.
 * Handles both JSON and form data formats.
 *
 * @param request - The incoming request
 * @returns Parsed sign-in data
 */
export async function parseUserSignInData(request: Request): Promise<{
	email: string
	password: string
}> {
	const data = await parseRequestData(request)

	return {
		email: data.email || '',
		password: data.password || '',
	}
}

/**
 * Convenience function to parse refresh token data.
 * Handles both JSON and form data formats.
 *
 * @param request - The incoming request
 * @returns Parsed refresh token data
 */
export async function parseRefreshTokenData(request: Request): Promise<{
	token: string
}> {
	const data = await parseRequestData(request)

	return {
		token: data.token || '',
	}
}

export const parseRefreshAuthBody = async (
	request: Request,
): Promise<z.infer<typeof RefreshAuthRequestSchema> | Response> => {
	try {
		const data = await parseRefreshTokenData(request)
		const parsed = await RefreshAuthRequestSchema.safeParseAsync(data)

		if (!parsed.success) {
			return StandardResponse.forbidden(
				parsed.error.issues[0]?.message ?? apiMessages.tokenRequired,
			)
		}

		return parsed.data
	} catch (error) {
		if (error instanceof Error && error.message.includes('Failed to parse')) {
			return StandardResponse.forbidden(
				`Invalid request format: ${error.message}`,
			)
		}

		throw error
	}
}

export const parseBearerToken = (request: Request): string | Response => {
	const authorizationHeader = request.headers.get('authorization')
	const parsed = BearerTokenSchema.safeParse(authorizationHeader)

	if (!parsed.success) {
		return StandardResponse.forbidden(apiMessages.refreshTokenInvalid)
	}

	return parsed.data
}

export const firstZodMessage = (error: z.ZodError) =>
	error.issues[0]?.message ?? 'Invalid request data'

export async function parseJsonBody<TSchema extends z.ZodType>(
	request: Request,
	schema: TSchema,
): Promise<z.output<TSchema> | Response> {
	let body: unknown

	try {
		body = await request.json()
	} catch {
		return StandardResponse.badRequest('Invalid JSON in request body')
	}

	const parsed = await schema.safeParseAsync(body)

	if (!parsed.success) {
		return StandardResponse.badRequest(firstZodMessage(parsed.error))
	}

	return parsed.data
}

export async function parseFormRequest<TSchema extends z.ZodType>(
	request: Request,
	schema: TSchema,
): Promise<z.output<TSchema> | Response> {
	let formData: FormData

	try {
		formData = await request.formData()
	} catch {
		return StandardResponse.badRequest('Could not parse form Data')
	}

	const parsed = await schema.safeParseAsync(
		Object.fromEntries(formData.entries()),
	)

	if (!parsed.success) {
		return StandardResponse.badRequest(firstZodMessage(parsed.error))
	}

	return parsed.data
}

export async function parseJsonOrFormRequest<TSchema extends z.ZodType>(
	request: Request,
	schema: TSchema,
): Promise<z.output<TSchema> | Response> {
	const contentType = request.headers.get('content-type')?.toLowerCase() ?? ''

	let body: unknown

	if (contentType.includes('application/json')) {
		try {
			body = await request.json()
		} catch {
			return StandardResponse.badRequest('Invalid JSON in request body')
		}
	} else if (
		contentType.includes('application/x-www-form-urlencoded') ||
		contentType.includes('multipart/form-data')
	) {
		try {
			const formData = await request.formData()
			body = Object.fromEntries(formData.entries())
		} catch {
			return StandardResponse.badRequest('Invalid form data')
		}
	} else {
		return StandardResponse.unsupportedMediaType(
			'Unsupported content-type. Try application/json or application/x-www-form-urlencoded',
		)
	}

	const parsed = await schema.safeParseAsync(body)

	if (!parsed.success) {
		return StandardResponse.badRequest(
			parsed.error.issues[0]?.message ?? 'Invalid request data',
		)
	}

	return parsed.data
}

export const parsePathParams = <TSchema extends z.ZodType>(
	params: unknown,
	schema: TSchema,
	options: {
		message?: string
		useZodMessage?: boolean
	} = {},
): z.output<TSchema> | Response => {
	const parsed = schema.safeParse(params)

	if (!parsed.success) {
		return StandardResponse.badRequest(
			options.useZodMessage
				? (parsed.error.issues[0]?.message ?? 'Invalid path parameters')
				: (options.message ?? 'Invalid path parameters'),
		)
	}

	return parsed.data
}

import { type Route } from './+types/api.boxes.claim'
import { StandardResponse } from '~/lib/responses'
import { claimDevice } from '~/services/transfer-service.server'

import * as z from 'zod/v4'
import { type ZodOpenApiPathItemObject } from 'zod-openapi'

import {
	BadRequestErrorSchema,
	ForbiddenErrorSchema,
	GoneErrorSchema,
	InternalServerErrorSchema,
	MethodNotAllowedErrorSchema,
	NotFoundErrorSchema,
	UnsupportedMediaTypeErrorSchema,
	badRequestResponse,
	forbiddenResponse,
	goneResponse,
	internalServerErrorResponse,
	methodNotAllowedResponse,
	notFoundResponse,
	unsupportedMediaTypeResponse,
} from '~/lib/openapi/errors'

import {
	requestContentTypeJson,
	validateJsonContentType,
} from '~/middleware/content-type-header.server'
import { withAuthenticatedUser } from '~/lib/jwt'

const ClaimDeviceRequestSchema = z
	.object({
		token: z
			.string()
			.trim()
			.min(1, {
				error: 'token is required',
			})
			.meta({
				description: 'Transfer token used to claim the device.',
				example: 'clm_01jv7c9x8n0example',
			}),
	})
	.meta({
		id: 'ClaimDeviceRequest',
		description: 'Payload for claiming a device marked for transfer.',
	})

const ClaimDeviceResponseSchema = z
	.object({
		code: z.literal('Ok').default('Ok'),
		message: z
			.literal('Device successfully claimed!')
			.default('Device successfully claimed!'),
		data: z.object({
			boxId: z.string().meta({
				description: 'ID of the claimed device.',
				example: '5bdbe70f55d0ad001a04edc9',
			}),
		}),
	})
	.meta({
		id: 'ClaimDeviceResponse',
		description: 'Device claim success response.',
	})

export const openapi: ZodOpenApiPathItemObject = {
	post: {
		tags: ['Devices'],
		summary: 'Claim a transferred device',
		description:
			'Claims a device that has been marked for transfer. Requires a valid JWT bearer token and a valid transfer token in the JSON request body.',
		security: [{ bearerAuth: [] }],

		requestBody: {
			required: true,
			content: {
				'application/json': {
					schema: ClaimDeviceRequestSchema,
				},
			},
		},

		responses: {
			200: {
				description: 'Device successfully claimed.',
				content: {
					'application/json': {
						schema: ClaimDeviceResponseSchema,
					},
				},
			},

			400: badRequestResponse(
				BadRequestErrorSchema,
				'Bad request. The transfer token is missing, invalid, or belongs to a device the user already owns.',
			),

			403: forbiddenResponse(
				ForbiddenErrorSchema,
				'Invalid or missing JWT authorization.',
			),

			404: notFoundResponse(NotFoundErrorSchema, 'Device not found.'),

			405: methodNotAllowedResponse(
				MethodNotAllowedErrorSchema,
				'Method not allowed. Only POST is supported.',
			),

			410: goneResponse(
				GoneErrorSchema,
				'The transfer token is invalid or expired.',
			),

			415: unsupportedMediaTypeResponse(
				UnsupportedMediaTypeErrorSchema,
				'Unsupported media type. Use application/json.',
			),

			500: internalServerErrorResponse(
				InternalServerErrorSchema,
				'Internal server error.',
			),
		},
	},
}

const parseClaimDeviceRequest = async (
	request: Request,
): Promise<z.output<typeof ClaimDeviceRequestSchema> | Response> => {
	let body: unknown

	try {
		body = await request.json()
	} catch {
		return StandardResponse.badRequest('Invalid JSON in request body')
	}

	const parsed = await ClaimDeviceRequestSchema.safeParseAsync(body)

	if (!parsed.success) {
		return StandardResponse.badRequest(
			parsed.error.issues[0]?.message ?? 'Invalid claim request',
		)
	}

	return parsed.data
}

export const middleware: Route.MiddlewareFunction[] = [requestContentTypeJson()]

export const action = async ({ request }: Route.ActionArgs) => {
	if (request.method !== 'POST') {
		return StandardResponse.methodNotAllowed('Only POST allowed')
	}

	const contentTypeError = validateJsonContentType(request, ['POST'])
	if (contentTypeError) {
		return contentTypeError
	}

	return withAuthenticatedUser(request, async (user) => {
		const parsedRequest = await parseClaimDeviceRequest(request)

		if (parsedRequest instanceof Response) {
			return parsedRequest
		}

		try {
			const result = await claimDevice(user.id, parsedRequest.token)

			const responseParsed = await ClaimDeviceResponseSchema.safeParseAsync({
				code: 'Ok',
				message: 'Device successfully claimed!',
				data: {
					boxId: result.boxId,
				},
			})

			if (!responseParsed.success) {
				return StandardResponse.internalServerError()
			}

			return StandardResponse.ok(responseParsed.data)
		} catch (err) {
			return handleClaimError(err)
		}
	})
}

const handleClaimError = (err: unknown) => {
	if (err instanceof Error) {
		const message = err.message

		if (message.includes('expired') || message.includes('Invalid or expired'))
			return StandardResponse.gone(message)

		if (message.includes('not found')) return StandardResponse.notFound(message)

		if (
			message.includes('required') ||
			message.includes('Invalid') ||
			message.includes('already own')
		)
			return StandardResponse.badRequest(message)
	}

	return StandardResponse.internalServerError()
}

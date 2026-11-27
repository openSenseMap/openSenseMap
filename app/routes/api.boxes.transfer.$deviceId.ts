import { type Route } from './+types/api.boxes.transfer.$deviceId'
import { getUserFromJwt, withAuthenticatedUser } from '~/lib/jwt'
import { StandardResponse } from '~/lib/responses'
import {
	getDeviceTransfer,
	updateDeviceTransferExpiration,
} from '~/services/transfer-service.server'

import * as z from 'zod/v4'

import {
	DeviceTransferClaimSchema,
	DeviceTransferTokenSchema,
} from '~/lib/openapi/schemas/claim'

import {
	BadRequestErrorSchema,
	ForbiddenErrorSchema,
	InternalServerErrorSchema,
	MethodNotAllowedErrorSchema,
	NotFoundErrorSchema,
	badRequestResponse,
	forbiddenResponse,
	internalServerErrorResponse,
	methodNotAllowedResponse,
	notFoundResponse,
} from '~/lib/openapi/errors'
import { DevicePathParamsSchema } from '~/lib/openapi/schemas/common'
import { ZodOpenApiPathItemObject } from 'zod-openapi'
import { requestContentTypeJsonOrForm } from '~/middleware/content-type-header.server'
import { parsePathParams } from '~/lib/request-parsing'

const UpdateDeviceTransferRequestSchema = z
	.object({
		token: DeviceTransferTokenSchema,

		expiresAt: z
			.string({
				error: 'expiresAt is required',
			})
			.trim()
			.min(1, {
				error: 'expiresAt is required',
			})
			.pipe(z.iso.datetime())
			.meta({
				description:
					'New expiration date for the transfer token. Must be in the future.',
				example: '2026-05-22T12:00:00.000Z',
			}),
	})
	.meta({
		id: 'UpdateDeviceTransferRequest',
		description:
			'Payload for updating the expiration date of a transfer token.',
	})

const GetDeviceTransferResponseSchema = z
	.object({
		code: z.literal('Ok').default('Ok'),
		data: DeviceTransferClaimSchema,
	})
	.meta({
		id: 'GetDeviceTransferResponse',
		description: 'Transfer information for a device.',
	})

const UpdateDeviceTransferResponseSchema = z
	.object({
		code: z.literal('Ok').default('Ok'),
		message: z
			.literal('Transfer successfully updated')
			.default('Transfer successfully updated'),
		data: DeviceTransferClaimSchema,
	})
	.meta({
		id: 'UpdateDeviceTransferResponse',
		description: 'Updated transfer information for a device.',
	})

export const openapi: ZodOpenApiPathItemObject = {
	get: {
		tags: ['Devices'],
		summary: 'Get transfer information for a device',
		description:
			'Returns transfer information for a device. Requires JWT authorization. Only the owner of the device can view its transfer information.',
		security: [{ bearerAuth: [] }],

		requestParams: {
			path: DevicePathParamsSchema,
		},

		responses: {
			200: {
				description: 'Transfer information returned successfully.',
				content: {
					'application/json': {
						schema: GetDeviceTransferResponseSchema,
					},
				},
			},

			400: badRequestResponse(
				BadRequestErrorSchema,
				'Bad request. The device id path parameter is missing or invalid.',
			),

			403: forbiddenResponse(
				ForbiddenErrorSchema,
				'Invalid JWT authorization or the authenticated user is not allowed to view this transfer.',
			),

			404: notFoundResponse(
				NotFoundErrorSchema,
				'Device or transfer not found.',
			),

			500: internalServerErrorResponse(
				InternalServerErrorSchema,
				'Internal server error.',
			),
		},
	},

	put: {
		tags: ['Devices'],
		summary: 'Update transfer expiration date',
		description:
			'Updates the expiration date of a transfer token. Requires JWT authorization. Only the owner of the device can update its transfer information. The request body can be sent as JSON or form data.',
		security: [{ bearerAuth: [] }],

		requestParams: {
			path: DevicePathParamsSchema,
		},

		requestBody: {
			required: true,
			content: {
				'application/json': {
					schema: UpdateDeviceTransferRequestSchema,
				},
				'application/x-www-form-urlencoded': {
					schema: UpdateDeviceTransferRequestSchema,
				},
			},
		},

		responses: {
			200: {
				description: 'Transfer expiration date updated successfully.',
				content: {
					'application/json': {
						schema: UpdateDeviceTransferResponseSchema,
					},
				},
			},

			400: badRequestResponse(
				BadRequestErrorSchema,
				'Bad request. The device id, token, or expiration date is missing or invalid.',
			),

			403: forbiddenResponse(
				ForbiddenErrorSchema,
				'Invalid JWT authorization or the authenticated user is not allowed to update this transfer.',
			),

			404: notFoundResponse(
				NotFoundErrorSchema,
				'Device or transfer not found.',
			),

			405: methodNotAllowedResponse(
				MethodNotAllowedErrorSchema,
				'Method not allowed. Only PUT is supported for updating transfer information.',
			),

			500: internalServerErrorResponse(
				InternalServerErrorSchema,
				'Internal server error.',
			),
		},
	},
}

const toTransferApiData = (transfer: {
	id: string
	boxId: string
	token: string
	expiresAt: Date | string | null
	createdAt: Date | string
	updatedAt: Date | string
}) => ({
	id: transfer.id,
	boxId: transfer.boxId,
	token: transfer.token,
	expiresAt:
		transfer.expiresAt instanceof Date
			? transfer.expiresAt.toISOString()
			: transfer.expiresAt,
	createdAt:
		transfer.createdAt instanceof Date
			? transfer.createdAt.toISOString()
			: transfer.createdAt,
	updatedAt:
		transfer.updatedAt instanceof Date
			? transfer.updatedAt.toISOString()
			: transfer.updatedAt,
})

export const middleware: Route.MiddlewareFunction[] = [
	requestContentTypeJsonOrForm(['PUT']),
]

export const loader = async ({ params, request }: Route.LoaderArgs) => {
	const parsedParams = parsePathParams(params, DevicePathParamsSchema)

	if (parsedParams instanceof Response) {
		return parsedParams
	}

	return withAuthenticatedUser(request, async (user) => {
		try {
			const transfer = await getDeviceTransfer(user.id, parsedParams.deviceId)

			const responseParsed =
				await GetDeviceTransferResponseSchema.safeParseAsync({
					code: 'Ok',
					data: toTransferApiData(transfer),
				})

			if (!responseParsed.success) {
				return StandardResponse.internalServerError()
			}

			return StandardResponse.ok(responseParsed.data)
		} catch (err) {
			return handleTransferError(err)
		}
	})
}

export const action = async ({ params, request }: Route.ActionArgs) => {
	const jwtResponse = await getUserFromJwt(request)

	if (typeof jwtResponse === 'string')
		return StandardResponse.forbidden(
			'Invalid JWT authorization. Please sign in to obtain new JWT.',
		)

	const { deviceId } = params

	if (!deviceId) return StandardResponse.badRequest('Device ID is required')

	if (request.method !== 'PUT') return StandardResponse.methodNotAllowed('')

	const contentType = request.headers.get('content-type')
	const isJson = contentType?.includes('application/json')

	return handleUpdateTransfer(request, jwtResponse, deviceId, isJson)
}

const handleUpdateTransfer = async (
	request: Request,
	user: any,
	deviceId: string,
	isJson: boolean | undefined,
) => {
	try {
		let token: string | undefined
		let expiresAt: string | undefined

		if (isJson) {
			const body = await request.json()
			token = body.token
			expiresAt = body.expiresAt
		} else {
			const formData = await request.formData()
			token = formData.get('token')?.toString()
			expiresAt = formData.get('expiresAt')?.toString()
		}

		if (!token) return StandardResponse.badRequest('token is required')

		if (!expiresAt) return StandardResponse.badRequest('expiresAt is required')

		const updated = await updateDeviceTransferExpiration(
			user.id,
			deviceId,
			token,
			expiresAt,
		)

		return StandardResponse.ok({
			message: 'Transfer successfully updated',
			data: {
				id: updated.id,
				boxId: updated.boxId,
				token: updated.token,
				expiresAt: updated.expiresAt,
				createdAt: updated.createdAt,
				updatedAt: updated.updatedAt,
			},
		})
	} catch (err) {
		return handleTransferError(err)
	}
}

const handleTransferError = (err: unknown) => {
	if (err instanceof Error) {
		const message = err.message

		if (message.includes('not found')) return StandardResponse.notFound(message)

		if (
			message.includes('permission') ||
			message.includes("don't have") ||
			message.includes('not the owner')
		)
			return StandardResponse.forbidden(message)

		if (
			message.includes('expired') ||
			message.includes('Invalid') ||
			message.includes('required') ||
			message.includes('format') ||
			message.includes('future')
		)
			return StandardResponse.badRequest(message)
	}

	return StandardResponse.internalServerError()
}

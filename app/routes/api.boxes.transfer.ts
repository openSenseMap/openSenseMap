import { type Route } from './+types/api.boxes.transfer'
import { withAuthenticatedUser } from '~/lib/jwt'
import { StandardResponse } from '~/lib/responses'
import {
	createDeviceTransfer,
	removeDeviceTransfer,
	validateTransferParams,
} from '~/services/transfer-service.server'

import * as z from 'zod/v4'
import { type ZodOpenApiPathItemObject } from 'zod-openapi'

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

import { parseJsonOrFormRequest } from '~/lib/request-parsing'
import { type User } from '~/db/schema'
import { requestContentTypeJsonOrForm } from '~/middleware/content-type-header.server'
import { logServerError } from '~/lib/sentry.server'

const TransferTokenSchema = z.string().min(1).meta({
	description: 'Transfer token used to claim or revoke the device transfer.',
	example: 'clm_01jv7c9x8n0example',
})

const CreateDeviceTransferRequestSchema = z
	.object({
		boxId: z
			.string({
				error: 'boxId is required',
			})
			.trim()
			.min(1, {
				error: 'boxId is required',
			}),

		expiresAt: z.iso.datetime().optional(),

		date: z.iso.datetime().optional().meta({
			description:
				'Legacy alias for `expiresAt`. Prefer `expiresAt` for new clients.',
			deprecated: true,
		}),
	})
	.transform((data) => ({
		boxId: data.boxId,
		expiresAt: data.expiresAt ?? data.date,
	}))
	.meta({
		id: 'CreateDeviceTransferRequest',
		description: 'Payload for marking a device for transfer.',
	})

const RemoveDeviceTransferRequestSchema = z
	.object({
		boxId: z.string().min(1).meta({
			description: 'ID of the device to remove from transfer.',
			example: '5bdbe70f55d0ad001a04edc9',
		}),

		token: TransferTokenSchema,
	})
	.meta({
		id: 'RemoveDeviceTransferRequest',
		description: 'Payload for revoking a device transfer token.',
	})

const DeviceTransferDataSchema = z
	.object({
		id: z.string().optional().meta({
			description: 'ID of the transfer claim.',
			example: 'clm_01jv7c9x8n0example',
		}),

		boxId: z.string().meta({
			description: 'ID of the device marked for transfer.',
			example: '5bdbe70f55d0ad001a04edc9',
		}),

		token: TransferTokenSchema,

		expiresAt: z.iso.datetime().meta({
			description: 'Expiration date of the transfer token.',
			example: '2026-05-22T12:00:00.000Z',
		}),
	})
	.meta({
		id: 'DeviceTransferData',
		description: 'Transfer token information for a device.',
	})

const CreateDeviceTransferResponseSchema = z
	.object({
		code: z.literal('Created').default('Created'),
		message: z
			.literal('Device successfully prepared for transfer')
			.default('Device successfully prepared for transfer'),
		data: DeviceTransferDataSchema,
	})
	.meta({
		id: 'CreateDeviceTransferResponse',
		description: 'Response returned after creating a transfer token.',
	})

export const openapi: ZodOpenApiPathItemObject = {
	post: {
		tags: ['Devices'],
		summary: 'Mark a device for transfer',
		description:
			'Marks a device for transfer to another user account and returns a transfer token. Requires JWT authorization. The request body can be sent as JSON or form data.',
		security: [{ bearerAuth: [] }],

		requestBody: {
			required: true,
			content: {
				'application/json': {
					schema: CreateDeviceTransferRequestSchema,
				},
				'application/x-www-form-urlencoded': {
					schema: CreateDeviceTransferRequestSchema,
				},
			},
		},

		responses: {
			201: {
				description: 'Device successfully prepared for transfer.',
				content: {
					'application/json': {
						schema: CreateDeviceTransferResponseSchema,
					},
				},
			},

			400: badRequestResponse(
				BadRequestErrorSchema,
				'Bad request. This can happen when `boxId` is missing or invalid, the expiration date has an invalid format, or the expiration date is not in the future.',
			),

			403: forbiddenResponse(
				ForbiddenErrorSchema,
				'Invalid JWT authorization or the authenticated user is not allowed to transfer this device.',
			),

			404: notFoundResponse(
				NotFoundErrorSchema,
				'Device or transfer record not found.',
			),

			405: methodNotAllowedResponse(
				MethodNotAllowedErrorSchema,
				'Method not allowed. Only POST and DELETE are supported.',
			),

			500: internalServerErrorResponse(
				InternalServerErrorSchema,
				'Internal server error.',
			),
		},
	},

	delete: {
		tags: ['Devices'],
		summary: 'Revoke a device transfer token',
		description:
			'Revokes a transfer token and removes the device from transfer. Requires JWT authorization. The request body can be sent as JSON or form data.',
		security: [{ bearerAuth: [] }],

		requestBody: {
			required: true,
			content: {
				'application/json': {
					schema: RemoveDeviceTransferRequestSchema,
				},
				'application/x-www-form-urlencoded': {
					schema: RemoveDeviceTransferRequestSchema,
				},
			},
		},

		responses: {
			204: {
				description: 'Transfer token revoked successfully.',
			},

			400: badRequestResponse(
				BadRequestErrorSchema,
				'Bad request. This can happen when `boxId` or `token` is missing or invalid, or the transfer token is invalid or expired.',
			),

			403: forbiddenResponse(
				ForbiddenErrorSchema,
				'Invalid JWT authorization or the authenticated user is not allowed to revoke this transfer.',
			),

			404: notFoundResponse(
				NotFoundErrorSchema,
				'Device or transfer record not found.',
			),

			405: methodNotAllowedResponse(
				MethodNotAllowedErrorSchema,
				'Method not allowed. Only POST and DELETE are supported.',
			),

			500: internalServerErrorResponse(
				InternalServerErrorSchema,
				'Internal server error.',
			),
		},
	},
}

export const middleware: Route.MiddlewareFunction[] = [
	requestContentTypeJsonOrForm(['POST', 'DELETE']),
]

export const action = async ({ request }: Route.ActionArgs) => {
	if (request.method !== 'POST' && request.method !== 'DELETE') {
		return StandardResponse.methodNotAllowed('Method Not Allowed')
	}

	return withAuthenticatedUser(request, async (user) => {
		switch (request.method) {
			case 'POST':
				return await handleCreateTransfer(request, user)

			case 'DELETE':
				return await handleRemoveTransfer(request, user)

			default:
				return StandardResponse.methodNotAllowed('Method Not Allowed')
		}
	})
}

const handleCreateTransfer = async (request: Request, user: User) => {
	try {
		const requestData = await parseJsonOrFormRequest(
			request,
			CreateDeviceTransferRequestSchema,
		)

		if (requestData instanceof Response) {
			return requestData
		}

		const validation = validateTransferParams(
			requestData.boxId,
			requestData.expiresAt,
		)

		if (!validation.isValid) {
			return StandardResponse.badRequest(validation.error ?? '')
		}

		const transferCode = await createDeviceTransfer(
			user.id,
			requestData.boxId,
			requestData.expiresAt,
		)

		const responseParsed =
			await CreateDeviceTransferResponseSchema.safeParseAsync({
				code: 'Created',
				message: 'Device successfully prepared for transfer',
				data: {
					...transferCode,
					expiresAt:
						transferCode.expiresAt instanceof Date
							? transferCode.expiresAt.toISOString()
							: transferCode.expiresAt,
				},
			})

		if (!responseParsed.success) {
			return StandardResponse.internalServerError()
		}

		return StandardResponse.created(responseParsed.data)
	} catch (err) {
		return handleTransferError(err, 'create')
	}
}

const handleRemoveTransfer = async (request: Request, user: User) => {
	try {
		const requestData = await parseJsonOrFormRequest(
			request,
			RemoveDeviceTransferRequestSchema,
		)

		if (requestData instanceof Response) {
			return requestData
		}

		await removeDeviceTransfer(user.id, requestData.boxId, requestData.token)

		return StandardResponse.noContent()
	} catch (err) {
		return handleTransferError(err, 'remove')
	}
}

const handleTransferError = (err: unknown, operation: 'create' | 'remove') => {
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

	logServerError('Device transfer operation failed unexpectedly', err, {
		'app.operation': `device_transfer.${operation}`,
	})

	return StandardResponse.internalServerError()
}

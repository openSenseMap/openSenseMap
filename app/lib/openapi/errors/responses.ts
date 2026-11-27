import { z, type ZodType } from 'zod/v4'

export const MessageResponseSchema = z
	.object({
		message: z.string().meta({
			example: 'Operation completed successfully.',
		}),
	})
	.meta({
		id: 'MessageResponse',
	})

export const jsonResponse = (description: string, schema: ZodType) => ({
	description,
	content: {
		'application/json': {
			schema,
		},
	},
})

export const messageResponse = (
	description = 'Operation completed successfully.',
) => jsonResponse(description, MessageResponseSchema)

export const jsonErrorResponse = (description: string, schema: ZodType) =>
	jsonResponse(description, schema)

export const badRequestResponse = (
	schema: ZodType,
	description = 'Bad request.',
) => jsonErrorResponse(description, schema)

export const unauthorizedResponse = (
	schema: ZodType,
	description = 'Unauthorized.',
) => jsonErrorResponse(description, schema)

export const forbiddenResponse = (
	schema: ZodType,
	description = 'Forbidden.',
) => jsonErrorResponse(description, schema)

export const notFoundResponse = (schema: ZodType, description = 'Not found.') =>
	jsonErrorResponse(description, schema)

export const conflictResponse = (schema: ZodType, description = 'Conflict.') =>
	jsonErrorResponse(description, schema)

export const unprocessableContentResponse = (
	schema: ZodType,
	description = 'Unprocessable content.',
) => jsonErrorResponse(description, schema)

export const unsupportedMediaTypeResponse = (
	schema: ZodType,
	description = 'Unsupported media type.',
) => jsonErrorResponse(description, schema)

export const internalServerErrorResponse = (
	schema: ZodType,
	description = 'Internal server error.',
) => jsonErrorResponse(description, schema)

export const badGatewayResponse = (
	schema: ZodType,
	description = 'Bad gateway.',
) => jsonErrorResponse(description, schema)

export const methodNotAllowedResponse = (
	schema: ZodType,
	description = 'Method not allowed.',
) => jsonErrorResponse(description, schema)

export const goneResponse = (schema: ZodType, description = 'Gone.') =>
	jsonErrorResponse(description, schema)

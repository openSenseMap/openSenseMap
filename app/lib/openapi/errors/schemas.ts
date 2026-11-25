import * as z from 'zod/v4'

export const standardErrorResponseSchema = <Code extends string>(
	code: Code,
	messageSchema: z.ZodType<string> = z.string(),
) =>
	z.object({
		code: z.literal(code),
		message: messageSchema,
		error: messageSchema,
	})

export const BadRequestErrorSchema = standardErrorResponseSchema(
	'Bad Request',
	z.string().meta({ example: 'Bad request.' }),
).meta({
	id: 'BadRequestError',
})

export const ConflictErrorSchema = standardErrorResponseSchema(
	'Conflict',
	z.string().meta({ example: 'Conflict.' }),
).meta({
	id: 'ConflictError',
})

export const UnauthorizedErrorSchema = standardErrorResponseSchema(
	'Unauthorized',
	z.string().meta({ example: 'Unauthorized.' }),
).meta({
	id: 'UnauthorizedError',
})

export const UnprocessableContentErrorSchema = standardErrorResponseSchema(
	'Unprocessable Content',
	z.string().meta({ example: 'Unprocessable content.' }),
).meta({
	id: 'UnprocessableContentError',
})

export const UnsupportedMediaTypeErrorSchema = standardErrorResponseSchema(
	'Unsupported Media Type',
	z.string().meta({
		example: 'Unsupported content-type. Try application/json',
	}),
).meta({
	id: 'UnsupportedMediaTypeError',
	description: 'Generic unsupported media type response.',
})

export const ForbiddenErrorSchema = standardErrorResponseSchema(
	'Forbidden',
	z.string().meta({ example: 'Forbidden.' }),
).meta({
	id: 'ForbiddenError',
})

export const NotFoundErrorSchema = standardErrorResponseSchema(
	'Not Found',
	z.string().meta({ example: 'Resource not found.' }),
).meta({
	id: 'NotFoundError',
})

export const InternalServerErrorSchema = standardErrorResponseSchema(
	'Internal Server Error',
	z.string().meta({
		example:
			'The server was unable to complete your request. Please try again later.',
	}),
).meta({
	id: 'InternalServerError',
})

export const BadGatewayErrorSchema = standardErrorResponseSchema(
	'Bad Gateway',
	z.string().meta({
		example: 'Upstream service unavailable.',
	}),
).meta({
	id: 'BadGatewayError',
})

export const MethodNotAllowedErrorSchema = standardErrorResponseSchema(
	'Method Not Allowed',
	z.string().meta({ example: 'Method not allowed.' }),
).meta({
	id: 'MethodNotAllowedError',
})

export const GoneErrorSchema = standardErrorResponseSchema(
	'Gone',
	z.string().meta({
		example: 'The requested resource is no longer available.',
	}),
).meta({
	id: 'GoneError',
	description: 'Generic gone response.',
})

import { type Route } from './+types/api.tags'
import { StandardResponse } from '~/lib/responses'
import { getTags } from '~/services/device-service.server'
import * as z from 'zod/v4'
import { type ZodOpenApiPathItemObject } from 'zod-openapi'
import {
	InternalServerErrorSchema,
	internalServerErrorResponse,
	jsonResponse,
} from '~/lib/openapi/errors'

const TagsResponseSchema = z
	.object({
		code: z.literal('Ok'),
		data: z.array(z.string()).meta({
			description: 'Distinct group tags used by registered devices.',
			example: ['weather', 'school', 'urban'],
		}),
	})
	.meta({
		id: 'TagsResponse',
		description: 'Known device tags.',
	})

export const openapi: ZodOpenApiPathItemObject = {
	get: {
		tags: ['Devices'],
		summary: 'List known device tags',
		responses: {
			200: jsonResponse('Tags returned successfully.', TagsResponseSchema),
			500: internalServerErrorResponse(
				InternalServerErrorSchema,
				'Internal server error.',
			),
		},
	},
}

export async function loader(_args: Route.LoaderArgs) {
	try {
		const tags = await getTags()
		const responseParsed = TagsResponseSchema.safeParse({
			code: 'Ok',
			data: tags,
		})

		if (!responseParsed.success) {
			return StandardResponse.internalServerError()
		}

		return StandardResponse.ok(responseParsed.data)
	} catch {
		return StandardResponse.internalServerError()
	}
}

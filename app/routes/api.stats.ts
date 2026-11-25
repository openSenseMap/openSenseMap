import { type Route } from './+types/api.stats'
import { StandardResponse } from '~/lib/responses'
import { getStatistics } from '~/services/statistics-service.server'

import * as z from 'zod/v4'
import { type ZodOpenApiPathItemObject } from 'zod-openapi'

import {
	BadRequestErrorSchema,
	InternalServerErrorSchema,
	badRequestResponse,
	internalServerErrorResponse,
} from '~/lib/openapi/errors'

const StatsQueryParamsSchema = z
	.object({
		human: z.enum(['true', 'false']).optional().meta({
			description:
				'If `true`, returns compact human-readable values instead of numbers.',
			example: 'false',
		}),
	})
	.meta({
		id: 'StatsQueryParams',
		description: 'Query parameters for statistics.',
	})

const StatsResponseSchema = z
	.union([
		z.tuple([z.number(), z.number(), z.number()]).meta({
			description:
				'Statistics as numeric values: device count, sensor count, and measurement count from the last minute.',
			example: [318, 1024, 393],
		}),

		z.tuple([z.string(), z.string(), z.string()]).meta({
			description:
				'Statistics as compact human-readable strings when `human=true`.',
			example: ['318', '1K', '393'],
		}),
	])
	.meta({
		id: 'StatsResponse',
		description:
			'Statistics response. Returns numbers by default and compact strings when `human=true`.',
	})

export const openapi: ZodOpenApiPathItemObject = {
	get: {
		tags: ['Statistics'],
		summary: 'Get platform statistics',
		description:
			'Returns platform statistics as an array with three values: the number of devices, the number of measurements, and the number of measurements recorded in the last minute. By default the values are numbers. If `human=true`, compact human-readable strings are returned.',

		requestParams: {
			query: StatsQueryParamsSchema,
		},

		responses: {
			200: {
				description: 'Statistics returned successfully.',
				content: {
					'application/json': {
						schema: StatsResponseSchema,
					},
				},
			},

			400: badRequestResponse(
				BadRequestErrorSchema,
				'Bad request. The `human` query parameter must be either `true` or `false`.',
			),

			500: internalServerErrorResponse(
				InternalServerErrorSchema,
				'Internal server error.',
			),
		},
	},
}

const parseStatsQueryParams = (request: Request) => {
	const url = new URL(request.url)
	const query = Object.fromEntries(url.searchParams)

	const parsed = StatsQueryParamsSchema.safeParse(query)

	if (!parsed.success) {
		return StandardResponse.badRequest(
			'Illegal value for parameter human. allowed values: true, false',
		)
	}

	return parsed.data
}

export async function loader({ request }: Route.LoaderArgs) {
	try {
		const query = parseStatsQueryParams(request)

		if (query instanceof Response) {
			return query
		}

		const humanReadable = query.human === 'true'
		const stats = await getStatistics(humanReadable)

		const responseParsed = await StatsResponseSchema.safeParseAsync(stats)

		if (!responseParsed.success) {
			return StandardResponse.internalServerError()
		}

		return StandardResponse.ok(responseParsed.data)
	} catch {
		return StandardResponse.internalServerError()
	}
}

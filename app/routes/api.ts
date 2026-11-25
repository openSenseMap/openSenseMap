import { type Route } from '../+types/root'
import * as z from 'zod/v4'
import { type ZodOpenApiPathItemObject } from 'zod-openapi'
import { apiRoutes as routes } from '~/lib/api-routes'
import { tosApiMiddleware } from '~/middleware/tos-api.server'

export { routes }
export const middleware: Route.MiddlewareFunction[] = [tosApiMiddleware]

const ApiIndexResponseSchema = z.string().meta({
	id: 'ApiIndexResponse',
	description: 'Plain text overview of available API routes.',
	example: 'This is the openSenseMap API',
})

export const openapi: ZodOpenApiPathItemObject = {
	get: {
		tags: ['API'],
		summary: 'Get API route overview',
		responses: {
			200: {
				description: 'Plain text API route overview.',
				content: {
					'text/plain': {
						schema: ApiIndexResponseSchema,
					},
				},
			},
		},
	},
}

export async function loader(_args: Route.LoaderArgs) {
	const lines = [
		`This is the openSenseMap API`,
		'Routes requiring no authentication:',
	]

	for (const r of routes.noauth) lines.push(`${r.method}\t${r.path}`)

	lines.push('\nRoutes requiring valid authentication through JWT:')

	for (const r of routes.auth)
		lines.push(
			`${r.method}\t${r.path}\t${r.deprecationNotice ? 'DEPRECATED: ' + r.deprecationNotice : ''}`,
		)

	return new Response(lines.join('\n'), {
		status: 200,
		headers: { 'Content-Type': 'text/plain; charset=utf-8' },
	})
}

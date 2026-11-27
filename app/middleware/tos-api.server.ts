import { getTosRequirementForUser } from '~/db/models/tos.server'
import { apiRoutes } from '~/lib/api-routes'
import { getUserFromJwt } from '~/lib/jwt'

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

function json(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'content-type': 'application/json; charset=utf-8' },
	})
}

type CompiledRule = {
	method: HttpMethod | '*'
	matcher: RegExp
}

/**
 * Convert a route pattern like "/api/users/me/boxes/:boxId"
 * into a regex like ^/api/users/me/boxes/[^/]+$
 */
function routeToRegex(apiPathPattern: string) {
	const escaped = apiPathPattern
		.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // escape regex special chars
		.replace(/\\:([A-Za-z0-9_]+)/g, '[^/]+') // replace ":param" segments
	return new RegExp(`^${escaped}$`)
}

/**
 * Build allowlist from route metadata:
 * - `auth` routes with `tosExempt: true` bypass ToS checks
 */
const API_TOS_ALLOWLIST: CompiledRule[] = [
	...apiRoutes.auth
		.filter((r: any) => r.tosExempt)
		.map((r: any) => ({
			method: r.method as HttpMethod,
			matcher: routeToRegex(`/api/${r.path}`),
		})),
]

function isAllowedApi(request: Request, pathname: string) {
	const method = request.method as HttpMethod
	return API_TOS_ALLOWLIST.some((rule) => {
		if (rule.method !== '*' && rule.method !== method) return false
		return rule.matcher.test(pathname)
	})
}

export async function tosApiMiddleware(
	{ request }: { request: Request },
	next: () => Promise<Response>,
) {
	const url = new URL(request.url)

	const jwtUser = await getUserFromJwt(request)
	if (typeof jwtUser !== 'object') return next()

	if (isAllowedApi(request, url.pathname)) return next()

	const req = await getTosRequirementForUser(jwtUser.id)
	if (req.mustBlock && req.tos) {
		return json(
			{
				code: 'tos_required',
				tosVersionId: req.tos.id,
				effectiveFrom: req.tos.effectiveFrom,
				acceptBy: req.tos.acceptBy,
			},
			428,
		)
	}

	return next()
}

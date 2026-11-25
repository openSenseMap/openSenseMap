import { redirect } from 'react-router'
import { getTosRequirementForUser } from '~/db/models/tos.server'
import { getUserId } from '~/services/session-service.server'

function isAllowedUiPath(pathname: string) {
	if (pathname.startsWith('/explore')) return true
	if (pathname === '/terms') return true
	if (pathname === '/settings/delete') return true
	if (pathname === '/logout') return true
	if (pathname === '/tos-required') return true
	if (pathname.startsWith('/profile')) return true

	return false
}

export async function tosUiMiddleware(
	{ request }: { request: Request },
	next: () => Promise<Response>,
) {
	const url = new URL(request.url)

	if (url.pathname === '/metrics') {
		return next()
	}

	if (url.pathname.startsWith('/api')) {
		// handled by tos-api middleware
		return next()
	}

	if (isAllowedUiPath(url.pathname)) {
		return next()
	}

	const userId = await getUserId(request)
	if (!userId) return next()

	const req = await getTosRequirementForUser(userId)
	if (req.mustBlock && req.tos) {
		const redirectTo = url.pathname + url.search
		throw redirect(`/tos-required?redirectTo=${encodeURIComponent(redirectTo)}`)
	}

	return next()
}

import { type Route } from './+types/api.users.me.accept-tos'
import { getCurrentEffectiveTos, markTosAccepted } from '~/db/models/tos.server'
import { getUserFromJwt } from '~/lib/jwt'

export async function action({ request }: Route.ActionArgs) {
	if (request.method !== 'POST') {
		return new Response('Method Not Allowed', { status: 405 })
	}

	const jwtUser = await getUserFromJwt(request)
	if (typeof jwtUser !== 'object') {
		return new Response(JSON.stringify({ code: 'invalid_jwt' }), {
			status: 403,
			headers: { 'content-type': 'application/json; charset=utf-8' },
		})
	}

	const tos = await getCurrentEffectiveTos()
	if (!tos) {
		return new Response(JSON.stringify({ code: 'tos_missing' }), {
			status: 500,
			headers: { 'content-type': 'application/json; charset=utf-8' },
		})
	}

	await markTosAccepted({ userId: jwtUser.id, tosId: tos.id })

	return new Response(null, { status: 204 })
}

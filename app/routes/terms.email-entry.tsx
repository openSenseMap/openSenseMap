import { redirect } from 'react-router'
import { type Route } from './+types/terms.email-entry'
import {
	getTosRequirementForUser,
	getValidTosAcceptanceToken,
} from '~/db/models/tos.server'
import {
	getTosFlowSession,
	tosFlowSessionStorage,
} from '~/services/tos-service.server'

export async function loader({ request }: Route.LoaderArgs) {
	const url = new URL(request.url)
	const rawToken = url.searchParams.get('token')?.trim()

	const session = await getTosFlowSession(request)

	if (!rawToken) {
		return redirect('/terms?tosLink=missing', {
			headers: {
				'Set-Cookie': await tosFlowSessionStorage.destroySession(session),
			},
		})
	}

	const token = await getValidTosAcceptanceToken(rawToken)

	if (!token) {
		return redirect('/terms?tosLink=invalid', {
			headers: {
				'Set-Cookie': await tosFlowSessionStorage.destroySession(session),
			},
		})
	}

	const req = await getTosRequirementForUser(token.userId)

	if (!req.tos) {
		return redirect('/terms?tosLink=not_configured', {
			headers: {
				'Set-Cookie': await tosFlowSessionStorage.destroySession(session),
			},
		})
	}

	if (req.accepted) {
		return redirect('/terms?tosLink=already_accepted', {
			headers: {
				'Set-Cookie': await tosFlowSessionStorage.destroySession(session),
			},
		})
	}

	session.set('tokenId', token.id)
	session.set('userId', token.userId)

	return redirect('/terms', {
		headers: {
			'Set-Cookie': await tosFlowSessionStorage.commitSession(session),
			'Cache-Control': 'no-store',
		},
	})
}

export default function TermsEmailEntryRoute() {
	return null
}

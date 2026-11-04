import { data } from 'react-router'
import { type Route } from './+types/resources.tos-grace'
import {
	getTosRequirementForUser,
	markTosAccepted,
} from '~/db/models/tos.server'
import {
	dismissGraceTosVersion,
	getUser,
} from '~/services/session-service.server'

export async function action({ request }: Route.ActionArgs) {
	const user = await getUser(request)
	if (!user) {
		return data({ error: 'authentication_required' }, { status: 401 })
	}

	const formData = await request.formData()
	const intent = formData.get('intent')
	const tosVersionId = formData.get('tosVersionId')

	if (
		(intent !== 'accept' && intent !== 'dismiss') ||
		typeof tosVersionId !== 'string'
	) {
		return data({ error: 'invalid_request' }, { status: 400 })
	}

	const requirement = await getTosRequirementForUser(user.id)
	if (!requirement.tos || requirement.tos.id !== tosVersionId) {
		return data({ error: 'tos_not_current' }, { status: 409 })
	}

	if (requirement.accepted) {
		return data({ ok: true })
	}

	if (intent === 'accept') {
		if (formData.get('accepted') !== 'on') {
			return data({ error: 'tos_must_accept' }, { status: 400 })
		}

		await markTosAccepted({ userId: user.id, tosId: requirement.tos.id })
		return data({ ok: true })
	}

	if (!requirement.inGrace) {
		return data({ error: 'grace_period_ended' }, { status: 409 })
	}

	const setCookie = await dismissGraceTosVersion(request, requirement.tos.id)

	return data(
		{ ok: true },
		{
			headers: { 'Set-Cookie': setCookie },
		},
	)
}

import { redirect } from 'react-router'
import { type Route } from './+types/account.confirm-email'
import {
	getUserSession,
	authSessionStorage,
} from '~/services/session-service.server'
import { confirmEmail } from '~/services/user-service.server'

export async function loader({ request }: Route.LoaderArgs) {
	const url = new URL(request.url)
	const token = url.searchParams.get('token')

	if (!token) {
		return redirect('/settings/account?emailConfirm=missing_params')
	}

	const updated = await confirmEmail(token)

	if (!updated) {
		return redirect('/settings/account?emailConfirm=invalid_or_expired')
	}

	const session = await getUserSession(request)

	return redirect('/settings/account?emailConfirm=ok', {
		headers: {
			'Set-Cookie': await authSessionStorage.commitSession(session),
		},
	})
}

export default function ConfirmEmailRoute() {
	return null
}

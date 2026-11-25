import { redirect } from 'react-router'
import { type Route } from './+types/logout'
import { logout } from '~/services/session-service.server'

export async function action({ request }: Route.ActionArgs) {
	const formData = await request.formData()
	const redirectTo = formData.get('redirectTo')?.toString() || '/explore'
	return logout({ request, redirectTo })
}

export async function loader() {
	return redirect('/explore/login')
}

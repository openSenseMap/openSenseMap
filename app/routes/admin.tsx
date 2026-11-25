import { Outlet } from 'react-router'
import { type Route } from './+types/admin'
import { requireAdminMiddleware } from '~/services/session-service.server'

export const middleware: Route.MiddlewareFunction[] = [requireAdminMiddleware]

export default function AdminLayout() {
	return (
		<div className="min-h-screen">
			<header className="border-b px-6 py-4">
				<h1 className="text-xl font-semibold">Admin</h1>
			</header>

			<div className="mx-auto max-w-7xl p-6">
				<Outlet />
			</div>
		</div>
	)
}

import { Outlet } from 'react-router'

export default function AdminDevicesLayoutRoute() {
	return (
		<main className="container mx-auto p-4">
			<Outlet />
		</main>
	)
}

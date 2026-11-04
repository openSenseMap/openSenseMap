import { Link } from 'react-router'

export default function AdminIndexRoute() {
	return (
		<div className="flex min-h-[60vh] flex-col items-center justify-center">
			<h1 className="text-2xl font-semibold">openSenseMap Admin Tool</h1>

			<div className="mt-6 flex gap-4">
				<div className="rounded border p-4">
					<Link to="/admin/users">Edit users</Link>
				</div>
				<div className="rounded border p-4">
					<Link to="/admin/devices">Edit devices</Link>
				</div>
				<div className="rounded border p-4">
					<Link to="/admin/integrations">Integration services</Link>
				</div>
			</div>
		</div>
	)
}

import { Link } from 'react-router'
import { type Route } from './+types/admin.users._index'
import { getUsers } from '~/db/models/user.server'
import { useTranslation } from 'react-i18next'
import { useHydrated } from '~/hooks/use-hydrated'

export async function loader({}: Route.LoaderArgs) {
	const users = await getUsers()

	return { users }
}

export default function AdminUsersIndexRoute({
	loaderData,
}: Route.ComponentProps) {
	const { users } = loaderData
	const { i18n } = useTranslation()
	const hydrated = useHydrated()

	return (
		<div className="flex w-full flex-col">
			<div className="flex">
				<span className="p-4 text-lg font-bold">
					Total users: {users.length}
				</span>
			</div>

			<div className="flex justify-center">
				<table>
					<thead className="border-2 border-black">
						<tr>
							<th className="border-r-2 border-black p-2">Name</th>
							<th className="border-r-2 border-black p-2">E-Mail</th>
							<th className="border-r-2 border-black p-2">Confirmed</th>
							<th className="border-r-2 border-black p-2">Role</th>
							<th className="border-r-2 border-black p-2">Created at</th>
							<th className="border-r-2 border-black p-2">Updated at</th>
							<th className="border-r-2 border-black p-2"># Devices</th>
							<th className="border-r-2 border-black p-2"></th>
						</tr>
					</thead>

					<tbody className="border-2 border-black">
						{users.map((user) => (
							<tr key={user.id} className="border-2 border-black">
								<td className="border-r-2 border-black p-2">{user.name}</td>
								<td className="border-r-2 border-black p-2">{user.email}</td>
								<td className="border-r-2 border-black p-2">
									{String(Boolean(user.emailIsConfirmed))}
								</td>
								<td className="border-r-2 border-black p-2">{user.role}</td>
								<td className="border-r-2 border-black p-2">
									{hydrated &&
										new Date(user.createdAt).toLocaleString(i18n.language)}
								</td>
								<td className="border-r-2 border-black p-2">
									{hydrated &&
										new Date(user.updatedAt).toLocaleString(i18n.language)}
								</td>
								{/* <td className="border-r-2 border-black p-2">
									{user.devicesCount}
								</td> */}
								<td className="border-r-2 border-black p-2">
									<Link
										to={`/admin/users/${user.id}`}
										className="cursor-pointer hover:underline hover:underline-offset-2"
									>
										Open
									</Link>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	)
}

import { Form, Link, redirect } from 'react-router'
import invariant from 'tiny-invariant'
import { type Route } from './+types/admin.users.$userId'
import { getUserDevices } from '~/db/models/device.server'
import {
	deleteUserById,
	// execUserAdminAction,
	getUserById,
	updateUserById,
} from '~/db/models/user.server'
import { adminUserContext } from '~/services/session-service.server'

type ActionData = {
	error?: boolean
	message?: string
	fieldErrors?: {
		name?: string
		email?: string
		language?: string
	}
}

export async function loader({ params }: Route.LoaderArgs) {
	invariant(params.userId, 'Expected params.userId')

	const [user, devices] = await Promise.all([
		getUserById(params.userId),
		getUserDevices(params.userId),
	])

	if (!user) {
		throw new Response('User not found', { status: 404 })
	}

	return { user, devices }
}

export async function action({
	request,
	params,
	context,
}: Route.ActionArgs): Promise<Response | ActionData> {
	const adminUser = context.get(adminUserContext)
	invariant(adminUser, 'Expected admin user in context')
	invariant(params.userId, 'Expected params.userId')

	const formData = await request.formData()
	const intent = formData.get('_action')

	switch (intent) {
		case 'update': {
			const name = getString(formData, 'name').trim()
			const email = getString(formData, 'email').trim()
			const language = getString(formData, 'language').trim()
			const role = getRole(formData.get('role'))
			const emailIsConfirmed = formData.get('email-confirmed') === 'on'

			const fieldErrors: ActionData['fieldErrors'] = {}

			if (!name) fieldErrors.name = 'Name is required'
			if (!email) fieldErrors.email = 'Email is required'
			if (!language) fieldErrors.language = 'Language is required'

			if (fieldErrors.name || fieldErrors.email || fieldErrors.language) {
				return {
					error: true,
					message: 'Please fix the highlighted fields.',
					fieldErrors,
				}
			}

			try {
				await updateUserById(params.userId, {
					name,
					email,
					language,
					role,
					emailIsConfirmed,
				})

				return redirect(`/admin/users/${params.userId}`)
			} catch (error) {
				return {
					error: true,
					message:
						error instanceof Error ? error.message : 'Failed to update user.',
				}
			}
		}

		case 'delete': {
			if (adminUser.id === params.userId) {
				return {
					error: true,
					message: 'You cannot delete your own admin account from this screen.',
				}
			}

			try {
				await deleteUserById(params.userId)
				return redirect('/admin/users')
			} catch (error) {
				return {
					error: true,
					message:
						error instanceof Error ? error.message : 'Failed to delete user.',
				}
			}
		}

		// case 'passwordReset':
		// case 'resendWelcomeMail':
		// case 'resendEmailConfirmation': {
		// 	try {
		// 		await execUserAdminAction(params.userId, intent)
		// 		return {
		// 			error: false,
		// 			message: `${intent} executed successfully.`,
		// 		}
		// 	} catch (error) {
		// 		return {
		// 			error: true,
		// 			message:
		// 				error instanceof Error ? error.message : `Failed to run ${intent}.`,
		// 		}
		// 	}
		// }

		default:
			return {
				error: true,
				message: 'Unknown action.',
			}
	}
}

export default function AdminUserDetailRoute({
	loaderData,
	actionData,
}: Route.ComponentProps) {
	const { user, devices } = loaderData

	return (
		<>
			<div className="mb-4">
				<Link
					to="/admin/users"
					className="text-sm underline underline-offset-2"
				>
					← Back to users
				</Link>
			</div>

			<div className="mt-10 sm:mt-0">
				<div className="md:grid md:grid-cols-3 md:gap-6">
					<div className="md:col-span-1">
						<div className="px-4 sm:px-0">
							<h3 className="text-lg leading-6 font-medium text-gray-900">
								Personal Information
							</h3>
						</div>
					</div>

					<div className="mt-5 md:col-span-2 md:mt-0">
						{actionData?.message ? (
							<p
								className={
									actionData.error ? 'mb-4 text-red-600' : 'mb-4 text-green-700'
								}
							>
								{actionData.message}
							</p>
						) : null}

						<Form method="post">
							<div className="overflow-hidden shadow-sm sm:rounded-md">
								<div className="bg-white px-4 py-5 sm:p-6">
									<fieldset>
										<div className="grid grid-cols-6 gap-6">
											<div className="col-span-6 sm:col-span-3">
												<label
													htmlFor="name"
													className="block text-sm font-medium text-gray-700"
												>
													Name
												</label>
												<input
													type="text"
													name="name"
													id="name"
													defaultValue={user.name}
													className="mt-1 block w-full rounded-md border-gray-300 shadow-xs sm:text-sm"
												/>
												{actionData?.fieldErrors?.name ? (
													<p className="mt-1 text-sm text-red-600">
														{actionData.fieldErrors.name}
													</p>
												) : null}
											</div>

											<div className="col-span-6 sm:col-span-3">
												<label
													htmlFor="email"
													className="block text-sm font-medium text-gray-700"
												>
													E-Mail
												</label>
												<input
													type="email"
													name="email"
													id="email"
													defaultValue={user.email}
													className="mt-1 block w-full rounded-md border-gray-300 shadow-xs sm:text-sm"
												/>
												{actionData?.fieldErrors?.email ? (
													<p className="mt-1 text-sm text-red-600">
														{actionData.fieldErrors.email}
													</p>
												) : null}
											</div>

											<div className="col-span-6 sm:col-span-4">
												<div className="mt-4 space-y-4">
													<div className="flex items-start">
														<div className="flex h-5 items-center">
															<input
																id="email-confirmed"
																name="email-confirmed"
																type="checkbox"
																defaultChecked={Boolean(user.emailIsConfirmed)}
																className="h-4 w-4 rounded border-gray-300 text-indigo-600"
															/>
														</div>
														<div className="ml-3 text-sm">
															<label
																htmlFor="email-confirmed"
																className="font-medium text-gray-700"
															>
																E-Mail confirmed
															</label>
														</div>
													</div>
												</div>
											</div>

											<div className="col-span-6 sm:col-span-3">
												<label
													htmlFor="language"
													className="block text-sm font-medium text-gray-700"
												>
													Language
												</label>
												<input
													type="text"
													id="language"
													name="language"
													defaultValue={user.language ?? ''}
													className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-xs sm:text-sm"
												/>
												{actionData?.fieldErrors?.language ? (
													<p className="mt-1 text-sm text-red-600">
														{actionData.fieldErrors.language}
													</p>
												) : null}
											</div>

											<div className="col-span-6">
												<label
													htmlFor="role"
													className="block text-sm font-medium text-gray-700"
												>
													Role
												</label>
												<select
													id="role"
													name="role"
													className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-xs sm:text-sm"
													defaultValue={user.role ?? 'user'}
												>
													<option value="admin">Admin</option>
													<option value="user">User</option>
												</select>
											</div>

											<div className="col-span-6 sm:col-span-3 lg:col-span-2">
												<label
													htmlFor="user-id"
													className="block text-sm font-medium text-gray-700"
												>
													User ID
												</label>
												<input
													type="text"
													name="user-id"
													id="user-id"
													defaultValue={user.id}
													disabled
													className="mt-1 block w-full rounded-md border-gray-300 bg-gray-100 shadow-xs sm:text-sm"
												/>
											</div>

											<div className="col-span-6 sm:col-span-6 lg:col-span-2">
												<label
													htmlFor="created-at"
													className="block text-sm font-medium text-gray-700"
												>
													Created at
												</label>
												<input
													type="text"
													name="created-at"
													id="created-at"
													defaultValue={String(user.createdAt)}
													disabled
													className="mt-1 block w-full rounded-md border-gray-300 bg-gray-100 shadow-xs sm:text-sm"
												/>
											</div>

											<div className="col-span-6 sm:col-span-3 lg:col-span-2">
												<label
													htmlFor="updated-at"
													className="block text-sm font-medium text-gray-700"
												>
													Updated at
												</label>
												<input
													type="text"
													name="updated-at"
													id="updated-at"
													defaultValue={String(user.updatedAt)}
													disabled
													className="mt-1 block w-full rounded-md border-gray-300 bg-gray-100 shadow-xs sm:text-sm"
												/>
											</div>
										</div>
									</fieldset>
								</div>

								<div className="flex justify-between bg-gray-50 px-4 py-3 text-right sm:px-6">
									<div className="flex gap-2">
										<button
											type="submit"
											name="_action"
											value="passwordReset"
											className="inline-flex justify-center rounded-md border border-transparent bg-violet-700 px-4 py-2 text-sm font-medium text-white shadow-xs hover:bg-indigo-700"
										>
											Reset password
										</button>

										<button
											type="submit"
											name="_action"
											value="resendWelcomeMail"
											className="inline-flex justify-center rounded-md border border-transparent bg-violet-700 px-4 py-2 text-sm font-medium text-white shadow-xs hover:bg-indigo-700"
										>
											Resend Welcome Mail
										</button>

										<button
											type="submit"
											name="_action"
											value="resendEmailConfirmation"
											className="inline-flex justify-center rounded-md border border-transparent bg-violet-700 px-4 py-2 text-sm font-medium text-white shadow-xs hover:bg-indigo-700"
										>
											Resend Email Confirmation
										</button>
									</div>

									<div className="flex gap-2">
										<button
											type="submit"
											name="_action"
											value="delete"
											className="inline-flex justify-center rounded-md border border-transparent bg-red-700 px-4 py-2 text-sm font-medium text-white shadow-xs hover:bg-red-700"
											onClick={(e) => {
												const ok = window.confirm(
													'Are you sure you want to delete this user?',
												)
												if (!ok) e.preventDefault()
											}}
										>
											Delete user
										</button>

										<button
											type="submit"
											name="_action"
											value="update"
											className="inline-flex justify-center rounded-md border border-transparent bg-blue-700 px-4 py-2 text-sm font-medium text-white shadow-xs hover:bg-blue-700"
										>
											Update user
										</button>
									</div>
								</div>
							</div>
						</Form>
					</div>
				</div>
			</div>

			<div className="hidden sm:block" aria-hidden="true">
				<div className="py-5">
					<div className="border-t border-gray-200" />
				</div>
			</div>

			<div className="mt-10 sm:mt-0">
				<div className="md:grid md:grid-cols-3 md:gap-6">
					<div className="md:col-span-1">
						<div className="px-4 sm:px-0">
							<h3 className="text-lg leading-6 font-medium text-gray-900">
								Devices
							</h3>
						</div>
					</div>

					<div className="mt-5 md:col-span-2 md:mt-0">
						<div className="overflow-hidden shadow-sm sm:rounded-md">
							<div className="space-y-6 bg-white px-4 py-5 sm:p-6">
								<table>
									<thead className="border-2 border-black">
										<tr>
											<th className="border-r-2 border-black p-2">Name</th>
											<th className="border-r-2 border-black p-2">Exposure</th>
											<th className="border-r-2 border-black p-2">Model</th>
											<th className="border-r-2 border-black p-2">Status</th>
											<th className="border-r-2 border-black p-2"></th>
										</tr>
									</thead>

									<tbody className="border-2 border-black">
										{devices.map((device) => (
											<tr key={device.id} className="border-2 border-black">
												<td className="border-r-2 border-black p-2">
													{device.name}
												</td>
												<td className="border-r-2 border-black p-2">
													{device.exposure}
												</td>
												<td className="border-r-2 border-black p-2">
													{device.model}
												</td>
												<td className="border-r-2 border-black p-2">
													{device.status}
												</td>
												<td className="border-r-2 border-black p-2">
													<Link
														to={`/admin/devices/${device.id}`}
														className="cursor-pointer hover:underline hover:underline-offset-2"
													>
														Open
													</Link>
												</td>
											</tr>
										))}
									</tbody>
								</table>

								{devices.length === 0 ? (
									<p className="text-sm text-gray-500">
										This user has no devices.
									</p>
								) : null}
							</div>
						</div>
					</div>
				</div>
			</div>
		</>
	)
}

function getString(formData: FormData, key: string) {
	const value = formData.get(key)
	return typeof value === 'string' ? value : ''
}

function getRole(value: FormDataEntryValue | null): 'admin' | 'user' {
	return value === 'admin' ? 'admin' : 'user'
}

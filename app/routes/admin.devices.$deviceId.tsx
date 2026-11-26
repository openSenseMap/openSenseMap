import { useMemo, useState } from 'react'
import { Form, Link, redirect } from 'react-router'
import invariant from 'tiny-invariant'
import { type Route } from './+types/admin.devices.$deviceId'

import {
	getDevice,
	updateDevice,
	deleteDevice,
	type UpdateDeviceArgs,
} from '~/db/models/device.server'
import { getUsers } from '~/db/models/user.server'

type ActionData = {
	formError?: string
	fieldErrors?: {
		name?: string
		latitude?: string
		longitude?: string
	}
}

export async function loader({ params }: Route.LoaderArgs) {
	invariant(params.deviceId, 'Expected params.deviceId')

	const [device, users] = await Promise.all([
		getDevice({ id: params.deviceId }),
		getUsers(),
	])

	if (!device) {
		throw new Response('Device not found', { status: 404 })
	}

	return {
		device,
		users,
	}
}

export async function action({
	request,
	params,
}: Route.ActionArgs): Promise<ActionData | Response> {
	invariant(params.deviceId, 'Expected params.deviceId')

	const formData = await request.formData()
	const intent = formData.get('_action')

	if (intent === 'delete') {
		await deleteDevice({ id: params.deviceId })
		return redirect('/admin/devices')
	}

	if (intent !== 'update') {
		return {
			formError: 'Unknown action',
		}
	}

	const name = getString(formData, 'name')
	const exposure = getOptionalString(formData, 'exposure')
	const description = getOptionalString(formData, 'description')
	const website = getOptionalString(formData, 'website')
	const link = getOptionalString(formData, 'link')
	const image = getOptionalString(formData, 'image')
	const model = getOptionalString(formData, 'model')
	const grouptag = getOptionalString(formData, 'grouptag')
	const useAuth = formData.get('useAuth') === 'on'

	const latitudeRaw = getString(formData, 'latitude')
	const longitudeRaw = getString(formData, 'longitude')

	const latitude = Number(latitudeRaw)
	const longitude = Number(longitudeRaw)

	const fieldErrors: ActionData['fieldErrors'] = {}

	if (!name.trim()) {
		fieldErrors.name = 'Name is required'
	}

	if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
		fieldErrors.latitude = 'Latitude must be between -90 and 90'
	}

	if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
		fieldErrors.longitude = 'Longitude must be between -180 and 180'
	}

	if (fieldErrors.name || fieldErrors.latitude || fieldErrors.longitude) {
		return { fieldErrors }
	}

	const updateArgs: UpdateDeviceArgs = {
		name: name.trim(),
		exposure: exposure || undefined,
		description: normalizeEmpty(description),
		website: normalizeEmpty(website),
		link: normalizeEmpty(link),
		image: normalizeEmpty(image),
		model: normalizeEmpty(model),
		grouptag: parseTags(grouptag),
		useAuth,
		location: {
			lat: latitude,
			lng: longitude,
		},
	}

	try {
		await updateDevice(params.deviceId, updateArgs)
		return redirect(`/admin/devices/${params.deviceId}`)
	} catch (error) {
		console.error(error)
		return {
			formError: error instanceof Error ? error.message : 'Update failed',
		}
	}
}

export default function AdminDeviceDetailRoute({
	loaderData,
	actionData,
}: Route.ComponentProps) {
	const { device, users } = loaderData

	const [deviceLocation, setDeviceLocation] = useState<[number, number]>([
		device.longitude,
		device.latitude,
	])

	const [deviceOwner, setDeviceOwner] = useState<string>(device.userId)

	const selectedOwner = useMemo(() => {
		return users.find((user) => user.id === deviceOwner) ?? null
	}, [users, deviceOwner])

	return (
		<>
			<div className="mb-4">
				<Link
					to="/admin/devices"
					className="text-sm underline underline-offset-2"
				>
					← Back to devices
				</Link>
			</div>

			{actionData?.formError ? (
				<div className="mb-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
					{actionData.formError}
				</div>
			) : null}

			<div className="mt-10 sm:mt-0">
				<div className="md:grid md:grid-cols-3 md:gap-6">
					<div className="md:col-span-1">
						<div className="px-4 sm:px-0">
							<h3 className="text-lg leading-6 font-medium text-gray-900">
								Device details
							</h3>
							<p className="mt-1 text-sm text-gray-600">
								Edit the core device metadata.
							</p>
						</div>
					</div>

					<div className="mt-5 md:col-span-2 md:mt-0">
						<Form method="post">
							<div className="overflow-hidden shadow-sm sm:rounded-md">
								<div className="bg-white px-4 py-5 sm:p-6">
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
												defaultValue={device.name}
												className="mt-1 block w-full rounded-md border-gray-300 shadow-xs"
											/>
											{actionData?.fieldErrors?.name ? (
												<p className="mt-1 text-sm text-red-600">
													{actionData.fieldErrors.name}
												</p>
											) : null}
										</div>

										<div className="col-span-6 sm:col-span-3">
											<label
												htmlFor="owner"
												className="block text-sm font-medium text-gray-700"
											>
												Owner
											</label>
											<select
												value={deviceOwner}
												onChange={(e) => setDeviceOwner(e.target.value)}
												id="owner"
												disabled
												className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-xs disabled:bg-gray-100"
											>
												{users.map((user) => (
													<option key={user.id} value={user.id}>
														{user.name} ({user.email})
													</option>
												))}
											</select>
											<p className="mt-1 text-xs text-gray-500">
												Owner reassignment is not wired here yet. Current:{' '}
												{selectedOwner
													? `${selectedOwner.name} (${selectedOwner.email})`
													: device.userId}
											</p>
										</div>

										<div className="col-span-6">
											<label
												htmlFor="grouptag"
												className="block text-sm font-medium text-gray-700"
											>
												Tags
											</label>
											<input
												type="text"
												name="grouptag"
												id="grouptag"
												defaultValue={(device.tags ?? []).join(',')}
												className="mt-1 block w-full rounded-md border-gray-300 shadow-xs"
											/>
											<p className="mt-1 text-xs text-gray-500">
												Comma-separated
											</p>
										</div>

										<div className="col-span-6">
											<label
												htmlFor="description"
												className="block text-sm font-medium text-gray-700"
											>
												Description
											</label>
											<textarea
												name="description"
												id="description"
												defaultValue={device.description ?? ''}
												rows={4}
												className="mt-1 block w-full rounded-md border-gray-300 shadow-xs"
											/>
										</div>

										<div className="col-span-6 sm:col-span-3">
											<label
												htmlFor="website"
												className="block text-sm font-medium text-gray-700"
											>
												Website
											</label>
											<input
												type="url"
												name="website"
												id="website"
												defaultValue={device.website ?? ''}
												className="mt-1 block w-full rounded-md border-gray-300 shadow-xs"
											/>
										</div>

										<div className="col-span-6 sm:col-span-3">
											<label
												htmlFor="link"
												className="block text-sm font-medium text-gray-700"
											>
												Link
											</label>
											<input
												type="url"
												name="link"
												id="link"
												defaultValue={device.link ?? ''}
												className="mt-1 block w-full rounded-md border-gray-300 shadow-xs"
											/>
										</div>

										<div className="col-span-6 sm:col-span-3">
											<label
												htmlFor="image"
												className="block text-sm font-medium text-gray-700"
											>
												Image URL
											</label>
											<input
												type="url"
												name="image"
												id="image"
												defaultValue={device.image ?? ''}
												className="mt-1 block w-full rounded-md border-gray-300 shadow-xs"
											/>
										</div>

										<div className="col-span-6 sm:col-span-3">
											<label
												htmlFor="model"
												className="block text-sm font-medium text-gray-700"
											>
												Model
											</label>
											<input
												type="text"
												name="model"
												id="model"
												defaultValue={device.model ?? ''}
												className="mt-1 block w-full rounded-md border-gray-300 shadow-xs"
											/>
										</div>

										<div className="col-span-6 sm:col-span-3">
											<div className="space-y-6 bg-white px-4 py-5 sm:p-6">
												<fieldset>
													<legend className="sr-only">Exposure</legend>
													<div
														className="text-base font-medium text-gray-900"
														aria-hidden="true"
													>
														Exposure
													</div>
													<div className="mt-4 space-y-4">
														<div className="flex items-center">
															<input
																id="indoor"
																name="exposure"
																type="radio"
																value="indoor"
																defaultChecked={device.exposure === 'indoor'}
																className="h-4 w-4 border-gray-300"
															/>
															<label
																htmlFor="indoor"
																className="ml-3 block text-sm font-medium text-gray-700"
															>
																Indoor
															</label>
														</div>

														<div className="flex items-center">
															<input
																id="outdoor"
																name="exposure"
																type="radio"
																value="outdoor"
																defaultChecked={device.exposure === 'outdoor'}
																className="h-4 w-4 border-gray-300"
															/>
															<label
																htmlFor="outdoor"
																className="ml-3 block text-sm font-medium text-gray-700"
															>
																Outdoor
															</label>
														</div>

														<div className="flex items-center">
															<input
																id="mobile"
																name="exposure"
																type="radio"
																value="mobile"
																defaultChecked={device.exposure === 'mobile'}
																className="h-4 w-4 border-gray-300"
															/>
															<label
																htmlFor="mobile"
																className="ml-3 block text-sm font-medium text-gray-700"
															>
																Mobile
															</label>
														</div>
													</div>
												</fieldset>
											</div>
										</div>

										<div className="col-span-6 sm:col-span-3">
											<div className="mb-3 flex items-center gap-2">
												<input
													id="useAuth"
													name="useAuth"
													type="checkbox"
													defaultChecked={Boolean(device.useAuth)}
												/>
												<label
													htmlFor="useAuth"
													className="text-sm font-medium text-gray-700"
												>
													Require authentication / API key
												</label>
											</div>

											{/* <Map
												longitude={deviceLocation[0]}
												latitude={deviceLocation[1]}
											>
												<Marker
													longitude={deviceLocation[0]}
													latitude={deviceLocation[1]}
													draggable
													onDragEnd={onMarkerDragEnd}
												/>
											</Map> */}
										</div>

										<div className="col-span-6">
											<label
												htmlFor="longitude"
												className="block text-sm font-medium text-gray-700"
											>
												Longitude
											</label>
											<input
												type="number"
												step="any"
												name="longitude"
												id="longitude"
												value={deviceLocation[0]}
												onChange={(e) => {
													const [, lat] = deviceLocation
													setDeviceLocation([Number(e.target.value), lat])
												}}
												className="mt-1 block w-full rounded-md border-gray-300 shadow-xs"
											/>
											{actionData?.fieldErrors?.longitude ? (
												<p className="mt-1 text-sm text-red-600">
													{actionData.fieldErrors.longitude}
												</p>
											) : null}
										</div>

										<div className="col-span-6">
											<label
												htmlFor="latitude"
												className="block text-sm font-medium text-gray-700"
											>
												Latitude
											</label>
											<input
												type="number"
												step="any"
												name="latitude"
												id="latitude"
												value={deviceLocation[1]}
												onChange={(e) => {
													const [lng] = deviceLocation
													setDeviceLocation([lng, Number(e.target.value)])
												}}
												className="mt-1 block w-full rounded-md border-gray-300 shadow-xs"
											/>
											{actionData?.fieldErrors?.latitude ? (
												<p className="mt-1 text-sm text-red-600">
													{actionData.fieldErrors.latitude}
												</p>
											) : null}
										</div>

										<div className="col-span-6 sm:col-span-3 lg:col-span-2">
											<label
												htmlFor="device-id"
												className="block text-sm font-medium text-gray-700"
											>
												Device ID
											</label>
											<input
												type="text"
												name="device-id"
												id="device-id"
												defaultValue={device.id}
												disabled
												className="mt-1 block w-full rounded-md border-gray-300 bg-gray-100 shadow-xs"
											/>
										</div>

										<div className="col-span-6 sm:col-span-3 lg:col-span-2">
											<label
												htmlFor="status"
												className="block text-sm font-medium text-gray-700"
											>
												Status
											</label>
											<input
												type="text"
												name="status"
												id="status"
												defaultValue={device.status ?? ''}
												disabled
												className="mt-1 block w-full rounded-md border-gray-300 bg-gray-100 shadow-xs"
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
												defaultValue={String(device.createdAt)}
												disabled
												className="mt-1 block w-full rounded-md border-gray-300 bg-gray-100 shadow-xs"
											/>
										</div>

										<div className="col-span-6 sm:col-span-6 lg:col-span-2">
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
												defaultValue={String(device.updatedAt)}
												disabled
												className="mt-1 block w-full rounded-md border-gray-300 bg-gray-100 shadow-xs"
											/>
										</div>

										<div className="col-span-6 sm:col-span-6 lg:col-span-2">
											<label
												htmlFor="public"
												className="block text-sm font-medium text-gray-700"
											>
												Public
											</label>
											<input
												type="text"
												name="public"
												id="public"
												defaultValue={device.public ? 'yes' : 'no'}
												disabled
												className="mt-1 block w-full rounded-md border-gray-300 bg-gray-100 shadow-xs"
											/>
										</div>
									</div>
								</div>

								<div className="flex justify-between bg-gray-50 px-4 py-3 text-right sm:px-6">
									<button
										type="submit"
										name="_action"
										value="delete"
										className="inline-flex justify-center rounded-md border border-transparent bg-red-700 px-4 py-2 text-sm font-medium text-white shadow-xs hover:bg-red-700"
										onClick={(e) => {
											const ok = window.confirm(
												'Are you sure you want to delete this device?',
											)
											if (!ok) e.preventDefault()
										}}
									>
										Delete device
									</button>

									<button
										type="submit"
										name="_action"
										value="update"
										className="inline-flex justify-center rounded-md border border-transparent bg-blue-700 px-4 py-2 text-sm font-medium text-white shadow-xs hover:bg-blue-700"
									>
										Update device
									</button>
								</div>
							</div>
						</Form>
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

function getOptionalString(formData: FormData, key: string) {
	const value = formData.get(key)
	return typeof value === 'string' ? value : null
}

function normalizeEmpty(value: string | null) {
	if (value == null) return undefined
	const trimmed = value.trim()
	return trimmed === '' ? '' : trimmed
}

function parseTags(value: string | null): string[] | undefined {
	if (value == null) return undefined
	const tags = value
		.split(',')
		.map((tag) => tag.trim())
		.filter(Boolean)

	return tags
}

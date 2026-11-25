import { Save, Upload, X } from 'lucide-react'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
	data,
	redirect,
	Form,
	useActionData,
	useLoaderData,
	useOutletContext,
} from 'react-router'
import invariant from 'tiny-invariant'
import { MarkdownContent } from '~/components/markdown-content'
import { Button } from '~/components/ui/button'
import { updateDevice, deleteDevice } from '~/lib/devices-service.server'
import { getDevice, getDeviceWithoutSensors } from '~/models/device.server'
import { type Device } from '~/schema'
import {
	uploadDeviceImage,
	deleteDeviceImage,
	getDeviceImageUrl,
} from '~/utils/s3.server'
import { getUserEmail, getUserId } from '~/utils/session.server'

//*****************************************************
export async function loader({ request, params }: LoaderFunctionArgs) {
	const userId = await getUserId(request)
	if (!userId) return redirect('/')

	const deviceID = params.deviceId
	invariant(typeof deviceID === 'string', 'Device id not found.')

	const deviceData = await getDeviceWithoutSensors({ id: deviceID })

	let imageUrl: string | null = null

	if (deviceData?.image) {
		try {
			imageUrl = await getDeviceImageUrl(deviceData.image)
		} catch (error) {
			console.error('Failed to create presigned image URL:', error)
		}
	}

	return {
		device: deviceData,
		imageUrl,
	}
}

//*****************************************************
export async function action({ request, params }: ActionFunctionArgs) {
	const deviceID = params.deviceId
	const userId = await getUserId(request)
	invariant(typeof deviceID === 'string', 'Device id not found.')
	invariant(typeof userId === 'string', 'User id not found.')

	const device = (await getDevice({ id: deviceID })) as Device

	const formData = await request.formData()

	const { intent, name, exposure, description, website, passwordDelete } =
		Object.fromEntries(formData)

	const image = formData.get('image') as File | null

	const rawGroupTag = formData.get('grouptag')

	let grouptag: string[] | undefined
	if (typeof rawGroupTag === 'string') {
		try {
			grouptag = JSON.parse(rawGroupTag)
		} catch {
			grouptag = []
		}
	}

	const exposureLowerCase =
		typeof exposure === 'string' ? exposure.toLowerCase() : ''

	const errors = {
		exposure: exposure ? null : 'Invalid exposure.',
		passwordDelete: passwordDelete ? null : 'Password is required.',
		image: null as string | null,
	}

	invariant(typeof deviceID === 'string', 'Device id not found.')
	invariant(typeof name === 'string', 'Device name is required.')
	invariant(typeof exposure === 'string', 'Device exposure is required.')
	invariant(
		typeof description === 'string',
		'Device description must be a string.',
	)
	invariant(typeof website === 'string', 'Device website must be a string.')

	if (
		exposureLowerCase !== 'indoor' &&
		exposureLowerCase !== 'outdoor' &&
		exposureLowerCase !== 'mobile' &&
		exposureLowerCase !== 'unknown'
	) {
		return data({
			errors: {
				exposure: 'Invalid exposure.',
				passwordDelete: errors.passwordDelete,
				image: null,
			},
			status: 400,
		})
	}

	switch (intent) {
		case 'save': {
			let imageKey: string | undefined

			if (image && image.size > 0 && image.name !== '') {
				const validTypes = [
					'image/jpeg',
					'image/png',
					'image/webp',
					'image/gif',
				]
				const maxSize = 5 * 1024 * 1024 // 5MB

				if (!validTypes.includes(image.type)) {
					return data({
						errors: {
							exposure: null,
							passwordDelete: null,
							image:
								'Invalid file type. Please upload a JPEG, PNG, WebP, or GIF.',
						},
						status: 400,
					})
				}

				if (image.size > maxSize) {
					return data({
						errors: {
							exposure: null,
							passwordDelete: null,
							image: 'File too large. Maximum size is 5MB.',
						},
						status: 400,
					})
				}

				try {
					imageKey = await uploadDeviceImage(deviceID, image)
				} catch (error) {
					console.error('Image upload error:', error)
					return data({
						errors: {
							exposure: null,
							passwordDelete: null,
							image: 'Failed to upload image. Please try again.',
						},
						status: 500,
					})
				}
			}

			const result = await updateDevice(userId, device, {
				name: String(name),
				exposure: exposureLowerCase,
				description: String(description),
				website: String(website),
				grouptag,
				...(imageKey && { image: imageKey }),
			})

			if (result === 'unauthorized')
				throw new Response('Forbidden', { status: 403 })

			return data({
				errors: { exposure: null, passwordDelete: null, image: null },
				status: 200,
			})
		}
		case 'removeImage': {
			const device = (await getDeviceWithoutSensors({ id: deviceID })) as Device

			if (device?.image) {
				try {
					await deleteDeviceImage(device.image)
				} catch (error) {
					console.error('Failed to delete image:', error)
				}
			}

			await updateDevice(userId, device, {
				image: '',
			})

			return data({
				errors: {
					exposure: null,
					passwordDelete: null,
					image: null,
				},
				status: 200,
			})
		}
		case 'delete': {
			if (errors.passwordDelete) {
				return data({
					errors,
					status: 400,
				})
			}

			if (!device) throw new Response('Device not found', { status: 404 })

			const userEmail = await getUserEmail(request)
			invariant(typeof userEmail === 'string', 'email not found')
			invariant(typeof passwordDelete === 'string', 'password must be a string')

			const result = await deleteDevice(
				{ id: userId, email: userEmail },
				device,
				passwordDelete,
			)

			if (result === 'forbidden') {
				throw new Response('Forbidden', { status: 403 })
			}
			if (result === 'unauthorized') {
				return data(
					{
						errors: {
							exposure: null,
							passwordDelete: 'Invalid password',
							image: null,
						},
					},
					{ status: 400 },
				)
			}
			if (result === 'integration-cleanup-failed') {
				return data(
					{
						errors: {
							exposure: null,
							passwordDelete: null,
							image: null,
							integrationCleanup: true,
						},
					},
					{ status: 503 },
				)
			}

			return redirect('/profile/me')
		}
	}

	return redirect('')
}

//**********************************
export default function () {
	const { device, imageUrl } = useLoaderData<typeof loader>()
	const actionData = useActionData<typeof action>()
	const [passwordDelVal, setPasswordVal] = useState('')
	const nameRef = React.useRef<HTMLInputElement>(null)
	const passwordDelRef = React.useRef<HTMLInputElement>(null)
	const [name, setName] = useState(device?.name)
	const [exposure, setExposure] = useState(device?.exposure)
	const [description, setDescription] = useState(device?.description || '')
	const [tags, setTags] = useState<string[]>(device?.tags ?? [])
	const [newTag, setNewTag] = useState('')
	const [website, setWebsite] = useState(device?.website || '')
	const { t } = useTranslation(['edit-device-general', 'delete-device'])

	const [imagePreview, setImagePreview] = useState<string | null>(
		imageUrl || null,
	)
	const [imageFile, setImageFile] = useState<File | null>(null)
	const [setToastOpen] = useOutletContext<[(_open: boolean) => void]>()

	const addTag = () => {
		const trimmed = newTag.trim()
		if (!trimmed || tags.includes(trimmed)) return

		setTags([...tags, trimmed])
		setNewTag('')
	}

	const removeTag = (tagToRemove: string) => {
		setTags(tags.filter((tag) => tag !== tagToRemove))
	}

	function MarkdownPreview({ value }: { value?: string | null }) {
		if (!value?.trim()) {
			return (
				<div className="rounded border border-dashed border-gray-200 p-4 text-sm text-gray-500">
					{t('no_preview_yet')}
				</div>
			)
		}

		return (
			<div className="rounded border border-gray-200 p-4">
				<MarkdownContent>{value}</MarkdownContent>
			</div>
		)
	}

	const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0]
		if (file) {
			setImageFile(file)
			const reader = new FileReader()
			reader.onloadend = () => {
				setImagePreview(reader.result as string)
			}
			reader.readAsDataURL(file)
		}
	}

	const handleRemoveImage = () => {
		setImageFile(null)
		setImagePreview(null)
	}

	React.useEffect(() => {
		if (actionData) {
			const hasErrors = Object.values(actionData?.errors).some(
				(errorMessage) => errorMessage,
			)

			if (!hasErrors) {
				setToastOpen(true)
			} else if (hasErrors && actionData?.errors?.passwordDelete) {
				passwordDelRef.current?.focus()
			}
		}
	}, [actionData, setToastOpen])

	const hasChanges =
		name !== device?.name ||
		exposure !== device?.exposure ||
		description !== device?.description ||
		website !== device?.website ||
		imageFile !== device?.image ||
		JSON.stringify(tags) !== JSON.stringify(device?.tags ?? [])

	return (
		<div className="grid grid-rows-1">
			<div className="flex min-h-full items-center justify-center">
				<div className="mx-auto w-full font-helvetica">
					<Form method="post" encType="multipart/form-data" noValidate>
						<div>
							<div className="mt-2 flex justify-between">
								<div>
									<h1 className="text-4xl">{t('general')}</h1>
								</div>
								<div>
									<button
										type="submit"
										name="intent"
										value="save"
										disabled={!hasChanges}
										className="h-12 w-12 rounded-full border-[1.5px] border-[#9b9494] hover:bg-[#e7e6e6] disabled:opacity-50"
									>
										<Save className="mx-auto h-5 w-5 lg:h-7 lg:w-7" />
									</button>
								</div>
							</div>
						</div>

						<hr className="my-3 mt-6 h-px border-0 bg-[#dcdada] dark:bg-gray-700" />

						<div className="space-y-5 pt-4">
							{/* Name */}
							<div>
								<label
									htmlFor="name"
									className="txt-base block font-bold tracking-normal"
								>
									Name *
								</label>
								<div className="mt-1">
									<input
										id="name"
										required
										autoFocus={true}
										name="name"
										type="text"
										defaultValue={device?.name}
										onChange={(e) => setName(e.target.value)}
										ref={nameRef}
										aria-describedby="name-error"
										className="w-full rounded border border-gray-200 px-2 py-1 text-base"
									/>
								</div>
							</div>

							{/* Exposure */}
							<div className="mt-3">
								<label
									htmlFor="exposure"
									className="txt-base block font-bold tracking-normal"
								>
									{t('exposure')} *
								</label>
								<div className="mt-1">
									<select
										id="exposure"
										name="exposure"
										defaultValue={device?.exposure || 'UNKNOWN'}
										onChange={(e) =>
											setExposure(
												e.target.value as
													| 'indoor'
													| 'outdoor'
													| 'mobile'
													| 'unknown',
											)
										}
										className="w-full appearance-auto rounded border border-gray-200 px-2 py-1.5 text-base"
									>
										<option value="indoor">{t('indoor')}</option>
										<option value="outdoor">{t('outdoor')}</option>
										<option value="mobile">{t('mobile')}</option>
										<option value="unknown">{t('unknown')}</option>
									</select>
								</div>
							</div>

							{/* Description */}
								<div className="mt-3">
									<label
										htmlFor="description"
										className="txt-base block font-bold tracking-normal"
									>
										{t('description')}
									</label>

									<div className="mt-1 grid gap-4 lg:grid-cols-2">
										<div>
											<textarea
												id="description"
												name="description"
												maxLength={5000}
												value={description}
												onChange={(e) => setDescription(e.target.value)}
												placeholder={`## My station

Installed on the school roof.

- Measures PM2.5
- Measures temperature
- Updated regularly

[Project website](https://example.com)`}
												className="min-h-[220px] w-full rounded border border-gray-200 px-2 py-1.5 font-mono text-base"
											/>
											<p className="text-sm text-gray-500">
												{description.length} / 5000
											</p>
											<p className="mt-1 text-sm text-gray-500">
												{t('markdown_supported')}
											</p>
										</div>

										<div>
											<p className="mb-2 block font-bold tracking-normal">{t('preview')}</p>
											<MarkdownPreview value={description} />
										</div>
									</div>
								</div>

							{/* Website */}
							<div className="mt-3">
								<label
									htmlFor="website"
									className="txt-base block font-bold tracking-normal"
								>
									Website
								</label>
								<div className="mt-1">
									<input
										id="website"
										name="website"
										type="url"
										placeholder="https://example.com"
										value={website}
										onChange={(e) => setWebsite(e.target.value)}
										className="w-full rounded border border-gray-200 px-2 py-1 text-base"
									/>
								</div>
							</div>

							{/* Image Upload */}
							<div className="mt-3">
								<label
									htmlFor="image"
									className="txt-base block font-bold tracking-normal"
								>
									{t('image')}
								</label>
								<div className="mt-1">
									<div className="relative inline-block">
										{imagePreview ? (
											<>
												<img
													src={imagePreview}
													alt="Device preview"
													className="h-48 w-48 rounded border border-gray-200 object-cover"
												/>
												<button
													type="button"
													onClick={handleRemoveImage}
													className="hover:bg-red-600 absolute right-0 top-0 rounded-full bg-red-500 p-1 text-white"
												>
													<X className="h-4 w-4" />
												</button>
												{device?.image && !imageFile && (
													<Button
														variant="destructive"
														className="top-2"
														type="submit"
														name="intent"
														value="removeImage"
													>
														{t('remove_image')}
													</Button>
												)}
											</>
										) : (
											<label
												htmlFor="image"
												className="flex h-48 w-48 cursor-pointer flex-col items-center justify-center rounded border-2 border-dashed border-gray-300 hover:border-gray-400"
											>
												<Upload className="h-8 w-8 text-gray-400" />
												<span className="mt-2 text-sm text-gray-500">
													{t('upload_image')}
												</span>
											</label>
										)}

										<input
											id="image"
											name="image"
											type="file"
											accept="image/jpeg,image/png,image/webp,image/gif"
											onChange={handleImageChange}
											className="hidden"
										/>
									</div>
								</div>

								{actionData?.errors?.image && (
									<div className="pt-1 text-[#FF0000]">
										{actionData.errors.image}
									</div>
								)}
								<p className="mt-1 text-sm text-gray-500">
									{t('accepted_formats')}: JPEG, PNG, WebP, GIF (max 5MB)
								</p>
							</div>

							{/* Tags */}
							<div className="mt-6">
								<label className="txt-base block font-bold tracking-normal">
									Tags
								</label>

								{/* Existing tags */}
								<div className="mt-2 flex flex-wrap gap-2">
									{tags.map((tag) => (
										<span
											key={tag}
											className="flex items-center gap-1 rounded-full bg-gray-200 px-3 py-1 text-sm"
										>
											{tag}
											<button
												type="button"
												onClick={() => removeTag(tag)}
												className="hover:text-red-600 text-gray-600"
											>
												<X className="h-3 w-3" />
											</button>
										</span>
									))}
								</div>

								{/* Add new tag */}
								<div className="mt-3 flex gap-2">
									<input
										type="text"
										value={newTag}
										onChange={(e) => setNewTag(e.target.value)}
										onKeyDown={(e) => {
											if (e.key === 'Enter') {
												e.preventDefault()
												addTag()
											}
										}}
										placeholder="Add a tag"
										className="flex-1 rounded border border-gray-200 px-2 py-1 text-base"
									/>
									<Button type="button" onClick={addTag}>
										{t('add')}
									</Button>
								</div>
								<input
									type="hidden"
									name="grouptag"
									value={JSON.stringify(tags)}
								/>
							</div>

							{/* Delete device */}
							<div>
								<h1 className="mt-7 text-3xl text-[#FF4136]">{t('delete_device')}</h1>
							</div>

							<div className="my-5 rounded border border-[#faebcc] bg-[#fcf8e3] p-4 text-[#8a6d3b]">
								<p>
									{t('delete_device_confirm_info')}
								</p>
							</div>
							<div>
								<input
									id="passwordDelete"
									name="passwordDelete"
									type="password"
									placeholder="Password"
									ref={passwordDelRef}
									className="w-full rounded border border-gray-200 px-2 py-2 text-base placeholder-[#999]"
									value={passwordDelVal}
									onChange={(e) => setPasswordVal(e.target.value)}
								/>
								{actionData?.errors?.passwordDelete && (
									<div className="pt-1 text-[#FF0000]" id="email-error">
										{actionData.errors.passwordDelete}
									</div>
								)}
							</div>
							{actionData?.errors && 'integrationCleanup' in actionData.errors && (
								<p role="alert" className="mt-1 text-sm text-red-600">
									{t('integration_cleanup_failed', { ns: 'delete-device' })}
								</p>
							)}
							<div className="flex justify-end">
								<button
									type="submit"
									name="intent"
									value="delete"
									disabled={!passwordDelVal}
									className="mb-5 rounded border border-gray-200 px-4 py-2 text-black hover:bg-[#e6e6e6] disabled:border-[#ccc] disabled:text-[#8a8989]"
								>
									{t('delete_device')}
								</button>
							</div>
						</div>
					</Form>
				</div>
			</div>
		</div>
	)
}

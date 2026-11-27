import { Save, Upload, X } from 'lucide-react'
import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
	data,
	redirect,
	Form,
	useActionData,
	useLoaderData,
	useNavigation,
	useOutletContext,
} from 'react-router'
import invariant from 'tiny-invariant'
import { type Route } from './+types/device.$deviceId.edit.general'
import { MarkdownContent } from '~/components/markdown-content'
import { Button } from '~/components/ui/button'
import { getDevice, getDeviceWithoutSensors } from '~/db/models/device.server'
import { verifyLogin } from '~/db/models/user.server'
import { type Device } from '~/db/schema'
import {
	uploadDeviceImage,
	deleteDeviceImage,
	getDeviceImageUrl,
} from '~/lib/s3.server'
import { updateDevice, deleteDevice } from '~/services/device-service.server'
import { getUserEmail, getUserId } from '~/services/session-service.server'
import {
	useAutosaveFetcher,
	AUTOSAVE_DELAY_MS,
} from '~/hooks/use-autosave-fetcher'
import {
	DeviceExposureType,
	DeviceExposureZodEnum,
	getDeviceExposure,
	parseDeviceExposure,
} from '~/lib/device-enums'
import { AutosaveStatusText } from '~/components/autosave-status.text'
import { PasswordInput } from '~/components/ui/password-input'

type GeneralAutosaveValues = {
	name: string
	exposure: DeviceExposureType
	description: string
	website: string
	tags: string[]
}

type DeviceGeneralActionErrors = {
	name?: string | null
	exposure: string | null
	passwordDelete: string | null
	image: string | null
}

export type DeviceGeneralActionData =
	| {
			intent: 'autosave-general'
			success: true
			device: GeneralAutosaveValues
			errors: null
			status: 200
	  }
	| {
			intent: 'autosave-general'
			success: false
			message: string
			errors: DeviceGeneralActionErrors
			status: number
	  }
	| {
			intent: 'saveImage' | 'removeImage'
			errors: DeviceGeneralActionErrors
			status: number
	  }
	| {
			intent: 'delete'
			errors: DeviceGeneralActionErrors
			status: number
	  }

function parseGroupTag(value: FormDataEntryValue | null): string[] {
	if (typeof value !== 'string') return []

	try {
		const parsed = JSON.parse(value)

		if (!Array.isArray(parsed)) return []

		return parsed
			.filter((tag): tag is string => typeof tag === 'string')
			.map((tag) => tag.trim())
			.filter(Boolean)
	} catch {
		return []
	}
}

function uniqueTags(tags: string[]) {
	return Array.from(new Set(tags))
}

//*****************************************************
export async function loader({ request, params }: Route.LoaderArgs) {
	const userId = await getUserId(request)
	if (!userId) return redirect('/')

	const deviceID = params.deviceId
	invariant(typeof deviceID === 'string', 'Device id not found.')

	const deviceData = await getDeviceWithoutSensors({ id: deviceID })

	if (!deviceData) {
		throw new Response('Device not found', { status: 404 })
	}

	if (deviceData.userId !== userId) {
		throw new Response('Forbidden', { status: 403 })
	}

	let imageUrl: string | null = null

	if (deviceData.image) {
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
export async function action({ request, params }: Route.ActionArgs) {
	const deviceID = params.deviceId
	const userId = await getUserId(request)

	invariant(typeof deviceID === 'string', 'Device id not found.')
	invariant(typeof userId === 'string', 'User id not found.')

	const device = (await getDevice({ id: deviceID })) as Device | null

	if (!device) {
		throw new Response('Device not found', { status: 404 })
	}

	if (device.userId !== userId) {
		throw new Response('Forbidden', { status: 403 })
	}

	const formData = await request.formData()
	const intent = String(formData.get('intent') ?? '')

	switch (intent) {
		case 'autosave-general': {
			const name = String(formData.get('name') ?? '')
			const exposure = parseDeviceExposure(formData.get('exposure'))
			const description = String(formData.get('description') ?? '')
			const website = String(formData.get('website') ?? '')
			const tags = uniqueTags(parseGroupTag(formData.get('grouptag')))

			if (!name.trim()) {
				return data(
					{
						intent,
						success: false,
						message: 'Device name is required.',
						errors: {
							name: 'Device name is required.',
							exposure: null,
							passwordDelete: null,
							image: null,
						},
						status: 400,
					} satisfies DeviceGeneralActionData,
					{ status: 400 },
				)
			}

			if (!exposure) {
				return data(
					{
						intent,
						success: false,
						message: 'Invalid exposure.',
						errors: {
							name: null,
							exposure: 'Invalid exposure.',
							passwordDelete: null,
							image: null,
						},
						status: 400,
					} satisfies DeviceGeneralActionData,
					{ status: 400 },
				)
			}

			if (description.length > 5000) {
				return data(
					{
						intent,
						success: false,
						message: 'Description is too long.',
						errors: {
							name: null,
							exposure: null,
							passwordDelete: null,
							image: null,
						},
						status: 400,
					} satisfies DeviceGeneralActionData,
					{ status: 400 },
				)
			}

			const result = await updateDevice(userId, device, {
				name,
				exposure,
				description,
				website,
				grouptag: tags,
			})

			if (result === 'unauthorized') {
				throw new Response('Forbidden', { status: 403 })
			}

			return data(
				{
					intent,
					success: true,
					device: {
						name,
						exposure,
						description,
						website,
						tags,
					},
					errors: null,
					status: 200,
				} satisfies DeviceGeneralActionData,
				{ status: 200 },
			)
		}

		case 'saveImage': {
			const image = formData.get('image') as File | null

			if (!image || image.size === 0 || image.name === '') {
				return data(
					{
						intent,
						errors: {
							name: null,
							exposure: null,
							passwordDelete: null,
							image: 'Please choose an image to upload.',
						},
						status: 400,
					} satisfies DeviceGeneralActionData,
					{ status: 400 },
				)
			}

			const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
			const maxSize = 5 * 1024 * 1024

			if (!validTypes.includes(image.type)) {
				return data(
					{
						intent,
						errors: {
							name: null,
							exposure: null,
							passwordDelete: null,
							image:
								'Invalid file type. Please upload a JPEG, PNG, WebP, or GIF.',
						},
						status: 400,
					} satisfies DeviceGeneralActionData,
					{ status: 400 },
				)
			}

			if (image.size > maxSize) {
				return data(
					{
						intent,
						errors: {
							name: null,
							exposure: null,
							passwordDelete: null,
							image: 'File too large. Maximum size is 5MB.',
						},
						status: 400,
					} satisfies DeviceGeneralActionData,
					{ status: 400 },
				)
			}

			let imageKey: string

			try {
				imageKey = await uploadDeviceImage(deviceID, image)
			} catch (error) {
				console.error('Image upload error:', error)

				return data(
					{
						intent,
						errors: {
							name: null,
							exposure: null,
							passwordDelete: null,
							image: 'Failed to upload image. Please try again.',
						},
						status: 500,
					} satisfies DeviceGeneralActionData,
					{ status: 500 },
				)
			}

			const result = await updateDevice(userId, device, {
				image: imageKey,
			})

			if (result === 'unauthorized') {
				throw new Response('Forbidden', { status: 403 })
			}

			return data(
				{
					intent,
					errors: {
						name: null,
						exposure: null,
						passwordDelete: null,
						image: null,
					},
					status: 200,
				} satisfies DeviceGeneralActionData,
				{ status: 200 },
			)
		}

		case 'removeImage': {
			const deviceWithoutSensors = (await getDeviceWithoutSensors({
				id: deviceID,
			})) as Device | null

			if (deviceWithoutSensors?.image) {
				try {
					await deleteDeviceImage(deviceWithoutSensors.image)
				} catch (error) {
					console.error('Failed to delete image:', error)
				}
			}

			const result = await updateDevice(userId, device, {
				image: '',
			})

			if (result === 'unauthorized') {
				throw new Response('Forbidden', { status: 403 })
			}

			return data(
				{
					intent,
					errors: {
						name: null,
						exposure: null,
						passwordDelete: null,
						image: null,
					},
					status: 200,
				} satisfies DeviceGeneralActionData,
				{ status: 200 },
			)
		}

		case 'delete': {
			const passwordDelete = String(formData.get('passwordDelete') ?? '')

			if (!passwordDelete) {
				return data(
					{
						intent,
						errors: {
							name: null,
							exposure: null,
							passwordDelete: 'Password is required.',
							image: null,
						},
						status: 400,
					} satisfies DeviceGeneralActionData,
					{ status: 400 },
				)
			}

			const userEmail = await getUserEmail(request)

			invariant(typeof userEmail === 'string', 'email not found')

			const user = await verifyLogin(userEmail, passwordDelete)

			if (!user) {
				return data(
					{
						intent,
						errors: {
							name: null,
							exposure: null,
							passwordDelete: 'Invalid password',
							image: null,
						},
						status: 400,
					} satisfies DeviceGeneralActionData,
					{ status: 400 },
				)
			}

			const deviceWithoutSensors = (await getDeviceWithoutSensors({
				id: deviceID,
			})) as Device | null

			if (deviceWithoutSensors?.image) {
				try {
					await deleteDeviceImage(deviceWithoutSensors.image)
				} catch (error) {
					console.error('Failed to delete device image:', error)
				}
			}

			await deleteDevice(user, device, passwordDelete)

			return redirect('/profile/me')
		}

		default: {
			return data(
				{
					intent: 'autosave-general',
					success: false,
					message: 'Invalid intent.',
					errors: {
						name: null,
						exposure: null,
						passwordDelete: null,
						image: null,
					},
					status: 400,
				} satisfies DeviceGeneralActionData,
				{ status: 400 },
			)
		}
	}
}

//**********************************
export default function EditDeviceGeneral() {
	const { device, imageUrl } = useLoaderData<typeof loader>()
	const actionData = useActionData<typeof action>()
	const navigation = useNavigation()

	const [passwordDelVal, setPasswordVal] = useState('')
	const passwordDelRef = useRef<HTMLInputElement>(null)
	const imageInputRef = useRef<HTMLInputElement>(null)

	const initialAutosaveValues = useMemo<GeneralAutosaveValues>(
		() => ({
			name: device.name ?? '',
			exposure: getDeviceExposure(device.exposure),
			description: device.description ?? '',
			website: device.website ?? '',
			tags: device.tags ?? [],
		}),
		[
			device.name,
			device.exposure,
			device.description,
			device.website,
			device.tags,
		],
	)

	const [name, setName] = useState(initialAutosaveValues.name)
	const [exposure, setExposure] = useState<DeviceExposureType>(
		initialAutosaveValues.exposure,
	)
	const [description, setDescription] = useState(
		initialAutosaveValues.description,
	)
	const [tags, setTags] = useState<string[]>(initialAutosaveValues.tags)
	const [newTag, setNewTag] = useState('')
	const [website, setWebsite] = useState(initialAutosaveValues.website)

	const { t } = useTranslation('edit-device-general')

	const [imagePreview, setImagePreview] = useState<string | null>(
		imageUrl || null,
	)
	const [imageFile, setImageFile] = useState<File | null>(null)
	const [setToastOpen] = useOutletContext<[(_open: boolean) => void]>()

	const autosaveValues = useMemo<GeneralAutosaveValues>(
		() => ({
			name,
			exposure,
			description,
			website,
			tags,
		}),
		[name, exposure, description, website, tags],
	)

	const validateAutosave = useCallback((values: GeneralAutosaveValues) => {
		return (
			values.name.trim().length > 0 &&
			DeviceExposureZodEnum.safeParse(values.exposure).success &&
			values.description.length <= 5000
		)
	}, [])

	const getAutosavePayload = useCallback((values: GeneralAutosaveValues) => {
		return {
			intent: 'autosave-general',
			name: values.name,
			exposure: values.exposure,
			description: values.description,
			website: values.website,
			grouptag: JSON.stringify(values.tags),
		}
	}, [])

	const isAutosaveSuccess = useCallback(
		(actionData: DeviceGeneralActionData) => {
			return actionData.intent === 'autosave-general' && actionData.success
		},
		[],
	)

	const getSavedValues = useCallback(
		(
			actionData: DeviceGeneralActionData,
			submittedValues: GeneralAutosaveValues,
		): GeneralAutosaveValues => {
			if (actionData.intent !== 'autosave-general' || !actionData.success) {
				return submittedValues
			}

			return actionData.device
		},
		[],
	)

	const handleAutosaveSuccess = useCallback(() => {
		// Keep this quiet if you only want the inline "saved" text.
		// Uncomment if you want the same toast behavior as the old save button:
		// setToastOpen(true)
	}, [])

	const handleAutosaveError = useCallback(
		(actionData: DeviceGeneralActionData) => {
			if (actionData.intent !== 'autosave-general') return
			if (actionData.success) return

			console.warn(actionData.message)
		},
		[],
	)

	const autosave = useAutosaveFetcher<
		GeneralAutosaveValues,
		DeviceGeneralActionData
	>({
		values: autosaveValues,
		lastSavedValues: initialAutosaveValues,
		debounceMs: AUTOSAVE_DELAY_MS,
		validate: validateAutosave,
		getPayload: getAutosavePayload,
		isSuccess: isAutosaveSuccess,
		getSavedValues,
		onSuccess: handleAutosaveSuccess,
		onError: handleAutosaveError,
	})

	useEffect(() => {
		if (imageFile) return

		setImagePreview(imageUrl || null)
	}, [imageUrl, imageFile])

	const addTag = () => {
		const trimmed = newTag.trim()
		if (!trimmed || tags.includes(trimmed)) return

		setTags((currentTags) => [...currentTags, trimmed])
		setNewTag('')
	}

	const removeTag = (tagToRemove: string) => {
		setTags((currentTags) => currentTags.filter((tag) => tag !== tagToRemove))
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

		if (!file) return

		setImageFile(file)

		const reader = new FileReader()

		reader.onloadend = () => {
			setImagePreview(reader.result as string)
		}

		reader.readAsDataURL(file)
	}

	const handleRemoveImagePreview = () => {
		setImageFile(null)
		setImagePreview(imageUrl || null)

		if (imageInputRef.current) {
			imageInputRef.current.value = ''
		}
	}

	useEffect(() => {
		if (!actionData) return
		if (!actionData.errors) return

		const actionErrors = actionData.errors

		const hasErrors = Object.values(actionErrors).some(
			(errorMessage) => errorMessage,
		)

		if (!hasErrors) {
			if (actionData.intent === 'saveImage') {
				setImageFile(null)

				if (imageInputRef.current) {
					imageInputRef.current.value = ''
				}
			}

			if (actionData.intent === 'removeImage') {
				setImageFile(null)
				setImagePreview(null)

				if (imageInputRef.current) {
					imageInputRef.current.value = ''
				}
			}

			setToastOpen(true)
			return
		}

		if (actionErrors.passwordDelete) {
			passwordDelRef.current?.focus()
		}
	}, [actionData, setToastOpen])

	const submittingIntent = navigation.formData?.get('intent')
	const isImageSubmitting =
		navigation.state === 'submitting' &&
		(submittingIntent === 'saveImage' || submittingIntent === 'removeImage')
	const isDeleteSubmitting =
		navigation.state === 'submitting' && submittingIntent === 'delete'

	const actionErrors =
		actionData && 'errors' in actionData && actionData.errors
			? actionData.errors
			: null

	const imageError = actionErrors?.image ?? null
	const passwordDeleteError = actionErrors?.passwordDelete ?? null

	const hasNameError = name.trim().length === 0
	const hasDescriptionError = description.length > 5000
	const hasClientErrors = hasNameError || hasDescriptionError

	return (
		<div className="grid grid-rows-1">
			<div className="flex min-h-full items-center justify-center">
				<div className="font-helvetica mx-auto w-full">
					<div>
						<div className="mt-2 flex justify-between">
							<div>
								<h1 className="text-4xl">{t('general')}</h1>

								<AutosaveStatusText
									status={autosave.status}
									hasValidationErrors={hasClientErrors}
									namespace="edit-device-general"
								/>
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
									value={name}
									onChange={(e) => setName(e.target.value)}
									aria-describedby="name-error"
									className={
										'w-full rounded border border-gray-200 px-2 py-1 text-base' +
										(hasNameError
											? ' border-[#FF0000] shadow-[#FF0000] focus:border-[#FF0000] focus:shadow-sm focus:shadow-[#FF0000]'
											: '')
									}
								/>

								{hasNameError ? (
									<p id="name-error" className="mt-1 text-sm text-red-600">
										{t('name_is_required')}
									</p>
								) : null}
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
									value={exposure}
									onChange={(e) =>
										setExposure(getDeviceExposure(e.target.value))
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
										className={
											'min-h-55 w-full rounded border border-gray-200 px-2 py-1.5 font-mono text-base' +
											(hasDescriptionError
												? ' border-[#FF0000] shadow-[#FF0000] focus:border-[#FF0000] focus:shadow-sm focus:shadow-[#FF0000]'
												: '')
										}
									/>
									<p className="text-sm text-gray-500">
										{description.length} / 5000
									</p>
									<p className="mt-1 text-sm text-gray-500">
										{t('markdown_supported')}
									</p>
								</div>

								<div>
									<p className="mb-2 block font-bold tracking-normal">
										{t('preview')}
									</p>
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

						{/* Tags */}
						<div className="mt-6">
							<label className="txt-base block font-bold tracking-normal">
								Tags
							</label>

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
											className="text-gray-600 hover:text-red-600"
										>
											<X className="h-3 w-3" />
										</button>
									</span>
								))}
							</div>

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
						</div>

						{/* Image Upload */}
						<Form method="post" encType="multipart/form-data" noValidate>
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
													onClick={handleRemoveImagePreview}
													className="absolute top-0 right-0 rounded-full bg-red-500 p-1 text-white hover:bg-red-600"
												>
													<X className="h-4 w-4" />
												</button>

												<div className="mt-3 flex gap-2">
													{imageFile ? (
														<Button
															type="submit"
															name="intent"
															value="saveImage"
															disabled={isImageSubmitting}
														>
															<Save className="mr-2 h-4 w-4" />
															{isImageSubmitting
																? t('saving')
																: t('save_changes')}
														</Button>
													) : null}

													{device.image && !imageFile ? (
														<Button
															variant="destructive"
															type="submit"
															name="intent"
															value="removeImage"
															disabled={isImageSubmitting}
														>
															{t('remove_image')}
														</Button>
													) : null}
												</div>
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
											ref={imageInputRef}
											id="image"
											name="image"
											type="file"
											accept="image/jpeg,image/png,image/webp,image/gif"
											onChange={handleImageChange}
											className="hidden"
										/>
									</div>
								</div>

								{imageError ? (
									<div className="pt-1 text-[#FF0000]">{imageError}</div>
								) : null}

								<p className="mt-1 text-sm text-gray-500">
									{t('accepted_formats')}: JPEG, PNG, WebP, GIF (max 5MB)
								</p>
							</div>
						</Form>

						{/* Delete device */}
						<Form method="post" noValidate>
							<div>
								<h1 className="mt-7 text-3xl text-[#FF4136]">
									{t('delete_device')}
								</h1>
							</div>

							<div className="my-5 rounded border border-[#faebcc] bg-[#fcf8e3] p-4 text-[#8a6d3b]">
								<p>{t('delete_device_confirm_info')}</p>
							</div>

							<div>
								<PasswordInput
									id="passwordDelete"
									name="passwordDelete"
									placeholder="Password"
									ref={passwordDelRef}
									className="text-base placeholder-[#999]"
									value={passwordDelVal}
									onChange={(e) => setPasswordVal(e.target.value)}
								/>

								{passwordDeleteError ? (
									<div className="pt-1 text-[#FF0000]" id="password-error">
										{passwordDeleteError}
									</div>
								) : null}
							</div>

							<div className="flex justify-end">
								<div className="flex justify-end">
									<Button
										type="submit"
										name="intent"
										value="delete"
										variant="destructive"
										disabled={!passwordDelVal || isDeleteSubmitting}
										className="mb-5"
									>
										{isDeleteSubmitting ? t('saving') : t('delete_device')}
									</Button>
								</div>
							</div>
						</Form>
					</div>
				</div>
			</div>
		</div>
	)
}

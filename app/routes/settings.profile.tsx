import { CopyIcon, CopyCheckIcon, InfoIcon } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Form, Link, Outlet, useActionData, useLoaderData } from 'react-router'
import { type Route } from './+types/settings.profile'

import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Switch } from '~/components/ui/switch'
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from '~/components/ui/tooltip'
import { useToast } from '~/components/ui/use-toast'

import {
	createCurrentDeviceSchemaVersion,
	getOwnedDeviceSchemasWithVersions,
	updateDeviceSchemaVisibility,
} from '~/db/models/device-schema.server'
import { getProfileByUserId, updateProfile } from '~/db/models/profile.server'
import { getUserById } from '~/db/models/user.server'
import { useCopyToClipboard } from '~/hooks/use-copy-to-clipboard'
import {
	AUTOSAVE_DELAY_MS,
	useAutosaveFetcher,
} from '~/hooks/use-autosave-fetcher'
import { getInitials } from '~/lib/strings'
import { requireUserId } from '~/services/session-service.server'
import { AutosaveStatusText } from '~/components/autosave-status.text'

export async function loader({ request }: Route.LoaderArgs) {
	const userId = await requireUserId(request)

	const [user, profile, deviceSchemas] = await Promise.all([
		getUserById(userId),
		getProfileByUserId(userId),
		getOwnedDeviceSchemasWithVersions(userId),
	])

	if (!user || !profile) {
		throw new Error('User profile not found')
	}

	if (!user.name) {
		throw new Error('Username not found')
	}

	const publicProfileUrl = new URL(
		`/profile/${encodeURIComponent(user.name)}`,
		request.url,
	).toString()

	return {
		profile,
		publicProfileUrl,
		deviceSchemas: deviceSchemas.map((schema) => ({
			...schema,
			versions: schema.versions.map((version) => {
				const downloadUrl = new URL(
					`/resources/device-schema/${version.id}`,
					request.url,
				).toString()

				return {
					...version,
					downloadUrl,
				}
			}),
		})),
	}
}

export type ProfileActionData =
	| {
			intent: 'autosave-profile'
			success: true
			updatedProfile: {
				id: string
				displayName: string
				public: boolean
				userId: string
			}
	  }
	| {
			intent: 'autosave-profile'
			success: false
			message: string
	  }

type DeviceSchemaActionData =
	| {
			intent: 'update-device-schema-visibility'
			success: true
	  }
	| {
			intent: 'update-device-schema-visibility'
			success: false
			message: string
	  }
	| {
			intent: 'create-device-schema-version'
			success: true
	  }
	| {
			intent: 'create-device-schema-version'
			success: false
			message: string
	  }

type SettingsProfileActionData = ProfileActionData | DeviceSchemaActionData

export async function action({
	request,
}: Route.ActionArgs): Promise<SettingsProfileActionData> {
	const userId = await requireUserId(request)
	const profile = await getProfileByUserId(userId)

	if (!profile || !userId) {
		return {
			intent: 'autosave-profile',
			success: false,
			message: 'Something went wrong.',
		}
	}

	const formData = await request.formData()

	const intent = String(formData.get('intent') ?? '')

	if (intent === 'update-device-schema-visibility') {
		const schemaId = String(formData.get('schemaId') ?? '')
		const visibility = String(formData.get('visibility') ?? '')

		if (!schemaId || (visibility !== 'private' && visibility !== 'public')) {
			return {
				intent,
				success: false,
				message: 'Invalid schema visibility update.',
			}
		}

		const updatedSchema = await updateDeviceSchemaVisibility(
			userId,
			schemaId,
			visibility,
		)

		if (!updatedSchema) {
			return {
				intent,
				success: false,
				message: 'Device schema could not be updated.',
			}
		}

		return {
			intent,
			success: true,
		}
	}

	if (intent === 'create-device-schema-version') {
		const schemaId = String(formData.get('schemaId') ?? '')
		const schemaFile = formData.get('schemaFile')

		if (!schemaId || !(schemaFile instanceof File) || schemaFile.size === 0) {
			return {
				intent,
				success: false,
				message: 'Please choose a schema JSON file.',
			}
		}

		try {
			const parsedSchema = JSON.parse(await schemaFile.text())
			await createCurrentDeviceSchemaVersion(userId, schemaId, parsedSchema)

			return {
				intent,
				success: true,
			}
		} catch (error) {
			return {
				intent,
				success: false,
				message:
					error instanceof Error
						? error.message
						: 'Schema version could not be created.',
			}
		}
	}

	if (intent !== 'autosave-profile') {
		return {
			intent: 'autosave-profile',
			success: false,
			message: 'Invalid intent.',
		}
	}

	const displayName = String(formData.get('displayName') ?? '').trim()
	const isPublic = formData.get('isPublic') === 'true'

	if (displayName.length < 3 || displayName.length > 40) {
		return {
			intent: 'autosave-profile',
			success: false,
			message: 'Display name must be between 3 and 40 characters.',
		}
	}

	const updatedProfile = await updateProfile(profile.id, {
		displayName,
		public: isPublic,
	})

	if (!updatedProfile) {
		return {
			intent: 'autosave-profile',
			success: false,
			message: 'Profile could not be updated.',
		}
	}

	return {
		intent: 'autosave-profile',
		success: true,
		updatedProfile: {
			id: updatedProfile.id,
			displayName: updatedProfile.displayName,
			public: updatedProfile.public ?? false,
			userId: updatedProfile.userId,
		},
	}
}

type ProfileAutosaveValues = {
	displayName: string
	isPublic: boolean
}

export default function EditUserProfilePage() {
	const data = useLoaderData<typeof loader>()
	const actionData = useActionData<typeof action>()

	const [displayName, setDisplayName] = useState(data.profile.displayName)
	const [isPublic, setIsPublic] = useState(data.profile.public ?? false)

	const { t } = useTranslation('settings')
	const { toast } = useToast()

	const publicProfileUrl = data.publicProfileUrl
	const { copiedValue, copyToClipboard } = useCopyToClipboard()

	const validateAutosave = useCallback((values: ProfileAutosaveValues) => {
		const nextDisplayName = values.displayName.trim()

		return nextDisplayName.length >= 3 && nextDisplayName.length <= 40
	}, [])

	const getAutosavePayload = useCallback((values: ProfileAutosaveValues) => {
		return {
			intent: 'autosave-profile',
			displayName: values.displayName.trim(),
			isPublic: String(values.isPublic),
		}
	}, [])

	const isAutosaveSuccess = useCallback((actionData: ProfileActionData) => {
		return actionData.intent === 'autosave-profile' && actionData.success
	}, [])

	const getSavedValues = useCallback(
		(
			actionData: ProfileActionData,
			submittedValues: ProfileAutosaveValues,
		): ProfileAutosaveValues => {
			if (!actionData.success) return submittedValues

			return {
				displayName: actionData.updatedProfile.displayName,
				isPublic: actionData.updatedProfile.public,
			}
		},
		[],
	)

	const handleAutosaveError = useCallback(
		(actionData: ProfileActionData) => {
			if (actionData.success) return

			toast({
				title: t('something_went_wrong'),
				description: actionData.message,
				variant: 'destructive',
			})
		},
		[toast, t],
	)

	const autosave = useAutosaveFetcher<ProfileAutosaveValues, ProfileActionData>(
		{
			values: {
				displayName,
				isPublic,
			},
			lastSavedValues: {
				displayName: data.profile.displayName,
				isPublic: data.profile.public ?? false,
			},
			debounceMs: AUTOSAVE_DELAY_MS,
			validate: validateAutosave,
			getPayload: getAutosavePayload,
			isSuccess: isAutosaveSuccess,
			getSavedValues,
			onError: handleAutosaveError,
		},
	)

	useEffect(() => {
		if (!actionData || actionData.intent === 'autosave-profile') return

		if (actionData.success) {
			toast({
				title: t('saved'),
				variant: 'success',
			})
			return
		}

		toast({
			title: t('something_went_wrong'),
			description: actionData.message,
			variant: 'destructive',
		})
	}, [actionData, toast, t])

	useEffect(() => {
		setDisplayName(data.profile.displayName)
		setIsPublic(data.profile.public ?? false)

		autosave.resetLastSaved({
			displayName: data.profile.displayName,
			isPublic: data.profile.public ?? false,
		})
	}, [data.profile.displayName, data.profile.public, autosave.resetLastSaved])

	const handlePublicChange = useCallback(
		(checked: boolean) => {
			setIsPublic(checked)

			const nextValues = {
				displayName,
				isPublic: checked,
			}

			if (validateAutosave(nextValues)) {
				autosave.submit(nextValues)
			}
		},
		[autosave, displayName, validateAutosave],
	)

	const handleCopyPublicProfileUrl = async () => {
		const copied = await copyToClipboard(publicProfileUrl)

		if (!copied) return

		toast({
			title: t('copied'),
			variant: 'success',
		})
	}

	const handleCopySchemaLink = async (url: string) => {
		const copied = await copyToClipboard(url)

		if (!copied) return

		toast({
			title: t('copied'),
			variant: 'success',
		})
	}

	return (
		<div className="space-y-6">
			<Card className="space-y-6">
				<CardHeader>
					<CardTitle>{t('profile_settings')}</CardTitle>
					<CardDescription>{t('profile_settings_description')}</CardDescription>
					<AutosaveStatusText status={autosave.status} namespace="settings" />
				</CardHeader>

				<CardContent className="flex flex-col gap-8 md:flex-row">
					<div className="w-full justify-center space-y-6 md:w-1/2">
						<div className="space-y-2">
							<div className="flex items-center space-x-2">
								<Label htmlFor="displayName">{t('displayName')}</Label>

								<Tooltip>
									<TooltipTrigger asChild>
										<InfoIcon className="text-muted-foreground h-4 w-4" />
									</TooltipTrigger>
									<TooltipContent>
										<p>{t('if_public')}</p>
									</TooltipContent>
								</Tooltip>
							</div>

							<Input
								minLength={3}
								maxLength={40}
								type="text"
								id="displayName"
								name="displayName"
								placeholder={t('enter_display_name')}
								value={displayName}
								onChange={(event) => setDisplayName(event.target.value)}
							/>
						</div>

						<div className="space-y-2">
							<div className="flex items-center space-x-2">
								<Label htmlFor="isPublic">{t('public_profile')}</Label>

								<Tooltip>
									<TooltipTrigger asChild>
										<InfoIcon className="text-muted-foreground h-4 w-4" />
									</TooltipTrigger>
									<TooltipContent>
										<p>
											{t('if_activated_public_1')}{' '}
											<Link to="/profile/me" target="__blank">
												<span className="underline">
													{t('if_activated_public_2')}
												</span>
											</Link>
											{t('if_activated_public_3')}
										</p>
									</TooltipContent>
								</Tooltip>
							</div>

							<Switch
								id="isPublic"
								name="isPublic"
								checked={isPublic}
								onCheckedChange={handlePublicChange}
							/>

							{isPublic && (
								<div className="mt-3 space-y-2">
									<Label htmlFor="publicProfileUrl">
										{t('public_profile_link')}
									</Label>

									<div className="flex min-w-0 gap-2">
										<Input
											id="publicProfileUrl"
											value={publicProfileUrl}
											readOnly
											className="min-w-0"
											onFocus={(event) => event.target.select()}
										/>

										<Button
											type="button"
											variant="outline"
											className="shrink-0"
											onClick={handleCopyPublicProfileUrl}
										>
											{copiedValue === publicProfileUrl ? (
												<CopyCheckIcon className="h-4 w-4" />
											) : (
												<CopyIcon className="h-4 w-4" />
											)}
										</Button>
									</div>
								</div>
							)}
						</div>
					</div>

					<div className="flex w-full justify-center md:w-1/2">
						<div className="relative h-32 w-32 sm:h-40 sm:w-40 md:h-52 md:w-52">
							<Avatar className="h-full w-full">
								<AvatarImage
									className="aspect-auto h-full w-full rounded-full object-cover"
									src={'/resources/file/' + data.profile.profileImage?.id}
								/>
								<AvatarFallback>
									{getInitials(data.profile?.displayName ?? '')}
								</AvatarFallback>
							</Avatar>

							<Link
								preventScrollReset
								to="photo"
								className="border-night-700 bg-night-500 pointer-events-auto absolute top-3 -right-3 flex h-4 w-4 items-center justify-center rounded-full border-4 p-5"
								title={t('change_profile_photo')}
								aria-label={t('change_profile_photo')}
							>
								&#x270E;
							</Link>
						</div>
					</div>
				</CardContent>

				<Outlet />
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>{t('device_schemas')}</CardTitle>
					<CardDescription>{t('device_schemas_description')}</CardDescription>
				</CardHeader>
				<CardContent>
					{data.deviceSchemas.length === 0 ? (
						<p className="text-muted-foreground text-sm">
							{t('no_device_schemas')}
						</p>
					) : (
						<div className="space-y-4">
							{data.deviceSchemas.map((schema) => (
								<div
									key={schema.id}
									className="space-y-3 rounded-lg border p-4"
								>
									<div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
										<div className="space-y-1">
											<div className="flex flex-wrap items-center gap-2">
												<h3 className="font-medium">{schema.name}</h3>
												<Badge
													variant={
														schema.visibility === 'public'
															? 'default'
															: 'secondary'
													}
												>
													{t(`schema_visibility_${schema.visibility}`)}
												</Badge>
											</div>
											{schema.description && (
												<p className="text-muted-foreground text-sm">
													{schema.description}
												</p>
											)}
										</div>

										<Form method="post">
											<input
												type="hidden"
												name="intent"
												value="update-device-schema-visibility"
											/>
											<input type="hidden" name="schemaId" value={schema.id} />
											<input
												type="hidden"
												name="visibility"
												value={
													schema.visibility === 'public' ? 'private' : 'public'
												}
											/>
											<Button type="submit" variant="outline">
												{schema.visibility === 'public'
													? t('hide_schema')
													: t('publish_schema')}
											</Button>
										</Form>
									</div>

									<Form
										method="post"
										encType="multipart/form-data"
										className="bg-muted/50 flex flex-col gap-2 rounded-md p-3 md:flex-row md:items-end"
									>
										<input
											type="hidden"
											name="intent"
											value="create-device-schema-version"
										/>
										<input type="hidden" name="schemaId" value={schema.id} />
										<div className="grow space-y-1">
											<Label htmlFor={`schemaFile-${schema.id}`}>
												{t('publish_new_schema_version')}
											</Label>
											<Input
												id={`schemaFile-${schema.id}`}
												type="file"
												name="schemaFile"
												accept="application/json,.json"
												required
											/>
										</div>
										<Button type="submit" variant="outline">
											{t('publish_version')}
										</Button>
									</Form>

									<div className="space-y-2">
										<h4 className="text-sm font-medium">
											{t('schema_version_history')}
										</h4>
										{schema.versions.map((version) => (
											<div
												key={version.id}
												className="bg-muted/50 flex flex-col gap-3 rounded-md p-3 md:flex-row md:items-center md:justify-between"
											>
												<div className="space-y-1">
													<div className="flex flex-wrap items-center gap-2">
														<Badge variant="secondary">
															v{version.version}
														</Badge>
														<Badge
															variant={
																version.status === 'current'
																	? 'default'
																	: 'secondary'
															}
														>
															{t(`schema_version_status_${version.status}`)}
														</Badge>
														<Badge variant="outline">
															{version.content.sensors.length} {t('sensors')}
														</Badge>
														<Badge variant="outline">
															{version.formatVersion}
														</Badge>
													</div>
													<p className="text-muted-foreground text-xs">
														{t('schema_hash')}: {version.hash.slice(0, 12)}
													</p>
												</div>
												<div className="flex flex-wrap gap-2">
													<Button asChild variant="outline" size="sm">
														<a href={version.downloadUrl}>{t('download')}</a>
													</Button>
													<Button
														type="button"
														variant="outline"
														size="sm"
														disabled={
															schema.visibility !== 'public' ||
															version.status !== 'current'
														}
														onClick={() =>
															handleCopySchemaLink(version.downloadUrl)
														}
													>
														{copiedValue === version.downloadUrl
															? t('copied')
															: t('copy_link')}
													</Button>
												</div>
											</div>
										))}
									</div>
								</div>
							))}
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	)
}

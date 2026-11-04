import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLoaderData } from 'react-router'
import { type Route } from './+types/settings.preferences'
import { AutosaveStatusText } from '~/components/autosave-status.text'
import { LanguageSelect } from '~/components/language-select'
import { ThemeSelect } from '~/components/theme-select'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Checkbox } from '~/components/ui/checkbox'
import { Input, numberInputWithoutSteppers } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { useToast } from '~/components/ui/use-toast'
import {
	AUTOSAVE_DELAY_MS,
	useAutosaveFetcher,
} from '~/hooks/use-autosave-fetcher'
import { getProfileByUserId, updateProfile } from '~/db/models/profile.server'
import { getUserById } from '~/db/models/user.server'
import {
	isOptionalMapViewInputValid,
	MAP_ZOOM_LIMITS,
	parseOptionalMapViewportInput,
} from '~/lib/location'
import {
	disableNewsletterForUser,
	hasPendingNewsletterConfirmation,
	requestNewsletterConfirmation,
} from '~/services/newsletter-service.server'
import { requireUserId } from '~/services/session-service.server'

const DEFAULT_HOME_ZOOM = String(MAP_ZOOM_LIMITS.default)

type NewsletterValues = {
	newsletterRequested: boolean
}

type NewsletterActionData = {
	intent: 'autosave-newsletter-preferences'
	success: boolean
	newsletterSyncFailed: boolean
	newsletterConfirmationFailed: boolean
	newsletterOptIn: boolean
	newsletterOptInPending: boolean
	newsletterRequested: boolean
}

type MapPreferenceAutosaveValues = {
	homeLatitude: string
	homeLongitude: string
	homeZoom: string
}

type MapPreferencesActionData =
	| {
			intent: 'autosave-map-preferences'
			success: true
			updatedProfile: {
				homeLatitude: number | null
				homeLongitude: number | null
				homeZoom: number | null
			}
	  }
	| {
			intent: 'autosave-map-preferences'
			success: false
			message: string
	  }

export type PreferencesActionData =
	| MapPreferencesActionData
	| NewsletterActionData

export async function loader({ request }: Route.LoaderArgs) {
	const userId = await requireUserId(request)
	const [profile, user] = await Promise.all([
		getProfileByUserId(userId),
		getUserById(userId),
	])

	if (!profile || !user) {
		throw new Error('User preferences could not be loaded')
	}

	const newsletterOptInPending = await hasPendingNewsletterConfirmation(user.id)

	return {
		profile,
		newsletterOptIn: user.newsletterOptIn,
		newsletterOptInPending,
	}
}

export async function action({
	request,
}: Route.ActionArgs): Promise<PreferencesActionData> {
	const userId = await requireUserId(request)
	const formData = await request.formData()
	const intent = String(formData.get('intent') ?? '')

	if (intent === 'autosave-newsletter-preferences') {
		return handleNewsletterPreferencesAction(userId, formData)
	}

	if (intent === 'autosave-map-preferences') {
		return handleMapPreferencesAction(userId, formData)
	}

	return {
		intent: 'autosave-map-preferences',
		success: false,
		message: 'Invalid intent.',
	}
}

async function handleNewsletterPreferencesAction(
	userId: string,
	formData: FormData,
): Promise<NewsletterActionData> {
	const user = await getUserById(userId)

	if (!user) {
		return {
			intent: 'autosave-newsletter-preferences',
			success: false,
			newsletterSyncFailed: false,
			newsletterConfirmationFailed: true,
			newsletterOptIn: false,
			newsletterOptInPending: false,
			newsletterRequested: false,
		}
	}

	const newsletterRequested = formData.get('newsletterOptIn') === 'on'
	const newsletterOptInPending = await hasPendingNewsletterConfirmation(user.id)
	const newsletterAlreadyRequested =
		user.newsletterOptIn || newsletterOptInPending

	if (newsletterRequested === newsletterAlreadyRequested) {
		return {
			intent: 'autosave-newsletter-preferences',
			success: true,
			newsletterSyncFailed: false,
			newsletterConfirmationFailed: false,
			newsletterOptIn: user.newsletterOptIn,
			newsletterOptInPending,
			newsletterRequested,
		}
	}

	try {
		if (newsletterRequested) {
			await requestNewsletterConfirmation(user)
			return {
				intent: 'autosave-newsletter-preferences',
				success: true,
				newsletterSyncFailed: false,
				newsletterConfirmationFailed: false,
				newsletterOptIn: user.newsletterOptIn,
				newsletterOptInPending: true,
				newsletterRequested: true,
			}
		}

		const updatedUser = await disableNewsletterForUser(user)
		return {
			intent: 'autosave-newsletter-preferences',
			success: true,
			newsletterSyncFailed: false,
			newsletterConfirmationFailed: false,
			newsletterOptIn: updatedUser.newsletterOptIn,
			newsletterOptInPending: false,
			newsletterRequested: false,
		}
	} catch {
		return {
			intent: 'autosave-newsletter-preferences',
			success: false,
			newsletterSyncFailed: !newsletterRequested,
			newsletterConfirmationFailed: newsletterRequested,
			newsletterOptIn: user.newsletterOptIn,
			newsletterOptInPending,
			newsletterRequested: newsletterAlreadyRequested,
		}
	}
}

async function handleMapPreferencesAction(
	userId: string,
	formData: FormData,
): Promise<MapPreferencesActionData> {
	const profile = await getProfileByUserId(userId)

	if (!profile) {
		return {
			intent: 'autosave-map-preferences',
			success: false,
			message: 'Something went wrong.',
		}
	}

	const mapViewInput = {
		latitude: String(formData.get('homeLatitude') ?? ''),
		longitude: String(formData.get('homeLongitude') ?? ''),
		zoom: String(formData.get('homeZoom') ?? ''),
	}

	const parsedMapView = parseOptionalMapViewportInput(mapViewInput)

	if (!parsedMapView.success) {
		return {
			intent: 'autosave-map-preferences',
			success: false,
			message: parsedMapView.message,
		}
	}

	const updatedProfile = await updateProfile(profile.id, {
		displayName: profile.displayName,
		public: profile.public ?? false,
		homeLatitude: parsedMapView.data.latitude,
		homeLongitude: parsedMapView.data.longitude,
		homeZoom: parsedMapView.data.zoom,
	})

	if (!updatedProfile) {
		return {
			intent: 'autosave-map-preferences',
			success: false,
			message: 'Map preferences could not be updated.',
		}
	}

	return {
		intent: 'autosave-map-preferences',
		success: true,
		updatedProfile: {
			homeLatitude: updatedProfile.homeLatitude,
			homeLongitude: updatedProfile.homeLongitude,
			homeZoom: updatedProfile.homeZoom,
		},
	}
}

function hasCompleteHomeLocation(
	values: Pick<MapPreferenceAutosaveValues, 'homeLatitude' | 'homeLongitude'>,
) {
	return (
		values.homeLatitude.trim().length > 0 &&
		values.homeLongitude.trim().length > 0
	)
}

function normalizeMapPreferenceValues(
	values: MapPreferenceAutosaveValues,
): MapPreferenceAutosaveValues {
	return {
		...values,
		homeZoom: hasCompleteHomeLocation(values)
			? values.homeZoom
			: DEFAULT_HOME_ZOOM,
	}
}

export default function PreferencesSettingsPage() {
	const {
		profile,
		newsletterOptIn: initialNewsletterOptIn,
		newsletterOptInPending: initialNewsletterOptInPending,
	} = useLoaderData<typeof loader>()
	const { toast } = useToast()
	const { t } = useTranslation('settings')

	const [homeLatitude, setHomeLatitude] = useState(
		profile.homeLatitude?.toString() ?? '',
	)
	const [homeLongitude, setHomeLongitude] = useState(
		profile.homeLongitude?.toString() ?? '',
	)
	const [homeZoom, setHomeZoom] = useState(
		profile.homeZoom?.toString() ?? DEFAULT_HOME_ZOOM,
	)
	const [newsletterRequested, setNewsletterRequested] = useState(
		initialNewsletterOptIn || initialNewsletterOptInPending,
	)
	const [newsletterOptInPending, setNewsletterOptInPending] = useState(
		initialNewsletterOptInPending,
	)

	const autosaveValues = normalizeMapPreferenceValues({
		homeLatitude,
		homeLongitude,
		homeZoom,
	})
	const homeZoomEnabled = hasCompleteHomeLocation(autosaveValues)

	const validateMapAutosave = useCallback(
		(values: MapPreferenceAutosaveValues) => {
			return isOptionalMapViewInputValid({
				latitude: values.homeLatitude,
				longitude: values.homeLongitude,
				zoom: values.homeZoom,
			})
		},
		[],
	)

	const getMapAutosavePayload = useCallback(
		(values: MapPreferenceAutosaveValues) => ({
			intent: 'autosave-map-preferences',
			homeLatitude: values.homeLatitude.trim(),
			homeLongitude: values.homeLongitude.trim(),
			homeZoom: values.homeZoom.trim(),
		}),
		[],
	)

	const isMapAutosaveSuccess = useCallback(
		(actionData: PreferencesActionData) => {
			return (
				actionData.intent === 'autosave-map-preferences' && actionData.success
			)
		},
		[],
	)

	const getSavedMapValues = useCallback(
		(actionData: PreferencesActionData): MapPreferenceAutosaveValues => {
			if (
				actionData.intent !== 'autosave-map-preferences' ||
				!actionData.success
			) {
				return {
					homeLatitude,
					homeLongitude,
					homeZoom,
				}
			}

			return {
				homeLatitude: actionData.updatedProfile.homeLatitude?.toString() ?? '',
				homeLongitude:
					actionData.updatedProfile.homeLongitude?.toString() ?? '',
				homeZoom:
					actionData.updatedProfile.homeZoom?.toString() ?? DEFAULT_HOME_ZOOM,
			}
		},
		[homeLatitude, homeLongitude, homeZoom],
	)

	const handleMapAutosaveError = useCallback(
		(actionData: PreferencesActionData) => {
			if (
				actionData.intent !== 'autosave-map-preferences' ||
				actionData.success
			) {
				return
			}

			toast({
				title: t('something_went_wrong'),
				description: actionData.message,
				variant: 'destructive',
			})
		},
		[toast, t],
	)

	const mapAutosave = useAutosaveFetcher<
		MapPreferenceAutosaveValues,
		PreferencesActionData
	>({
		values: autosaveValues,
		lastSavedValues: {
			homeLatitude: profile.homeLatitude?.toString() ?? '',
			homeLongitude: profile.homeLongitude?.toString() ?? '',
			homeZoom: profile.homeZoom?.toString() ?? DEFAULT_HOME_ZOOM,
		},
		debounceMs: AUTOSAVE_DELAY_MS,
		validate: validateMapAutosave,
		getPayload: getMapAutosavePayload,
		isSuccess: isMapAutosaveSuccess,
		getSavedValues: getSavedMapValues,
		onError: handleMapAutosaveError,
	})

	const newsletterAutosave = useAutosaveFetcher<
		NewsletterValues,
		PreferencesActionData
	>({
		values: { newsletterRequested },
		lastSavedValues: {
			newsletterRequested:
				initialNewsletterOptIn || initialNewsletterOptInPending,
		},
		enabled: false,
		getPayload: (values) => ({
			intent: 'autosave-newsletter-preferences',
			newsletterOptIn: values.newsletterRequested ? 'on' : 'false',
		}),
		isSuccess: (data) =>
			data.intent === 'autosave-newsletter-preferences' &&
			data.success &&
			!data.newsletterSyncFailed &&
			!data.newsletterConfirmationFailed,
		getSavedValues: (data, submittedValues) => ({
			newsletterRequested:
				data.intent === 'autosave-newsletter-preferences'
					? data.newsletterRequested
					: submittedValues.newsletterRequested,
		}),
		onSuccess: (data) => {
			if (data.intent !== 'autosave-newsletter-preferences') return

			setNewsletterOptInPending(data.newsletterOptInPending)
			toast({
				title: data.newsletterRequested
					? t('newsletter_confirmation_email_sent')
					: t('newsletter_disabled'),
			})
		},
		onError: (data) => {
			if (data.intent !== 'autosave-newsletter-preferences') return

			setNewsletterRequested(data.newsletterRequested)
			setNewsletterOptInPending(data.newsletterOptInPending)
			toast({
				title: data.newsletterConfirmationFailed
					? t('newsletter_confirmation_failed')
					: t('newsletter_sync_failed'),
				variant: 'destructive',
			})
		},
	})

	useEffect(() => {
		const nextValues = {
			homeLatitude: profile.homeLatitude?.toString() ?? '',
			homeLongitude: profile.homeLongitude?.toString() ?? '',
			homeZoom: profile.homeZoom?.toString() ?? DEFAULT_HOME_ZOOM,
		}

		setHomeLatitude(nextValues.homeLatitude)
		setHomeLongitude(nextValues.homeLongitude)
		setHomeZoom(nextValues.homeZoom)
		mapAutosave.resetLastSaved(nextValues)
	}, [
		profile.homeLatitude,
		profile.homeLongitude,
		profile.homeZoom,
		mapAutosave.resetLastSaved,
	])

	useEffect(() => {
		const nextNewsletterRequested =
			initialNewsletterOptIn || initialNewsletterOptInPending
		setNewsletterRequested(nextNewsletterRequested)
		setNewsletterOptInPending(initialNewsletterOptInPending)
		newsletterAutosave.resetLastSaved({
			newsletterRequested: nextNewsletterRequested,
		})
	}, [
		initialNewsletterOptIn,
		initialNewsletterOptInPending,
		newsletterAutosave.resetLastSaved,
	])

	const submitMapAutosave = useCallback(
		(nextValues: MapPreferenceAutosaveValues) => {
			const normalizedValues = normalizeMapPreferenceValues(nextValues)

			if (validateMapAutosave(normalizedValues)) {
				mapAutosave.submit(normalizedValues)
			}
		},
		[mapAutosave, validateMapAutosave],
	)

	const handleHomeLatitudeChange = useCallback(
		(value: string) => {
			setHomeLatitude(value)
			submitMapAutosave({
				homeLatitude: value,
				homeLongitude,
				homeZoom,
			})
		},
		[homeLongitude, homeZoom, submitMapAutosave],
	)

	const handleHomeLongitudeChange = useCallback(
		(value: string) => {
			setHomeLongitude(value)
			submitMapAutosave({
				homeLatitude,
				homeLongitude: value,
				homeZoom,
			})
		},
		[homeLatitude, homeZoom, submitMapAutosave],
	)

	const handleHomeZoomChange = useCallback(
		(value: string) => {
			setHomeZoom(value)

			if (!hasCompleteHomeLocation({ homeLatitude, homeLongitude })) return

			submitMapAutosave({
				homeLatitude,
				homeLongitude,
				homeZoom: value,
			})
		},
		[homeLatitude, homeLongitude, submitMapAutosave],
	)

	const clearHomeLocation = useCallback(() => {
		const nextValues = {
			homeLatitude: '',
			homeLongitude: '',
			homeZoom: DEFAULT_HOME_ZOOM,
		}

		setHomeLatitude(nextValues.homeLatitude)
		setHomeLongitude(nextValues.homeLongitude)
		setHomeZoom(nextValues.homeZoom)
		mapAutosave.submit(nextValues)
	}, [mapAutosave])

	const handleNewsletterChange = useCallback(
		(checked: boolean) => {
			const nextValues = { newsletterRequested: checked }
			setNewsletterRequested(checked)
			newsletterAutosave.submit(nextValues)
		},
		[newsletterAutosave],
	)

	return (
		<Card className="border-border bg-card text-card-foreground">
			<CardHeader>
				<CardTitle>{t('preferences')}</CardTitle>
				<AutosaveStatusText status={mapAutosave.status} namespace="settings" />
			</CardHeader>

			<CardContent className="divide-border divide-y">
				<div className="flex flex-col items-stretch gap-3 py-4 first:pt-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
					<div>
						<div className="text-foreground font-medium">{t('language')}</div>
					</div>

					<LanguageSelect />
				</div>

				<div className="flex flex-col items-stretch gap-3 py-4 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
					<div className="min-w-0">
						<div className="text-foreground font-medium">{t('theme')}</div>
						<div className="text-muted-foreground text-sm">
							{t('theme_description')}
						</div>
					</div>

					<ThemeSelect />
				</div>

				<div className="flex flex-col gap-4 py-4 last:pb-0">
					<div>
						<div className="text-foreground font-medium">
							{t('map_start_location')}
						</div>
						<div className="text-muted-foreground text-sm">
							{t('map_start_location_description')}
						</div>
					</div>

					<div className="grid gap-4 sm:grid-cols-3">
						<div className="space-y-2">
							<Label htmlFor="homeLatitude">{t('latitude')}</Label>
							<Input
								id="homeLatitude"
								name="homeLatitude"
								type="number"
								className={numberInputWithoutSteppers}
								inputMode="decimal"
								min={-90}
								max={90}
								step="any"
								placeholder="51.961563"
								value={homeLatitude}
								onChange={(event) =>
									handleHomeLatitudeChange(event.target.value)
								}
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="homeLongitude">{t('longitude')}</Label>
							<Input
								id="homeLongitude"
								name="homeLongitude"
								type="number"
								className={numberInputWithoutSteppers}
								inputMode="decimal"
								min={-180}
								max={180}
								step="any"
								placeholder="7.628202"
								value={homeLongitude}
								onChange={(event) =>
									handleHomeLongitudeChange(event.target.value)
								}
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="homeZoom">{t('zoom')}</Label>
							<Input
								id="homeZoom"
								name="homeZoom"
								type="number"
								inputMode="decimal"
								min={MAP_ZOOM_LIMITS.min}
								max={MAP_ZOOM_LIMITS.max}
								step={0.5}
								disabled={!homeZoomEnabled}
								value={homeZoom}
								onChange={(event) => handleHomeZoomChange(event.target.value)}
							/>
						</div>
					</div>

					<div>
						<Button type="button" variant="outline" onClick={clearHomeLocation}>
							{t('clear_home_location')}
						</Button>
					</div>
				</div>

				<div className="flex flex-col items-start justify-between gap-3 py-4 last:pb-0 sm:flex-row sm:items-center sm:gap-4">
					<div className="flex w-full min-w-0 items-start gap-2 sm:w-auto">
						<Checkbox
							id="newsletterOptIn"
							name="newsletterOptIn"
							value="on"
							checked={newsletterRequested}
							onCheckedChange={(checked) =>
								handleNewsletterChange(checked === true)
							}
							disabled={newsletterAutosave.isSaving}
						/>
						<Label htmlFor="newsletterOptIn" className="text-sm leading-5">
							{t('receive_newsletter_messages')}
							{newsletterRequested && newsletterOptInPending && (
								<span className="text-muted-foreground ml-2">
									{t('newsletter_confirmation_pending')}
								</span>
							)}
						</Label>
					</div>

					<AutosaveStatusText
						status={newsletterAutosave.status}
						namespace="settings"
						className="min-h-5 shrink-0 text-sm"
					/>
				</div>
			</CardContent>
		</Card>
	)
}

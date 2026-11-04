import { Label } from '@radix-ui/react-label'
import {
	LucideCopy,
	LucideCopyCheck,
	LucideEye,
	LucideEyeOff,
	RefreshCw,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import {
	data,
	Link,
	redirect,
	useFetcher,
	useLoaderData,
	useNavigation,
} from 'react-router'
import { type Route } from './+types/device.$deviceId.edit.security'
import { Checkbox } from '@/components/ui/checkbox'
import { Callout } from '~/components/ui/alert'
import { AutosaveStatusText } from '~/components/autosave-status.text'
import { useAutosaveFetcher } from '~/hooks/use-autosave-fetcher'
import {
	addOrReplaceDeviceApiKey,
	getDevice,
	updateDevice,
} from '~/db/models/device.server'
import { getUserId } from '~/services/session-service.server'
import { Button } from '~/components/ui/button'
import { cn } from '~/lib/utils'

type SecurityAutosaveValues = {
	authEnabled: boolean
}

export type SecurityActionData =
	| {
			intent: 'autosave-security'
			success: true
			authEnabled: boolean
	  }
	| {
			intent: 'autosave-security'
			success: false
			message: string
	  }
	| {
			intent: 'generate-new-key'
			success: true
	  }
	| {
			intent: 'generate-new-key'
			success: false
			message: string
	  }

export async function loader({ request, params }: Route.LoaderArgs) {
	const userId = await getUserId(request)
	if (!userId) return redirect('/')

	const deviceId = params.deviceId
	if (typeof deviceId !== 'string') {
		throw new Response('Device ID not found', { status: 400 })
	}

	const device = await getDevice({ id: deviceId })

	if (!device) {
		throw new Response('Device not found', { status: 404 })
	}

	if (device.userId !== userId) {
		throw new Response('Forbidden', { status: 403 })
	}

	return {
		key: device.apiKey,
		deviceAuthEnabled: device.useAuth ?? false,
	}
}

export async function action({ request, params }: Route.ActionArgs) {
	const userId = await getUserId(request)
	if (!userId) return redirect('/')

	const { deviceId } = params

	if (typeof deviceId !== 'string') {
		throw new Response('Device ID not found', { status: 400 })
	}

	const device = await getDevice({ id: deviceId })

	if (!device) {
		throw new Response('Device not found', { status: 404 })
	}

	if (device.userId !== userId) {
		throw new Response('Forbidden', { status: 403 })
	}

	const formData = await request.formData()
	const intent = String(formData.get('intent') ?? '')

	if (intent === 'generate-new-key') {
		try {
			await addOrReplaceDeviceApiKey(device)

			return data(
				{
					intent,
					success: true,
				} satisfies SecurityActionData,
				{ status: 200 },
			)
		} catch (error) {
			console.error('Failed to generate new device API key:', error)

			return data(
				{
					intent,
					success: false,
					message: 'Failed to generate new key.',
				} satisfies SecurityActionData,
				{ status: 500 },
			)
		}
	}

	if (intent === 'autosave-security') {
		const authEnabled = formData.get('authEnabled') === 'true'

		try {
			await updateDevice(deviceId, {
				useAuth: authEnabled,
			})

			return data(
				{
					intent,
					success: true,
					authEnabled,
				} satisfies SecurityActionData,
				{ status: 200 },
			)
		} catch (error) {
			console.error('Failed to update device security settings:', error)

			return data(
				{
					intent,
					success: false,
					message: 'Failed to update security settings.',
				} satisfies SecurityActionData,
				{ status: 500 },
			)
		}
	}

	return data(
		{
			intent: 'autosave-security',
			success: false,
			message: 'Invalid intent.',
		} satisfies SecurityActionData,
		{ status: 400 },
	)
}

export default function EditBoxSecurity() {
	const { t } = useTranslation('settings')
	const { key, deviceAuthEnabled } = useLoaderData<typeof loader>()
	const generateKeyFetcher = useFetcher<typeof action>()
	const navigation = useNavigation()

	const [keyVisible, setKeyVisible] = useState(false)
	const [authEnabled, setAuthEnabled] = useState(deviceAuthEnabled)
	const [copiedToClipboard, setCopiedToClipboard] = useState(false)

	const validateAutosave = useCallback(() => {
		return true
	}, [])

	const getAutosavePayload = useCallback((values: SecurityAutosaveValues) => {
		return {
			intent: 'autosave-security',
			authEnabled: String(values.authEnabled),
		}
	}, [])

	const isAutosaveSuccess = useCallback((actionData: SecurityActionData) => {
		return actionData.intent === 'autosave-security' && actionData.success
	}, [])

	const getSavedValues = useCallback(
		(
			actionData: SecurityActionData,
			submittedValues: SecurityAutosaveValues,
		): SecurityAutosaveValues => {
			if (actionData.intent !== 'autosave-security' || !actionData.success) {
				return submittedValues
			}

			return {
				authEnabled: actionData.authEnabled,
			}
		},
		[],
	)

	const autosave = useAutosaveFetcher<
		SecurityAutosaveValues,
		SecurityActionData
	>({
		values: {
			authEnabled,
		},
		lastSavedValues: {
			authEnabled: deviceAuthEnabled,
		},
		debounceMs: 400,
		validate: validateAutosave,
		getPayload: getAutosavePayload,
		isSuccess: isAutosaveSuccess,
		getSavedValues,
	})

	useEffect(() => {
		setAuthEnabled(deviceAuthEnabled)

		autosave.resetLastSaved({
			authEnabled: deviceAuthEnabled,
		})
	}, [deviceAuthEnabled, autosave.resetLastSaved])

	const copyKeyToClipboard = async () => {
		if (!key) return

		await navigator.clipboard.writeText(key)
		setCopiedToClipboard(true)
	}

	useEffect(() => {
		if (!copiedToClipboard) return

		const timer = window.setTimeout(() => {
			setCopiedToClipboard(false)
		}, 2_500)

		return () => {
			window.clearTimeout(timer)
		}
	}, [copiedToClipboard])

	const isGeneratingNewKey =
		generateKeyFetcher.state !== 'idle' ||
		(navigation.state === 'submitting' &&
			navigation.formData?.get('intent') === 'generate-new-key')

	const disableKeyActions = !authEnabled || !key

	return (
		<div className="font-helvetica min-w-0 text-[14px]">
			<div className="mt-2 flex min-w-0 justify-between">
				<div className="min-w-0">
					<h1 className="text-3xl wrap-anywhere sm:text-4xl">
						{t('device_security.page_title')}
					</h1>

					<AutosaveStatusText status={autosave.status} namespace="settings" />
				</div>
			</div>

			<hr className="my-3 mt-6 h-px border-0 bg-[#dcdada] dark:bg-gray-700" />

			<p className="py-4">
				<Trans
					i18nKey="device_security.explanation_text"
					ns="settings"
					components={{
						apiDocLink: (
							<Link
								to="https://docs.opensensemap.org/#api-Measurements-postNewMeasurement"
								target="_blank"
								rel="noreferrer"
								className="underline"
							/>
						),
					}}
				/>
			</p>

			<Callout variant="caution">
				{t('device_security.warning_deactive_auth')}
			</Callout>

			<div className="flex flex-wrap items-center gap-4 py-5">
				<Checkbox
					name="enableAuth"
					id="enableAuth"
					checked={authEnabled}
					onCheckedChange={(checked) => {
						setAuthEnabled(checked === true)
					}}
				/>

				<Label htmlFor="enableAuth" className="cursor-pointer pt-1">
					{t('device_security.auth_enable_checkbox_label')}
				</Label>
			</div>

			<div>
				<Label htmlFor="api-key" className="cursor-pointer">
					{t('device_security.api_key_label')}
				</Label>

				<div className="mt-1 flex min-w-0">
					<span className="shrink-0">
						<button
							className="btn btn-default w-12 rounded-tr-none rounded-br-none disabled:opacity-40"
							onClick={() => setKeyVisible((visible) => !visible)}
							disabled={disableKeyActions}
							type="button"
						>
							{keyVisible ? (
								<LucideEyeOff size={20.5} />
							) : (
								<LucideEye size={20.5} />
							)}
						</button>
					</span>

					<input
						name="api-key"
						value={key ?? ''}
						className="form-control min-w-0 flex-1 rounded-none border-[#ccc]"
						type={keyVisible ? 'text' : 'password'}
						disabled
						readOnly
					/>

					<span className="shrink-0">
						<button
							className="btn btn-default relative h-full w-12 rounded-tl-none rounded-bl-none disabled:opacity-40"
							onClick={() => copyKeyToClipboard()}
							type="button"
							disabled={disableKeyActions}
						>
							<LucideCopyCheck
								size={20.5}
								className={`top-0 right-0 bottom-0 left-0 mx-auto my-auto ${
									copiedToClipboard
										? 'scale-100 opacity-100'
										: 'scale-50 opacity-0'
								} absolute text-green-700 transition-transform`}
							/>
							<LucideCopy
								size={20.5}
								className={`top-0 right-0 bottom-0 left-0 mx-auto my-auto ${
									copiedToClipboard ? 'opacity-0' : 'opacity-100'
								} absolute`}
							/>
						</button>
					</span>
				</div>
			</div>

			<br />

			<generateKeyFetcher.Form method="POST">
				<input type="hidden" name="intent" value="generate-new-key" />

				<Callout variant="warning">
					<p>
						<Trans
							t={t}
							i18nKey="device_security.generate_new_key_warning"
							components={{ b: <b /> }}
						></Trans>
					</p>

					<Button
						type="submit"
						variant="secondary"
						disabled={!authEnabled || isGeneratingNewKey}
						className="inline-flex items-center gap-2"
					>
						<RefreshCw
							className={cn('h-4 w-4', isGeneratingNewKey && 'animate-spin')}
						/>
						{t('device_security.generate_new_key_button')}
					</Button>
				</Callout>
			</generateKeyFetcher.Form>
		</div>
	)
}

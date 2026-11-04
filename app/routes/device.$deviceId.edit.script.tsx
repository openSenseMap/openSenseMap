import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { redirect, useLoaderData } from 'react-router'
import { type Route } from './+types/device.$deviceId.edit.script'
import { Button } from '~/components/ui/button'
import { PasswordInput } from '~/components/ui/password-input'
import { Textarea } from '~/components/ui/textarea'
import { getDeviceWithoutSensors } from '~/db/models/device.server'
import { getSensorsFromDevice } from '~/db/models/sensor.server'
import { getUserId } from '~/services/session-service.server'

//*****************************************************
export async function loader({ request, params }: Route.LoaderArgs) {
	const OSEM_GITHUB_URL =
		process.env.OSEM_GITHUB_URL || 'https://github.com/OpenSenseMap/'

	//* if user is not logged in, redirect to home
	const userId = await getUserId(request)
	if (!userId) return redirect('/')

	if (!params.deviceId) {
		throw new Response('Device not found', { status: 502 })
	}
	//* get device data
	const deviceData = await getDeviceWithoutSensors({ id: params.deviceId })
	//* get sensors data
	const sensorsData = await getSensorsFromDevice(params.deviceId)

	return { deviceData, sensorsData, ghUrl: OSEM_GITHUB_URL }
}

//*****************************************************
export async function action() {
	return ''
}

//**********************************
export default function EditBoxSensors() {
	const { deviceData, ghUrl } = useLoaderData<typeof loader>()
	const [sketch, setSketch] = useState<string>('')
	const [isCompiling, setIsCompiling] = useState(false)
	const { t } = useTranslation('script')
	const formRef = useRef<HTMLFormElement>(null)
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	const generateSketch = useCallback(async () => {
		if (!deviceData?.id || !formRef.current) return
		const formData = new FormData(formRef.current)
		const enableDebug = (formData.get('enable_debug') !== null).toString()
		const displayEnabled = (formData.get('display_enabled') !== null).toString()

		const params = new URLSearchParams()
		for (const [key, value] of formData.entries()) {
			if (typeof value === 'string') params.append(key, value)
		}
		params.set('enable_debug', enableDebug)
		params.set('display_enabled', displayEnabled)
		if (deviceData.apiKey) params.set('access_token', deviceData.apiKey)

		const response = await fetch(
			`/api/boxes/${deviceData.id}/script?${params.toString()}`,
			{ method: 'GET' },
		)
		if (!response.ok) return
		const text = await response.text()
		setSketch(text)
	}, [deviceData?.id, deviceData?.apiKey])

	const handleFormChange = useCallback(() => {
		if (debounceRef.current) clearTimeout(debounceRef.current)
		debounceRef.current = setTimeout(() => {
			void generateSketch()
		}, 300)
	}, [generateSketch])

	useEffect(() => {
		void generateSketch()
		return () => {
			if (debounceRef.current) clearTimeout(debounceRef.current)
		}
	}, [generateSketch])

	const handleCompile = async () => {
		if (!sketch || !deviceData?.id) return
		setIsCompiling(true)
		try {
			const response = await fetch(`/api/boxes/${deviceData.id}/compile`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ board: 'sensebox-mcu', sketch }),
			})
			if (!response.ok) {
				const err = await response
					.json()
					.catch(() => ({ message: 'Compile failed' }))
				console.error('Compile error:', err.message)
				return
			}
			const blob = await response.blob()
			const url = URL.createObjectURL(blob)
			const a = document.createElement('a')
			a.href = url
			a.download = `sketch-${deviceData.id}.bin`
			a.click()
			URL.revokeObjectURL(url)
		} finally {
			setIsCompiling(false)
		}
	}

	return (
		<div className="grid grid-rows-1">
			<div className="flex min-h-full items-center justify-center">
				<div className="dark:bg-dark-boxes dark:text-dark-text grow bg-white p-4">
					{deviceData?.model !== 'homeV2Wifi' ? (
						<div className="flex flex-col items-center justify-center gap-4 py-16 text-center text-gray-500">
							<p className="text-base">{t('no_script_for_model')}</p>
							<a
								href={ghUrl}
								target="_blank"
								rel="noopener noreferrer"
								className="text-light-green dark:text-dark-green underline"
							>
								{ghUrl}
							</a>
						</div>
					) : (
						<>
							<form ref={formRef} noValidate onChange={handleFormChange}>
								<div>
									<div className="mt-2 flex justify-between">
										<div>
											<span className="text-light-green dark:text-dark-green text-2xl font-bold">
												{t('configuration')}
											</span>
										</div>
									</div>
								</div>

								<hr className="my-3 mt-6 h-px border-0 bg-[#dcdada] dark:bg-gray-700" />

								<div className="space-y-5 pt-4">
									{/* PORT */}
									<div>
										<label
											htmlFor="port"
											className="txt-base block font-bold tracking-normal"
										>
											{t('fine_dust_port')}
										</label>

										<div className="mt-1">
											<select
												id="port"
												name="port"
												className="w-full appearance-auto rounded border border-gray-200 px-2 py-1.5 text-base"
											>
												<option value="Serial1">{t('serial_1')}</option>
												<option value="Serial2">{t('serial_2')}</option>
											</select>
										</div>
									</div>

									{/* Soil moisture & temp port */}
									<div>
										<label
											htmlFor="soilDigitalPort"
											className="txt-base block font-bold tracking-normal"
										>
											{t('soil_moisture_temp')}
										</label>

										<div className="mt-1">
											<select
												id="soilDigitalPort"
												name="soilDigitalPort"
												className="w-full appearance-auto rounded border border-gray-200 px-2 py-1.5 text-base"
											>
												<option value="A">A</option>
												<option value="B">B</option>
												<option value="C">C</option>
											</select>
										</div>
									</div>

									{/* sound port */}
									<div>
										<label
											htmlFor="soundMeterPort"
											className="txt-base block font-bold tracking-normal"
										>
											{t('sound_level_port')}
										</label>

										<div className="mt-1">
											<select
												id="soundMeterPort"
												name="soundMeterPort"
												className="w-full appearance-auto rounded border border-gray-200 px-2 py-1.5 text-base"
											>
												<option value="A">A</option>
												<option value="B">B</option>
												<option value="C">C</option>
											</select>
										</div>
									</div>

									{/* Windspeed port */}
									<div>
										<label
											htmlFor="windSpeedPort"
											className="txt-base block font-bold tracking-normal"
										>
											{t('wind_port')}
										</label>

										<div className="mt-1">
											<select
												id="windSpeedPort"
												name="windSpeedPort"
												className="w-full appearance-auto rounded border border-gray-200 px-2 py-1.5 text-base"
											>
												<option value="A">A</option>
												<option value="B">B</option>
												<option value="C">C</option>
											</select>
										</div>
									</div>

									{/* WIFI SSID */}
									<div>
										<label
											htmlFor="ssid"
											className="txt-base block font-bold tracking-normal"
										>
											{t('wifi_ssid')}
										</label>

										<div className="mt-1">
											<input
												id="ssid"
												required
												autoFocus={true}
												name="ssid"
												type="text"
												aria-describedby="name-error"
												className="w-full rounded border border-gray-200 px-2 py-1 text-base"
											/>
										</div>
									</div>

									{/* WIFI PAasword */}
									<div>
										<label
											htmlFor="password"
											className="txt-base block font-bold tracking-normal"
										>
											{t('wifi_password')}
										</label>

										<div className="mt-1">
											<PasswordInput
												id="password"
												required
												autoFocus={true}
												name="password"
												aria-describedby="name-error"
												className="text-base"
											/>
										</div>
									</div>
									<div className="flex flex-col gap-3">
										<label className="flex items-center gap-2">
											<input
												id="enable_debug"
												name="enable_debug"
												type="checkbox"
												className="h-4 w-4"
											/>
											<span className="txt-base font-bold tracking-normal">
												{t('enable_debug')}
											</span>
										</label>

										<label className="flex items-center gap-2">
											<input
												id="display_enabled"
												name="display_enabled"
												type="checkbox"
												className="h-4 w-4"
											/>
											<span className="txt-base font-bold tracking-normal">
												{t('display_enabled')}
											</span>
										</label>
									</div>

									<Button
										type="button"
										onClick={handleCompile}
										disabled={isCompiling || !sketch}
									>
										{isCompiling ? t('compiling') : t('compile_sketch')}
									</Button>
								</div>
							</form>
							<div className="py-6">
								<span className="py-1 text-sm text-gray-500 dark:text-gray-400">
									{t('your_sketch')}
								</span>
								<Textarea
									id="mqtt-connection-options"
									placeholder={t('enter_connection_options')}
									className="min-h-[320px]! resize-none"
									value={sketch}
									readOnly
								/>
							</div>
						</>
					)}
				</div>
			</div>
		</div>
	)
}

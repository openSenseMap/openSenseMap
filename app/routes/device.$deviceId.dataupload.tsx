import { ArrowLeft, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { redirect, Form, Link, useNavigation, useParams } from 'react-router'
import { type Route } from './+types/device.$deviceId.dataupload'
import { NavBar } from '~/components/nav-bar'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '~/components/ui/select'
import { Textarea } from '~/components/ui/textarea'
import { getDevice } from '~/db/models/device.server'
import { StandardResponse } from '~/lib/responses'
import { postNewMeasurements } from '~/services/measurement-service.server'
import { getUserId } from '~/services/session-service.server'

export async function loader({ request }: Route.LoaderArgs) {
	//* if user is not logged in, redirect to home
	const userId = await getUserId(request)
	if (!userId) return redirect('/')

	return {}
}

export async function action({
	request,
	params,
}: Route.ActionArgs): Promise<Response> {
	const method = request.method
	if (method !== 'POST') {
		return StandardResponse.methodNotAllowed(
			'Endpoint only supports POST requests',
		)
	}

	const userId = await getUserId(request)
	if (!userId) return redirect('/')

	const deviceId = params['deviceId']
	if (deviceId === undefined)
		return StandardResponse.badRequest('deviceId must be set but is undefined')

	const device = await getDevice({ id: deviceId })
	if (!device) return StandardResponse.badRequest('device not found')

	if (device.userId !== userId) {
		return StandardResponse.forbidden('User does not own this device')
	}

	const deviceApiKey = device.apiKey
	if (!deviceApiKey)
		return StandardResponse.badRequest('device api key not found')

	const formData = await request.formData()
	const contentType = formData.get('contentType')
	if (contentType === null || typeof contentType !== 'string')
		return StandardResponse.badRequest(
			'contentType is either not set or has a wrong type',
		)

	const measurementData = formData.get('measurement-data')
	if (measurementData === null || typeof measurementData !== 'string')
		return StandardResponse.badRequest(
			'measurement data is either not set or has a wrong type',
		)

	try {
		await postNewMeasurements(deviceId, measurementData, {
			contentType,
			luftdaten: false,
			hackair: false,
			authorization: deviceApiKey,
		})

		return StandardResponse.ok({})
	} catch (err: any) {
		// Handle different error types
		if (err.name === 'UnauthorizedError')
			return StandardResponse.unauthorized(err.message)

		if (err.name === 'ModelError' && err.type === 'UnprocessableEntityError')
			return StandardResponse.unprocessableContent(err.message)

		if (err.name === 'UnsupportedMediaTypeError')
			return StandardResponse.unsupportedMediaType(err.message)

		return StandardResponse.internalServerError(
			err.message || 'An unexpected error occurred',
		)
	}
}

export default function DataUpload({ actionData }: any) {
	// actionData needs to be any type until we migrate to Route.ActionArgs
	// Max number of characters to show for data
	// thats input to the text area
	const DATA_CUTOFF_CHARS = 3_000
	const { t } = useTranslation(['csv-upload', 'common'])
	const params = useParams()
	const nav = useNavigation()
	const textareaRef = useRef<HTMLTextAreaElement | null>(null)
	const [measurementData, setMeasurementData] = useState('')
	const [dataFormat, setDataFormat] = useState('text/csv')

	return (
		<div className="font-helvetica space-y-6 px-4 pb-16 sm:px-6 lg:px-10">
			<NavBar />

			<div>
				<div className="font-helvetica grid grid-cols-1 gap-6 text-[15px] tracking-wide md:grid-cols-8 md:gap-10 lg:grid-rows-1">
					<nav className="col-span-1 md:col-span-2">
						<ul>
							<li className="rounded p-3 text-[#676767] hover:bg-[#eee]">
								<ArrowLeft className="mr-2 inline h-5 w-5" />
								<Link to="/profile/me">
									{t('common:backToDashboardNavText')}
								</Link>
							</li>
						</ul>
					</nav>

					<main className="col-span-1 min-w-0 md:col-span-6">
						<Form method="post" noValidate>
							<div className="mx-auto max-w-3xl py-6 sm:px-4 sm:py-12">
								<h1 className="mb-6 text-3xl font-bold">
									{t('dataUploadHeading')}
								</h1>

								{actionData && Object.keys(actionData).length === 0 && (
									<div className="bg-light-green mb-8 rounded-md p-4 text-white">
										{t('successMessage')}
									</div>
								)}
								{actionData && Object.keys(actionData).includes('error') && (
									<div className="mb-8 rounded-md bg-red-500 p-4 font-bold text-white">
										{t('errorMessage', { message: actionData.error })}
									</div>
								)}

								<div className="bg-muted text-muted-foreground mb-8 rounded-md p-4">
									<p>
										<Trans t={t} i18nKey="dataUploadExplanation">
											Here you can upload measurements for this device. This can
											be of use for devices that log their measurements to an SD
											card when no means of direct communication to openSenseMap
											are available. Either select a file, or copy the data into
											the text field. Accepted data formats are described{' '}
											<a
												href="https://docs.opensensemap.org/#api-Measurements-postNewMeasurements"
												className="underline"
											>
												here
											</a>
											.
										</Trans>
									</p>
								</div>
								<div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
									<div>
										<Button
											variant="outline"
											className="dark:bg-dark-boxes relative w-full"
											disabled={
												nav.formAction ===
												`/device/${params.deviceId}/dataupload`
											}
										>
											<Label
												htmlFor="fileInput"
												className="flex h-full w-full cursor-pointer items-center justify-center"
											>
												{t('uploadFileLabel')}
											</Label>
											<Input
												type="file"
												id="fileInput"
												accept="text/csv,application/json,application/vnd.ms-excel"
												className="dark:bg-dark-boxes absolute inset-0 cursor-pointer opacity-0"
												onChange={(e) => {
													const file = e.currentTarget.files?.[0]
													if (file) {
														setDataFormat(file.type)
														const reader = new FileReader()
														reader.onload = (event) => {
															const fileContent =
																event.target?.result?.toString()
															if (fileContent) setMeasurementData(fileContent)
														}
														reader.readAsText(file)
													}
												}}
											/>
										</Button>
									</div>
									<div>
										<Select
											onValueChange={(value) => setDataFormat(value as string)}
											defaultValue={dataFormat ?? 'text/csv'}
											disabled={
												nav.formAction ===
												`/device/${params.deviceId}/dataupload`
											}
										>
											<SelectTrigger>
												<SelectValue placeholder="Select format" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="application/json">JSON</SelectItem>
												<SelectItem value="text/csv">CSV</SelectItem>
											</SelectContent>
										</Select>
									</div>
								</div>
								<div className="mb-8">
									<Textarea
										ref={textareaRef}
										id="measurement-data"
										name="measurement-data"
										placeholder={t('inputTextAreaPlaceholder')}
										className="h-75"
										onChange={(e) => setMeasurementData(e.target.value)}
										value={measurementData.slice(0, DATA_CUTOFF_CHARS)}
									/>
									{measurementData.length > DATA_CUTOFF_CHARS && (
										<div className="mt-2 text-sm text-gray-500">
											{t('textAreaCutoffHint', {
												length: measurementData.length,
											})}
										</div>
									)}
									<input type="hidden" name="contentType" value={dataFormat} />
								</div>
								<Button
									type="submit"
									className="w-full"
									disabled={
										measurementData.length === 0 ||
										nav.formAction === `/device/${params.deviceId}/dataupload`
									}
								>
									{t('uploadButtonLabel')}
									<Upload className="ml-2 inline h-5 w-5" />
								</Button>
							</div>
						</Form>
					</main>
				</div>
			</div>
		</div>
	)
}

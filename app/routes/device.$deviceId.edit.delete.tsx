import * as React from 'react'
import { Trans, useTranslation } from 'react-i18next'
import {
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
	Form,
	data,
	redirect,
	useActionData,
	useLoaderData,
} from 'react-router'
import invariant from 'tiny-invariant'
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
import { deleteDevice } from '~/lib/devices-service.server'
import { getUserDevice } from '~/models/device.server'
import { getUserEmail, getUserId } from '~/utils/session.server'

export async function loader({ request, params }: LoaderFunctionArgs) {
	const userId = await getUserId(request)
	if (!userId) return redirect('/')

	const deviceId = params.deviceId
	invariant(typeof deviceId === 'string', 'Device id not found.')

	const device = await getUserDevice({ id: deviceId, userId: userId })
	if (!device) return redirect('/profile/me')

	return data({ device })
}

export async function action({ request, params }: ActionFunctionArgs) {
	const userId = await getUserId(request)
	if (!userId) return redirect('/')

	const deviceId = params.deviceId
	invariant(typeof deviceId === 'string', 'Device id not found.')

	const formData = await request.formData()
	const passwordDelete = formData.get('passwordDelete')
	invariant(typeof passwordDelete === 'string', 'password must be a string')

	const userEmail = await getUserEmail(request)
	invariant(typeof userEmail === 'string', 'email not found')

	const device = await getUserDevice({ id: deviceId, userId })
	if (!device) return redirect('/profile/me')

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
			{ errors: { passwordDelete: 'Invalid password', integrationCleanup: false } },
			{ status: 400 },
		)
	}
	if (result === 'integration-cleanup-failed') {
		return data(
			{ errors: { passwordDelete: null, integrationCleanup: true } },
			{ status: 503 },
		)
	}

	return redirect('/profile/me')
}

export default function DeviceDeletePage() {
	const { device } = useLoaderData<typeof loader>()
	const actionData = useActionData<typeof action>()
	const passwordRef = React.useRef<HTMLInputElement>(null)
	const [password, setPassword] = React.useState('')

	const { t } = useTranslation('delete-device')


	React.useEffect(() => {
		if (actionData?.errors?.passwordDelete) passwordRef.current?.focus()
	}, [actionData])

	return (
			<Form method="post" className="space-y-6" noValidate>
				<Card className="dark:border-white dark:bg-dark-boxes">
					<CardHeader>
						<CardTitle className="text-red-600">{t('delete_device')}</CardTitle>
						<CardDescription>
							  <Trans
									t={t}
									i18nKey="confirm_permanent_deletion"
									values={{ device: device.name }}
									components={{ b: <b /> }}
								/>
						</CardDescription>
					</CardHeader>

					<CardContent className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="passwordDelete">{t('password')}</Label>
							<Input
								id="passwordDelete"
								name="passwordDelete"
								type="password"
								ref={passwordRef}
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								required
							/>
							{actionData?.errors?.passwordDelete && (
								<div className="text-sm text-red-500">
									{actionData.errors.passwordDelete}
								</div>
							)}
						</div>

						{actionData?.errors?.integrationCleanup && (
							<p role="alert" className="text-sm text-red-600">
								{t('integration_cleanup_failed')}
							</p>
						)}

						<Button type="submit" variant="destructive" disabled={!password}>
							{t('delete_device')}
						</Button>
					</CardContent>
				</Card>
			</Form>
	)
}
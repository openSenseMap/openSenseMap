import * as React from 'react'
import { Trans, useTranslation } from 'react-i18next'
import {
	Form,
	data,
	redirect,
	useActionData,
	useLoaderData,
} from 'react-router'
import invariant from 'tiny-invariant'
import { type Route } from './+types/device.$deviceId.edit.delete'
import { Button } from '~/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '~/components/ui/card'
import { Label } from '~/components/ui/label'
import { PasswordInput } from '~/components/ui/password-input'
import {
	deleteDevice,
	getDeviceWithoutSensors,
	getUserDevice,
} from '~/db/models/device.server'
import { verifyLogin } from '~/db/models/user.server'
import { deleteDeviceImage } from '~/lib/s3.server'
import { getUserEmail, getUserId } from '~/services/session-service.server'

export async function loader({ request, params }: Route.LoaderArgs) {
	const userId = await getUserId(request)
	if (!userId) return redirect('/')

	const deviceId = params.deviceId
	invariant(typeof deviceId === 'string', 'Device id not found.')

	const device = await getUserDevice({ id: deviceId, userId: userId })
	if (!device) return redirect('/profile/me')

	return data({ device })
}

export async function action({ request, params }: Route.ActionArgs) {
	const userId = await getUserId(request)
	if (!userId) return redirect('/')

	const deviceId = params.deviceId
	invariant(typeof deviceId === 'string', 'Device id not found.')

	const formData = await request.formData()
	const passwordDelete = formData.get('passwordDelete')
	invariant(typeof passwordDelete === 'string', 'password must be a string')

	const userEmail = await getUserEmail(request)
	invariant(typeof userEmail === 'string', 'email not found')

	const user = await verifyLogin(userEmail, passwordDelete)
	if (!user) {
		return data(
			{ errors: { passwordDelete: 'Invalid password' } },
			{ status: 400 },
		)
	}

	const device = await getDeviceWithoutSensors({ id: deviceId })
	if (device?.image) {
		try {
			await deleteDeviceImage(device.image)
		} catch (err) {
			console.error('Failed to delete device image:', err)
		}
	}

	await deleteDevice({ id: deviceId })

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
			<Card className="dark:bg-dark-boxes dark:border-white">
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
						<PasswordInput
							id="passwordDelete"
							name="passwordDelete"
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

					<Button type="submit" variant="destructive" disabled={!password}>
						{t('delete_device')}
					</Button>
				</CardContent>
			</Card>
		</Form>
	)
}

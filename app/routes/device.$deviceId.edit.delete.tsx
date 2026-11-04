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
	getDeviceWithoutSensors,
	getUserDevice,
} from '~/db/models/device.server'
import { getUserById } from '~/db/models/user.server'
import { type Device } from '~/db/schema'
import { deleteDevice } from '~/services/device-service.server'
import { getUserId } from '~/services/session-service.server'

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

	const user = await getUserById(userId)
	if (!user) {
		return redirect('/')
	}

	const device = (await getDeviceWithoutSensors({
		id: deviceId,
	})) as Device | null
	if (!device) {
		throw new Response('Device not found', { status: 404 })
	}

	if (device.userId !== user.id) {
		throw new Response('Forbidden', { status: 403 })
	}

	const deleteResult = await deleteDevice(user, device, passwordDelete)

	if (deleteResult === 'invalid-password') {
		return data(
			{ errors: { passwordDelete: 'Invalid password' } },
			{ status: 400 },
		)
	}

	if (deleteResult === 'not-owner') {
		throw new Response('Forbidden', { status: 403 })
	}

	if (deleteResult === 'not-found') {
		throw new Response('Device not found', { status: 404 })
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

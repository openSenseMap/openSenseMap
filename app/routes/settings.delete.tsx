import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Form, useActionData, data, redirect } from 'react-router'
import invariant from 'tiny-invariant'
import { type Route } from './+types/settings.delete'
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
import { useToast } from '~/components/ui/use-toast'
import {
	deleteUserByEmail,
	getUserByEmail,
	verifyLogin,
} from '~/db/models/user.server'
import { getUserEmail, getUserId } from '~/services/session-service.server'

//*****************************************************
export async function loader({ request }: Route.LoaderArgs) {
	//* if user is not logged in, redirect to home
	const userId = await getUserId(request)
	if (!userId) return redirect('/')

	//* get user email
	const userEmail = await getUserEmail(request)
	//* load user data
	invariant(userEmail, `Email not found!`)
	const userData = await getUserByEmail(userEmail)
	return userData
}

//*****************************************************
export async function action({ request }: Route.ActionArgs) {
	const formData = await request.formData()

	// get all values of the form
	const { intent, ...values } = Object.fromEntries(formData)
	const { passwordDelete } = values

	invariant(typeof passwordDelete === 'string', 'password must be a string')

	const userEmail = await getUserEmail(request)
	invariant(userEmail, `Email not found!`)

	const user = await verifyLogin(userEmail, passwordDelete)

	//* check if entered password is invalid
	if (!user) {
		return data(
			{
				errors: {
					passwordDelete: 'Invalid password',
				},
				intent: intent,
			},
			{ status: 400 },
		)
	}

	//* delete user
	await deleteUserByEmail(user.email)

	return redirect('')
}

export default function EditUserProfilePage() {
	const actionData = useActionData<typeof action>()
	const [passwordDelVal, setPasswordVal] = useState('') //* to enable delete account button
	//* To focus when an error occured
	const passwordDelRef = useRef<HTMLInputElement>(null)
	//* toast
	const { toast } = useToast()
	const { t } = useTranslation('settings')

	useEffect(() => {
		//* when password is not correct
		if (actionData && actionData?.errors?.passwordDelete) {
			toast({
				title: t('invalid_password'),
				variant: 'destructive',
			})
			passwordDelRef.current?.focus()
		}
	}, [actionData, toast])

	return (
		<Form method="post" className="space-y-6" noValidate>
			<Card>
				<CardHeader>
					<CardTitle>{t('delete_account')}</CardTitle>
					<CardDescription>{t('delete_account_description')}</CardDescription>
				</CardHeader>
				<CardContent className="grid gap-4">
					<div className="grid gap-2">
						<Label htmlFor="passwordDelete">{t('confirm_password')}</Label>
						<PasswordInput
							placeholder={t('enter_password')}
							required
							id="passwordDelete"
							name="passwordDelete"
							ref={passwordDelRef}
							value={passwordDelVal}
							onChange={(e) => setPasswordVal(e.target.value)}
						/>
					</div>
					<Button
						type="submit"
						name="intent"
						value="delete"
						variant="destructive"
						disabled={!passwordDelVal}
					>
						{t('delete_account')}
					</Button>
				</CardContent>
			</Card>
		</Form>
	)
}

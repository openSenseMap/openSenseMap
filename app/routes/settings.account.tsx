import { CheckLine, OctagonAlert } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import {
	Form,
	useActionData,
	useFetcher,
	useLoaderData,
	data,
	redirect,
	useSearchParams,
	useSubmit,
	useNavigation,
} from 'react-router'
import invariant from 'tiny-invariant'
import { type Route } from './+types/settings.account'
import { Callout } from '~/components/ui/alert'
import { Button } from '~/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { PasswordInput } from '~/components/ui/password-input'
import { useToast } from '~/components/ui/use-toast'
import {
	getUserById,
	updateUserEmail,
	updateUserName,
	verifyLogin,
	getUserByAnyEmail,
	updateUserPassword,
} from '~/db/models/user.server'
import { getUserId } from '~/services/session-service.server'
import { resendEmailConfirmation } from '~/services/user-service.server'
import { validatePassLength, validatePassType } from '~/utils'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '~/components/ui/dialog'

export async function loader({ request }: Route.LoaderArgs) {
	const userId = await getUserId(request)
	if (!userId) return redirect('/')

	const user = await getUserById(userId)
	if (!user) return redirect('/')

	return user
}

export async function action({ request }: Route.ActionArgs) {
	const formData = await request.formData()
	const intent = String(formData.get('intent') ?? '')

	const userId = await getUserId(request)
	if (!userId) return redirect('/')

	const user = await getUserById(userId)
	if (!user) return redirect('/')

	if (intent === 'update-password') {
		const currPass = String(formData.get('currentPassword') ?? '')
		const newPass = String(formData.get('newPassword') ?? '')
		const confirmPass = String(formData.get('newPasswordConfirm') ?? '')
		const passwordsList = [currPass, newPass, confirmPass]

		const checkPasswordsType = validatePassType(passwordsList)
		if (!checkPasswordsType.isValid) {
			return data(
				{
					intent,
					success: false,
					message: 'Password is required.',
				},
				{ status: 400 },
			)
		}

		const validatePasswordsLength = validatePassLength(passwordsList)
		if (!validatePasswordsLength.isValid) {
			return data(
				{
					intent,
					success: false,
					message: 'Password must be at least 8 characters long.',
				},
				{ status: 400 },
			)
		}

		if (newPass !== confirmPass) {
			return data(
				{
					intent,
					success: false,
					message: 'New passwords do not match.',
				},
				{ status: 400 },
			)
		}

		const ok = await verifyLogin(user.email, currPass)
		if (!ok) {
			return data(
				{
					intent,
					success: false,
					message: 'Current password is incorrect.',
				},
				{ status: 400 },
			)
		}

		await updateUserPassword(userId, newPass)

		return data({
			intent,
			success: true,
			message: 'Password updated successfully.',
		})
	}

	if (intent === 'resend-verification') {
		try {
			const result = await resendEmailConfirmation(user)
			if (result === 'already_confirmed') {
				return data({ intent, code: 'UnprocessableContent' }, { status: 422 })
			}
			return data({ intent, code: 'Ok' }, { status: 200 })
		} catch (err) {
			console.warn(err)
			return data({ intent, code: 'Error' }, { status: 500 })
		}
	}

	const name = String(formData.get('name') ?? '').trim()
	const email = String(formData.get('email') ?? '').trim()
	const currentPassword = String(formData.get('passwordUpdate') ?? '')

	invariant(typeof name === 'string', 'name must be a string')
	invariant(typeof email === 'string', 'email must be a string')
	invariant(typeof currentPassword === 'string', 'password must be a string')

	const pendingEmail = (user.unconfirmedEmail ?? '').trim()
	const hasPendingEmail = pendingEmail.length > 0

	const wantsEmailChange =
		email.length > 0 &&
		((hasPendingEmail && email !== pendingEmail) ||
			(!hasPendingEmail && email !== user.email))

	const wantsNameChange = name.length > 0 && name !== user.name

	const wantsAnyChange = wantsNameChange || wantsEmailChange

	if (!wantsAnyChange) {
		return data(
			{
				intent: 'update-profile',
				errors: { name: null, email: null, passwordUpdate: null },
			},
			{ status: 200 },
		)
	}

	if (wantsEmailChange) {
		if (!currentPassword) {
			return data(
				{
					intent: 'update-profile',
					errors: {
						name: null,
						email: null,
						passwordUpdate: 'Password is required to change email',
					},
				},
				{ status: 400 },
			)
		}

		const ok = await verifyLogin(user.email, currentPassword)
		if (!ok) {
			return data(
				{
					intent: 'update-profile',
					errors: {
						name: null,
						email: null,
						passwordUpdate: 'Invalid password',
					},
				},
				{ status: 400 },
			)
		}

		const existing = await getUserByAnyEmail(email)
		if (existing && existing.id !== user.id) {
			return data(
				{
					intent: 'update-profile',
					errors: {
						name: null,
						email: 'Email already in use',
						passwordUpdate: null,
					},
				},
				{ status: 409 },
			)
		}
	}

	if (wantsNameChange) {
		await updateUserName(user.email, name)
	}

	if (wantsEmailChange) {
		const [updatedUser] = await updateUserEmail(user, email)

		try {
			await resendEmailConfirmation(updatedUser)
		} catch (err) {
			console.error(
				'Failed to send email confirmation after email change:',
				err,
			)
			return data(
				{
					intent: 'update-profile',
					errors: { name: null, email: null, passwordUpdate: null },
					emailDeliveryFailed: true,
				},
				{ status: 200 },
			)
		}
	}

	return data(
		{
			intent: 'update-profile',
			errors: { name: null, email: null, passwordUpdate: null },
			emailDeliveryFailed: false,
		},
		{ status: 200 },
	)
}

export default function EditUserProfilePage() {
	const userData = useLoaderData<typeof loader>()
	const actionData = useActionData<typeof action>()
	const resendFetcher = useFetcher<typeof action>()
	const passwordFetcher = useFetcher<typeof action>()
	const { toast } = useToast()
	const { t } = useTranslation('settings')

	const [params] = useSearchParams()
	useEffect(() => {
		const status = params.get('emailConfirm')
		if (status === 'ok')
			toast({ title: t('email_confirmed'), variant: 'success' })
		if (status === 'invalid_or_expired')
			toast({ title: t('verification_link_invalid'), variant: 'destructive' })
		if (status === 'missing_params')
			toast({ title: t('verification_link_invalid'), variant: 'destructive' })
	}, [params, toast, t])

	const submit = useSubmit()
	const navigation = useNavigation()

	const profileFormRef = useRef<HTMLFormElement>(null)
	const passwordUpdRef = useRef<HTMLInputElement>(null)

	const [emailConfirmOpen, setEmailConfirmOpen] = useState(false)
	const [emailPassword, setEmailPassword] = useState('')

	const { pendingEmail, hasPendingEmail, emailShown, showConfirmed } =
		useMemo(() => {
			const pending = (userData?.unconfirmedEmail ?? '').trim()
			const hasPending = pending.length > 0
			const shown = hasPending ? pending : (userData?.email ?? '')
			const confirmed = Boolean(userData?.emailIsConfirmed) && !hasPending
			return {
				pendingEmail: pending,
				hasPendingEmail: hasPending,
				emailShown: shown,
				showConfirmed: confirmed,
			}
		}, [userData])

	const [name, setName] = useState(userData?.name ?? '')
	const [email, setEmail] = useState(emailShown)

	const emailChanged = email.trim() !== emailShown.trim()

	function submitProfileWithPassword() {
		if (!profileFormRef.current) return

		const formData = new FormData(profileFormRef.current)

		formData.set('intent', 'update-profile')
		formData.set('passwordUpdate', emailPassword)

		submit(formData, { method: 'post' })
	}

	function handleSaveClick(event: React.MouseEvent<HTMLButtonElement>) {
		if (!emailChanged) return

		event.preventDefault()
		setEmailConfirmOpen(true)

		window.requestAnimationFrame(() => {
			passwordUpdRef.current?.focus()
		})
	}
	const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)

	const passwordFormRef = useRef<HTMLFormElement>(null)
	const currPassRef = useRef<HTMLInputElement>(null)
	const newPassRef = useRef<HTMLInputElement>(null)
	const confirmPassRef = useRef<HTMLInputElement>(null)

	useEffect(() => {
		setName(userData?.name ?? '')
		setEmail(emailShown)
	}, [userData, emailShown])

	useEffect(() => {
		if (!actionData || actionData.intent !== 'update-profile') return
		if (!('errors' in actionData)) return

		if (actionData.errors?.passwordUpdate) {
			toast({ title: t('invalid_password'), variant: 'destructive' })
			setEmailConfirmOpen(true)

			window.requestAnimationFrame(() => {
				passwordUpdRef.current?.focus()
			})

			return
		}

		if (actionData.errors?.email) {
			toast({ title: String(actionData.errors.email), variant: 'destructive' })
			return
		}

		if ('emailDeliveryFailed' in actionData && actionData.emailDeliveryFailed) {
			toast({
				title: t('email_change_delivery_failed'),
				variant: 'destructive',
			})
			return
		}

		setEmailConfirmOpen(false)
		setEmailPassword('')

		toast({ title: t('profile_successfully_updated'), variant: 'success' })
	}, [actionData, toast, t])

	useEffect(() => {
		if (passwordFetcher.state !== 'idle' || !passwordFetcher.data) return
		if (passwordFetcher.data.intent !== 'update-password') return
		if (!('success' in passwordFetcher.data)) return

		if (passwordFetcher.data.success) {
			passwordFormRef.current?.reset()
			toast({ title: passwordFetcher.data.message, variant: 'success' })
			setPasswordDialogOpen(false)
			return
		}

		toast({
			title: passwordFetcher.data.message,
			variant: 'destructive',
			description: t('try_again'),
		})

		currPassRef.current?.focus()
	}, [passwordFetcher.state, passwordFetcher.data, toast, t])

	useEffect(() => {
		if (resendFetcher.state !== 'idle' || !resendFetcher.data) return
		if (resendFetcher.data.intent !== 'resend-verification') return
		if (!('code' in resendFetcher.data)) return

		const { code } = resendFetcher.data
		if (code === 'Ok') {
			toast({ title: t('verification_email_sent'), variant: 'success' })
		} else if (code === 'UnprocessableContent') {
			toast({ title: t('email_already_confirmed'), variant: 'default' })
		} else {
			toast({ title: t('verification_email_failed'), variant: 'destructive' })
		}
	}, [resendFetcher.state, resendFetcher.data, toast, t])

	const saveDisabled =
		name === (userData?.name ?? '') && email.trim() === emailShown.trim()

	return (
		<>
			<Form ref={profileFormRef} method="post" className="space-y-6" noValidate>
				<Card className="border-border">
					<CardHeader>
						<CardTitle>{t('account_information')}</CardTitle>
						<CardDescription>{t('update_basic_details')}</CardDescription>
					</CardHeader>
					<CardContent className="grid gap-6">
						<div className="grid gap-2">
							<Label htmlFor="name">{t('name')}</Label>
							<Input
								id="name"
								required
								name="name"
								type="text"
								placeholder={t('enter_name')}
								value={name}
								onChange={(e) => setName(e.target.value)}
							/>
							{name !== (userData?.name ?? '') && (
								<Callout variant="warning">
									<Trans
										i18nKey="username_change_warning"
										ns="settings"
										values={{ oldUsername: userData?.name ?? '' }}
										components={{ strong: <strong />, code: <code /> }}
									/>
								</Callout>
							)}
						</div>

						<div className="grid gap-2">
							<Label htmlFor="email">{t('email')}</Label>
							<Input
								id="email"
								name="email"
								placeholder={t('enter_email')}
								type="email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
							/>

							{showConfirmed ? (
								<p className="flex items-center gap-1 text-sm text-green-500 dark:text-green-300">
									<span className="inline-flex gap-1">
										<CheckLine /> {t('email_confirmed')}
									</span>
								</p>
							) : (
								<div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
									<p className="min-w-0 text-sm text-orange-500 dark:text-amber-400">
										<span className="inline-flex items-start gap-1">
											<OctagonAlert />{' '}
											{hasPendingEmail
												? t('email_not_confirmed')
												: t('email_not_confirmed')}
										</span>
									</p>

									<Button
										type="button"
										variant="default"
										size="sm"
										className="w-full sm:w-auto"
										disabled={resendFetcher.state === 'submitting'}
										onClick={() => {
											void resendFetcher.submit(
												{ intent: 'resend-verification' },
												{ method: 'post' },
											)
										}}
									>
										{resendFetcher.state === 'submitting'
											? t('sending')
											: t('resend_verification')}
									</Button>
								</div>
							)}

							{hasPendingEmail ? (
								<p className="text-muted-foreground text-sm">
									{t('email_change_pending_hint', {
										pendingEmail,
										currentEmail: userData?.email ?? '',
									})}
								</p>
							) : null}
						</div>

						<div className="flex flex-col items-stretch gap-4 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between dark:border-white">
							<div className="min-w-0 space-y-1">
								<p className="font-medium">{t('update_password')}</p>
								<p className="text-muted-foreground text-sm">
									{t('update_password_description')}
								</p>
							</div>

							<Button
								type="button"
								variant="outline"
								className="w-full shrink-0 sm:w-auto"
								onClick={() => setPasswordDialogOpen(true)}
							>
								{t('update_password')}
							</Button>
						</div>
					</CardContent>

					<CardFooter>
						<Button
							type="submit"
							disabled={saveDisabled}
							onClick={handleSaveClick}
						>
							{t('save_changes')}
						</Button>
					</CardFooter>
				</Card>
			</Form>

			<Dialog
				open={emailConfirmOpen}
				onOpenChange={(open) => {
					setEmailConfirmOpen(open)

					if (!open) {
						setEmailPassword('')
					}
				}}
			>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>{t('confirm_email_change')}</DialogTitle>
						<DialogDescription>
							{t('confirm_email_change_description', {
								currentEmail: userData?.email ?? '',
								newEmail: email,
							})}
						</DialogDescription>
					</DialogHeader>

					<div className="grid gap-2">
						<Label htmlFor="passwordUpdate">{t('confirm_password')}</Label>
						<PasswordInput
							ref={passwordUpdRef}
							id="passwordUpdate"
							name="passwordUpdate"
							autoComplete="current-password"
							placeholder={t('enter_current_password')}
							value={emailPassword}
							onChange={(event) => setEmailPassword(event.target.value)}
							onKeyDown={(event) => {
								if (event.key === 'Enter') {
									event.preventDefault()
									submitProfileWithPassword()
								}
							}}
						/>
					</div>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => {
								setEmailConfirmOpen(false)
								setEmailPassword('')
							}}
						>
							{t('cancel')}
						</Button>

						<Button
							type="button"
							disabled={!emailPassword || navigation.state === 'submitting'}
							onClick={submitProfileWithPassword}
						>
							{navigation.state === 'submitting' ? t('saving') : t('confirm')}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
			<Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>{t('update_password')}</DialogTitle>
						<DialogDescription>
							{t('update_password_description')}
						</DialogDescription>
					</DialogHeader>

					<passwordFetcher.Form
						method="post"
						className="space-y-4"
						noValidate
						ref={passwordFormRef}
					>
						<input type="hidden" name="intent" value="update-password" />

						<div className="space-y-2">
							<Label htmlFor="currentPassword">{t('current_password')}</Label>
							<PasswordInput
								ref={currPassRef}
								id="currentPassword"
								name="currentPassword"
								placeholder={t('enter_current_password')}
								autoComplete="current-password"
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="newPassword">{t('new_password')}</Label>
							<PasswordInput
								ref={newPassRef}
								id="newPassword"
								name="newPassword"
								placeholder={t('enter_new_password')}
								autoComplete="new-password"
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="newPasswordConfirm">
								{t('confirm_password')}
							</Label>
							<PasswordInput
								ref={confirmPassRef}
								id="newPasswordConfirm"
								name="newPasswordConfirm"
								placeholder={t('confirm_new_password')}
								autoComplete="new-password"
							/>
						</div>

						<div className="flex justify-end gap-2 pt-2">
							<Button
								type="button"
								variant="outline"
								onClick={() => setPasswordDialogOpen(false)}
							>
								{t('cancel')}
							</Button>

							<Button
								type="submit"
								disabled={passwordFetcher.state === 'submitting'}
							>
								{passwordFetcher.state === 'submitting'
									? t('saving')
									: t('save_changes')}
							</Button>
						</div>
					</passwordFetcher.Form>
				</DialogContent>
			</Dialog>
		</>
	)
}

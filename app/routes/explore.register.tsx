import * as React from 'react'
import { useTranslation } from 'react-i18next'
import {
	data,
	redirect,
	Form,
	Link,
	useActionData,
	useNavigation,
	useSearchParams,
} from 'react-router'
import invariant from 'tiny-invariant'
import { type Route } from './+types/explore.register'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PasswordInput } from '@/components/ui/password-input'
import Spinner from '~/components/spinner'
import { Button } from '~/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '~/components/ui/card'
import { getCurrentEffectiveTos } from '~/db/models/tos.server'
import { getUserByEmail, getUserByUsername } from '~/db/models/user.server'
import { getLocale } from '~/middleware/i18next'
import { createUserSession, getUserId } from '~/services/session-service.server'
import { registerUser } from '~/services/user-service.server'
import { safeRedirect, validateEmail, validateName } from '~/utils'

export async function loader({ request }: Route.LoaderArgs) {
	const userId = await getUserId(request)
	if (userId) return redirect('/')
	return {}
}

export async function action({ context, request }: Route.ActionArgs) {
	const formData = await request.formData()
	const { username, email, password, tosAccepted, newsletterOptIn } =
		Object.fromEntries(formData)
	const redirectTo = safeRedirect(formData.get('redirectTo'), '/explore')

	if (!username || typeof username !== 'string') {
		return data(
			{
				errors: {
					username: 'username_required',
					email: null,
					password: null,
					tosAccepted: null,
				},
			},
			{ status: 400 },
		)
	}

	//* Validate userName
	const validateUserName = validateName(username?.toString())
	if (!validateUserName.isValid) {
		return data(
			{
				errors: {
					username: validateUserName.errorMsg,
					password: null,
					email: null,
					tosAccepted: null,
				},
			},
			{ status: 400 },
		)
	}

	const existingUsername = await getUserByUsername(username)
	if (existingUsername)
		return data(
			{
				errors: {
					username: 'username_already_taken',
					email: null,
					password: null,
					tosAccepted: null,
				},
			},
			{ status: 400 },
		)

	if (!validateEmail(email)) {
		return data(
			{
				errors: {
					username: null,
					email: 'email_invalid',
					password: null,
					tosAccepted: null,
				},
			},
			{ status: 400 },
		)
	}

	if (typeof password !== 'string' || password.length === 0) {
		return data(
			{
				errors: {
					username: null,
					password: 'password_required',
					email: null,
					tosAccepted: null,
				},
			},
			{ status: 400 },
		)
	}

	if (password.length < 8) {
		return data(
			{
				errors: {
					username: null,
					password: 'password_too_short',
					email: null,
					tosAccepted: null,
				},
			},
			{ status: 400 },
		)
	}

	//* check if user exists by email
	const existingUserByEmail = await getUserByEmail(email)
	if (existingUserByEmail) {
		return data(
			{
				errors: {
					username: null,
					email: 'email_already_taken',
					password: null,
					tosAccepted: null,
				},
			},
			{ status: 400 },
		)
	}

	if (tosAccepted !== 'on') {
		return data(
			{
				errors: {
					username: null,
					email: null,
					password: null,
					tosAccepted: 'tos_must_accept',
				},
			},
			{ status: 400 },
		)
	}

	const tos = await getCurrentEffectiveTos()
	if (!tos) {
		return data(
			{
				errors: {
					username: null,
					email: null,
					password: null,
					tosAccepted: 'tos_unavailable',
				},
			},
			{ status: 500 },
		)
	}

	invariant(typeof username === 'string', 'username must be a string')

	//* get current locale
	const locale = getLocale(context)
	const language = locale === 'de' ? 'de_DE' : 'en_US'

	const result = await registerUser(
		username,
		email,
		password,
		language,
		tosAccepted === 'on',
		newsletterOptIn === 'on',
	)

	if (!result.ok) {
		return data(
			{
				errors: {
					username: result.field === 'username' ? result.code : null,
					email: result.field === 'email' ? result.code : null,
					password: result.field === 'password' ? result.code : null,
					tosAccepted: result.field === 'tos' ? result.code : null,
					form: result.field === 'form' ? result.code : null,
				},
			},
			{ status: 400 },
		)
	}

	if (!result.emailSent) {
		return data({ emailDeliveryFailed: true }, { status: 200 })
	}

	return createUserSession({
		request,
		userId: result.user.id,
		remember: false,
		redirectTo,
	})
}

export default function RegisterDialog() {
	const { t } = useTranslation('register')
	const navigation = useNavigation()
	const [searchParams] = useSearchParams()
	const actionData = useActionData<typeof action>()
	const usernameRef = React.useRef<HTMLInputElement>(null)
	const emailRef = React.useRef<HTMLInputElement>(null)
	const passwordRef = React.useRef<HTMLInputElement>(null)

	React.useEffect(() => {
		if (actionData && 'errors' in actionData) {
			if (actionData.errors?.username) {
				usernameRef.current?.focus()
			} else if (actionData.errors?.email) {
				emailRef.current?.focus()
			} else if (actionData.errors?.password) {
				passwordRef.current?.focus()
			}
		}
	}, [actionData])

	const actionErrors =
		actionData && 'errors' in actionData ? actionData.errors : undefined

	if (
		actionData &&
		'emailDeliveryFailed' in actionData &&
		actionData.emailDeliveryFailed
	) {
		return (
			<div className="relative flex h-full w-full items-start justify-center overflow-y-auto p-4 sm:items-center">
				<Link
					to={{
						pathname: '/explore',
						search: searchParams.toString(),
					}}
				>
					<div className="absolute inset-0 z-40 h-full w-full bg-black opacity-25" />
				</Link>
				<Card className="relative z-50 my-auto w-full max-w-md min-w-0">
					<CardHeader>
						<CardTitle className="text-2xl font-bold">
							{t('account_created')}
						</CardTitle>
						<CardDescription>
							{t('email_delivery_failed_description')}
						</CardDescription>
					</CardHeader>
					<CardFooter className="flex flex-col items-center gap-2">
						<Link to="/explore/login" className="w-full">
							<Button className="bg-light-blue w-full">
								{t('go_to_login')}
							</Button>
						</Link>
					</CardFooter>
				</Card>
			</div>
		)
	}

	return (
		<div className="relative flex h-full w-full items-start justify-center overflow-y-auto p-4 sm:items-center">
			<Link
				to={{
					pathname: '/explore',
					search: searchParams.toString(),
				}}
			>
				<div className="absolute inset-0 z-40 h-full w-full bg-black opacity-25" />
			</Link>
			<Card className="relative z-50 my-auto w-full max-w-md min-w-0">
				{navigation.state === 'loading' && (
					<div className="absolute inset-0 z-50 flex items-center justify-center bg-white/30 backdrop-blur-xs dark:bg-zinc-800/30">
						<Spinner />
					</div>
				)}
				<Form method="post" className="space-y-6" noValidate>
					<CardHeader>
						<CardTitle className="text-2xl font-bold">
							{t('register')}
						</CardTitle>
						<CardDescription>{t('create_account')}</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="username">{t('username')}</Label>
							<Input
								id="username"
								aria-invalid={actionErrors?.username ? true : undefined}
								aria-describedby={
									actionErrors?.username ? 'username-error' : undefined
								}
								placeholder={t('enter_username')}
								ref={usernameRef}
								name="username"
								type="text"
								autoFocus={true}
							/>
							<p className="text-muted-foreground text-xs">
								{t('username_hint')}
							</p>
							{actionErrors?.username && (
								<div className="mt-1 text-sm text-red-500" id="username-error">
									{t(actionErrors?.username)}
								</div>
							)}
						</div>
						<div className="space-y-2">
							<Label htmlFor="email">{t('email')}</Label>
							<Input
								id="email"
								type="email"
								placeholder={t('enter_email')}
								ref={emailRef}
								required
								autoFocus={true}
								name="email"
								autoComplete="email"
								aria-invalid={actionErrors?.email ? true : undefined}
								aria-describedby="email-error"
							/>
							{actionErrors?.email && (
								<div className="mt-1 text-sm text-red-500" id="email-error">
									{t(actionErrors?.email)}
								</div>
							)}
						</div>
						<div className="space-y-2">
							<Label htmlFor="password">{t('password')}</Label>
							<PasswordInput
								id="password"
								placeholder={t('enter_password')}
								ref={passwordRef}
								name="password"
								autoComplete="new-password"
								aria-invalid={actionErrors?.password ? true : undefined}
								aria-describedby="password-error"
							/>
							<p className="text-muted-foreground text-xs">
								{t('password_hint')}
							</p>
							{actionErrors?.password && (
								<div className="mt-1 text-sm text-red-500" id="password-error">
									{t(actionErrors?.password)}
								</div>
							)}
						</div>
						<div className="flex items-start gap-2">
							<Checkbox
								id="tosAccepted"
								name="tosAccepted"
								value="on"
								aria-invalid={actionErrors?.tosAccepted ? true : undefined}
								aria-describedby="tos-error"
								className="mt-1"
							/>
							<Label htmlFor="tosAccepted" className="text-sm leading-5">
								{t('agree_tos_prefix')}{' '}
								<Link
									to="/terms"
									className="underline"
									target="_blank"
									rel="noreferrer"
								>
									{t('terms_of_service')}
								</Link>{' '}
								{t('agree_tos_suffix')}
							</Label>
						</div>
						<div className="flex items-start gap-2">
							<Checkbox
								id="newsletterOptIn"
								name="newsletterOptIn"
								value="on"
								className="mt-1"
							/>
							<Label htmlFor="newsletterOptIn" className="text-sm leading-5">
								{t('newsletter_opt_in')}
							</Label>
						</div>
						<div className="flex items-start gap-2">
							<Label className="text-sm leading-5">
								{t('privacy_policy_prefix')}{' '}
								<Link
									to="/privacy"
									className="underline"
									target="_blank"
									rel="noreferrer"
								>
									{t('privacy_policy')}
								</Link>
								{'.'}
							</Label>
						</div>

						{actionErrors?.tosAccepted && (
							<div className="mt-1 text-sm text-red-500" id="tos-error">
								{t(actionErrors?.tosAccepted)}
							</div>
						)}
					</CardContent>
					<CardFooter className="flex flex-col items-center gap-2">
						<Button className="bg-light-blue w-full">{t('register')}</Button>
						<div className="text-muted-foreground text-center text-sm">
							{t('already_account')}{' '}
							<Link to="/explore/login" className="underline">
								{t('login')}
							</Link>
						</div>
					</CardFooter>
				</Form>
			</Card>
		</div>
	)
}

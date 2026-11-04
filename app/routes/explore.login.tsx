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
	useLoaderData,
} from 'react-router'
import { type Route } from './+types/explore.login'
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
import { Checkbox } from '~/components/ui/checkbox'
import { toast } from '~/components/ui/use-toast'
import { verifyLogin } from '~/db/models/user.server'
import { createUserSession, getUserId } from '~/services/session-service.server'
import { safeRedirect } from '~/utils'

export async function loader({ request }: Route.LoaderArgs) {
	const url = new URL(request.url)
	const userId = await getUserId(request)
	if (userId) {
		const redirectTo = safeRedirect(
			url.searchParams.get('redirectTo'),
			'/explore',
		)
		return redirect(redirectTo)
	}

	return data({
		redirectTo: safeRedirect(url.searchParams.get('redirectTo'), '/explore'),
	})
}

export async function action({ request }: Route.ActionArgs) {
	const formData = await request.formData()
	const identifier = formData.get('identifier')
	const password = formData.get('password')
	const redirectTo = safeRedirect(formData.get('redirectTo'), '/explore')
	const remember = formData.get('remember')

	if (typeof identifier !== 'string' || identifier.trim().length === 0) {
		return data(
			{
				errors: {
					identifier: 'Email or username is required',
					password: null,
				},
			},
			{ status: 400 },
		)
	}

	if (typeof password !== 'string' || password.length === 0) {
		return data(
			{
				errors: {
					password: 'Password is required',
					identifier: null,
				},
			},
			{ status: 400 },
		)
	}

	if (password.length < 8) {
		return data(
			{
				errors: {
					password: 'Password is too short',
					identifier: null,
				},
			},
			{ status: 400 },
		)
	}

	const user = await verifyLogin(identifier, password)
	if (!user) {
		return data(
			{
				errors: {
					identifier: 'Invalid email, username or password',
					password: null,
				},
			},
			{ status: 400 },
		)
	}

	return createUserSession({
		request,
		userId: user.id,
		remember: remember === 'on',
		redirectTo,
	})
}

export default function LoginPage() {
	const [searchParams] = useSearchParams()
	const loaderData = useLoaderData<typeof loader>()
	const actionData = useActionData<typeof action>()
	const identifierRef = React.useRef<HTMLInputElement>(null)
	const passwordRef = React.useRef<HTMLInputElement>(null)

	const { t } = useTranslation('login')
	const navigation = useNavigation()

	React.useEffect(() => {
		if (actionData?.errors?.identifier) {
			identifierRef.current?.focus()
		} else if (actionData?.errors?.password) {
			passwordRef.current?.focus()
		}
	}, [actionData])

	React.useEffect(() => {
		if (searchParams.get('passwordReset') === '1') {
			toast({
				title: t('password_reset_success'),
				variant: 'success',
			})
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

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
					<input
						type="hidden"
						name="redirectTo"
						value={loaderData.redirectTo}
					/>
					<CardHeader className="space-y-1 text-center">
						<CardTitle className="text-2xl font-bold">
							{t('welcome_back')}
						</CardTitle>
						<CardDescription>{t('sign_in')}</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="identifier">{t('email_or_username_label')}</Label>
							<Input
								ref={identifierRef}
								id="identifier"
								required
								autoFocus={true}
								name="identifier"
								type="text"
								autoComplete="username"
								aria-invalid={actionData?.errors?.identifier ? true : undefined}
								aria-describedby="identifier-error"
								placeholder={t('example_placeholder')}
							/>
							{actionData?.errors?.identifier && (
								<div
									className="mt-1 text-sm text-red-500"
									id="identifier-error"
								>
									{t(actionData.errors.identifier)}
								</div>
							)}
						</div>
						<div className="space-y-2">
							<div className="flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:justify-between">
								<Label htmlFor="password"> {t('password_label')}</Label>
								<Link to="/explore/forgot" className="text-sm underline">
									{t('forgot_password')}
								</Link>
							</div>
							<PasswordInput
								id="password"
								ref={passwordRef}
								name="password"
								autoComplete="current-password"
								aria-invalid={actionData?.errors?.password ? true : undefined}
								aria-describedby="password-error"
								placeholder="********"
							/>
							{actionData?.errors?.password && (
								<div className="mt-1 text-sm text-red-500" id="password-error">
									{t(actionData.errors.password)}
								</div>
							)}
						</div>
						<div className="flex items-center space-x-2">
							<Checkbox id="remember" name="remember" />
							<Label htmlFor="remember" className="text-sm">
								{t('remember_label')}
							</Label>
						</div>
					</CardContent>
					<CardFooter className="flex flex-col items-center gap-2">
						<Button type="submit" className="bg-light-blue w-full">
							{t('sign_in_button')}
						</Button>
						<p className="text-muted-foreground text-center text-sm">
							{t('no_account_label')}{' '}
							<Link
								className="font-medium underline"
								to={{
									pathname: '/explore/register',
									search: searchParams.toString(),
								}}
							>
								{t('register_label')}
							</Link>
						</p>
					</CardFooter>
				</Form>
			</Card>
		</div>
	)
}

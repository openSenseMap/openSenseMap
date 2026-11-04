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
import { type Route } from './+types/explore.forgot'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { getUserId } from '~/services/session-service.server'
import { requestPasswordReset } from '~/services/user-service.server'
import { validateEmail } from '~/utils'

export async function loader({ request }: Route.LoaderArgs) {
	const userId = await getUserId(request)
	if (userId) return redirect('/explore')
	return {}
}

export async function action({ request }: Route.ActionArgs) {
	const formData = await request.formData()
	const email = formData.get('email')

	if (!validateEmail(email)) {
		return data(
			{ errors: { email: 'Email is invalid' }, success: false },
			{ status: 400 },
		)
	}

	try {
		await requestPasswordReset(email)

		return data(
			{
				code: 'Ok',
				message: 'password_reset_initiated',
				success: true,
				errors: { email: null },
			},
			{ status: 200 },
		)
	} catch (err) {
		console.warn(err)
		return data(
			{
				errors: { email: 'generic_error_try_again' },
				success: false,
			},
			{ status: 500 },
		)
	}
}

export default function ForgotPasswordPage() {
	const [searchParams] = useSearchParams()
	const actionData = useActionData<typeof action>()
	const emailRef = React.useRef<HTMLInputElement>(null)

	const { t } = useTranslation('forgot-password')
	const navigation = useNavigation()

	React.useEffect(() => {
		if (actionData?.errors?.email) {
			emailRef.current?.focus()
		}
	}, [actionData])

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
				{actionData?.success ? (
					<div className="w-full max-w-md rounded-md bg-white p-6 text-center shadow-lg">
						<h2 className="mb-4 text-2xl font-bold">{t('request_sent')}</h2>
						<p className="mb-6">{t('request_sent_description')}</p>
						<Link to="/explore/login">
							<Button className="bg-light-blue w-full">
								{t('back_to_login')}
							</Button>
						</Link>
					</div>
				) : (
					<>
						<Form method="post" className="space-y-6" noValidate>
							<CardHeader className="space-y-1 text-center">
								<CardTitle className="text-2xl font-bold">
									{t('forgot_your_password')}
								</CardTitle>
								<CardDescription>{t('reset_password')}</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="space-y-2">
									<Label htmlFor="email">{t('email_label')}</Label>
									<Input
										ref={emailRef}
										id="email"
										required
										autoFocus={true}
										name="email"
										type="email"
										autoComplete="email"
										aria-invalid={actionData?.errors?.email ? true : undefined}
										aria-describedby="email-error"
										placeholder={t('example_placeholder')}
									/>
									{actionData?.errors?.email && (
										<div className="mt-1 text-sm text-red-500" id="email-error">
											{t(actionData.errors.email)}
										</div>
									)}
								</div>
							</CardContent>
							<CardFooter className="flex flex-col items-center gap-2">
								<Button type="submit" className="bg-light-blue w-full">
									{t('reset_password_button')}
								</Button>
								<p className="text-muted-foreground text-center text-sm">
									{t('remember_password')}{' '}
									<Link
										className="font-medium underline"
										to={{
											pathname: '/explore/login',
											search: searchParams.toString(),
										}}
									>
										{t('login_label')}
									</Link>
								</p>
							</CardFooter>
						</Form>
					</>
				)}
			</Card>
		</div>
	)
}

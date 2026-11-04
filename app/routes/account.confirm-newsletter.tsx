import { useTranslation } from 'react-i18next'
import { Link, data, useLoaderData } from 'react-router'
import { type Route } from './+types/account.confirm-newsletter'
import { Button } from '~/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '~/components/ui/card'
import { confirmNewsletterSubscription } from '~/services/newsletter-service.server'
import { getUserId } from '~/services/session-service.server'

type NewsletterConfirmationStatus = 'success' | 'expired' | 'invalid'

export async function loader({ request }: Route.LoaderArgs) {
	const url = new URL(request.url)
	const token = url.searchParams.get('token')?.trim()
	const userId = await getUserId(request)

	if (!token) {
		return data({
			status: 'invalid' as NewsletterConfirmationStatus,
			isLoggedIn: Boolean(userId),
		})
	}

	const result = await confirmNewsletterSubscription(token)

	return data({
		status:
			result === 'forbidden'
				? ('invalid' as NewsletterConfirmationStatus)
				: result,
		isLoggedIn: Boolean(userId),
	})
}

export default function ConfirmNewsletterRoute() {
	const { status, isLoggedIn } = useLoaderData<typeof loader>()
	const { t } = useTranslation('settings')

	const content = {
		success: {
			title: t('newsletter_confirmed'),
			description: t('newsletter_confirmed_description'),
		},
		expired: {
			title: t('newsletter_confirmation_link_expired'),
			description: t('newsletter_confirmation_link_expired_description'),
		},
		invalid: {
			title: t('newsletter_confirmation_link_invalid'),
			description: t('newsletter_confirmation_link_invalid_description'),
		},
	}[status]

	return (
		<div className="flex min-h-screen items-center justify-center p-4">
			<Card className="w-full max-w-md text-center">
				<CardHeader className="space-y-2">
					<CardTitle className="text-2xl font-bold">{content.title}</CardTitle>
					<CardDescription>{content.description}</CardDescription>
				</CardHeader>
				<CardContent />
				<CardFooter className="flex flex-col gap-2">
					<Link
						to={isLoggedIn ? '/settings/preferences' : '/explore'}
						className="w-full"
					>
						<Button className="w-full">
							{isLoggedIn ? t('back_to_preferences') : t('go_to_explore')}
						</Button>
					</Link>
					{!isLoggedIn && (
						<Link to="/explore/login" className="w-full">
							<Button variant="outline" className="w-full">
								{t('go_to_login')}
							</Button>
						</Link>
					)}
				</CardFooter>
			</Card>
		</div>
	)
}

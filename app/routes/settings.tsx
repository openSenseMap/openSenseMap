import { useTranslation } from 'react-i18next'
import { Link, Outlet, useLocation } from 'react-router'
import { NavBar } from '~/components/nav-bar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'

export default function SettingsLayoutPage() {
	const location = useLocation()
	// get current tab from the URL
	const currentTab = location.pathname.split('/')[2] || 'account'

	const { t } = useTranslation('settings')

	return (
		<div className="bg-background text-foreground min-h-screen">
			<NavBar />
			<div className="bg-background flex w-full items-start justify-center py-4 sm:py-8 lg:py-10">
				<div className="w-full max-w-3xl rounded-lg bg-transparent p-4 sm:p-6">
					<Tabs className="w-full" defaultValue="account" value={currentTab}>
						<div className="w-full overflow-x-auto pb-1">
							<TabsList className="h-auto w-full min-w-max justify-evenly">
								<TabsTrigger value="profile" className="shrink-0" asChild>
									<Link to="/settings/profile">{t('public_profile')}</Link>
								</TabsTrigger>

								<TabsTrigger value="account" className="shrink-0" asChild>
									<Link to="/settings/account">{t('account')}</Link>
								</TabsTrigger>

								<TabsTrigger value="preferences" className="shrink-0" asChild>
									<Link to="/settings/preferences">{t('preferences')}</Link>
								</TabsTrigger>

								<TabsTrigger
									value="delete"
									className="data-[state=active]:text-destructive shrink-0"
									asChild
								>
									<Link to="/settings/delete">{t('delete_account')}</Link>
								</TabsTrigger>
							</TabsList>
						</div>
						<TabsContent className="mt-6" value={currentTab}>
							<Outlet />
						</TabsContent>
					</Tabs>
				</div>
			</div>
		</div>
	)
}

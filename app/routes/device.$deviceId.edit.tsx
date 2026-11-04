//* Toast impl.
import * as ToastPrimitive from '@radix-ui/react-toast'
import { clsx } from 'clsx'
import {
	ArrowRightLeft,
	Lock,
	MapPin,
	FileText,
	Sheet,
	Cpu,
	ArrowLeft,
	NotepadText,
} from 'lucide-react'
import { useState } from 'react'
import { redirect, Link, Outlet, useParams, useLoaderData } from 'react-router'
import { type Route } from './+types/device.$deviceId.edit'
import { EditDeviceSidebarNav } from '~/components/mydevices/edit-device/edit-device-sidebar-nav'
import { NavBar } from '~/components/nav-bar'
import { Separator } from '~/components/ui/separator'
import { getIntegrations } from '~/db/models/integration.server'
import { getLucideIcon } from '~/lib/lucide-icon-map'
import { getUserId } from '~/services/session-service.server'
import { useTranslation } from 'react-i18next'

//*****************************************************
export async function loader({ request }: Route.LoaderArgs) {
	//* if user is not logged in, redirect to home
	const userId = await getUserId(request)
	if (!userId) return redirect('/')

	return {
		integrations: await getIntegrations(),
	}
}

//*****************************************************
export async function action() {
	return redirect('/')
}

//**********************************
export default function EditBox() {
	const [toastOpen, setToastOpen] = useState(false)
	const { t } = useTranslation('device-overview')

	const { integrations } = useLoaderData<typeof loader>()

	const { deviceId } = useParams()

	const staticNavItems = [
		{
			title: t('sidebar.general'),
			href: `/device/${deviceId}/edit/general`,
			icon: Sheet,
		},
		{
			title: t('sidebar.sensors'),
			href: `/device/${deviceId}/edit/sensors`,
			icon: Cpu,
		},
		{
			title: t('sidebar.location'),
			href: `/device/${deviceId}/edit/location`,
			icon: MapPin,
		},
		{
			title: t('sidebar.logs'),
			href: `/device/${deviceId}/edit/logs`,
			icon: NotepadText,
		},
		{
			title: t('sidebar.security'),
			href: `/device/${deviceId}/edit/security`,
			icon: Lock,
		},
		{
			title: t('sidebar.script'),
			href: `/device/${deviceId}/edit/script`,
			icon: FileText,
		},
	]

	const integrationItems = integrations.map((intg) => {
		const Icon = getLucideIcon(intg.icon)

		return {
			title: intg.name,
			href: `/device/${deviceId}/edit/${intg.slug}`,
			icon: Icon,
		}
	})

	const sidebarNavItems = [
		...staticNavItems,
		...integrationItems,
		{
			title: t('sidebar.transfer'),
			href: `/device/${deviceId}/edit/transfer`,
			icon: ArrowRightLeft,
		},
	]

	return (
		<div className="font-helvetica space-y-6 px-4 pb-16 sm:px-6 lg:px-10">
			<NavBar />

			{/*Toast notification */}
			<div className={toastOpen ? 'mb-2' : ''}>
				<ToastPrimitive.Provider>
					<ToastPrimitive.Root
						open={toastOpen}
						duration={3000}
						onOpenChange={setToastOpen}
						className={clsx(
							'inset-x-4 bottom-4 z-50 w-auto rounded-lg border border-[#bce8f1] shadow-lg md:top-4 md:right-4 md:bottom-auto md:left-auto md:w-full',
							'bg-[#d9edf7] dark:bg-gray-800',
							'radix-state-open:animate-toast-slide-in-bottom md:radix-state-open:animate-toast-slide-in-right',
							'radix-state-closed:animate-toast-hide',
							'radix-swipe-direction-right:radix-swipe-end:animate-toast-swipe-out-x',
							'radix-swipe-direction-right:translate-x-radix-toast-swipe-move-x',
							'radix-swipe-direction-down:radix-swipe-end:animate-toast-swipe-out-y',
							'radix-swipe-direction-down:translate-y-radix-toast-swipe-move-y',
							'radix-swipe-cancel:translate-x-0 radix-swipe-cancel:duration-200 radix-swipe-cancel:ease-&lsqb;ease&rsqb;',
							'focus-visible:ring-opacity-75 focus:outline-hidden focus-visible:ring-3 focus-visible:ring-purple-500',
						)}
					>
						<div className="flex">
							<div className="flex w-0 flex-1 items-center p-4">
								<div className="radix w-full">
									<ToastPrimitive.Title className="flex justify-between text-base font-medium text-[#31708f] dark:text-gray-100">
										{/* Account successfully deleted. */}
										<div>
											{t('device_updated')} -
											<Link to={`/explore/${deviceId}`}>
												{' '}
												<span className="text-[#4eaf47] hover:underline">
													{t('view')}
												</span>{' '}
											</Link>
										</div>

										<ToastPrimitive.Close aria-label="Close">
											<span aria-hidden>×</span>
										</ToastPrimitive.Close>
									</ToastPrimitive.Title>
								</div>
							</div>
						</div>
					</ToastPrimitive.Root>
					<ToastPrimitive.Viewport />
				</ToastPrimitive.Provider>
			</div>

			<div className="flex flex-col items-start gap-2 rounded sm:flex-row sm:items-center sm:justify-between sm:gap-4">
				<div className="min-w-0">
					<ArrowLeft className="mr-2 inline h-5 w-5" />
					<Link to="/profile/me">{t('back_to_dashboard')}</Link>
				</div>
				{deviceId && (
					<Link
						to={`/explore/${deviceId}`}
						className="text-primary inline-flex shrink-0 items-center gap-2 text-sm hover:underline"
					>
						<MapPin className="h-4 w-4" />
						{t('show_on_map')}
					</Link>
				)}
			</div>

			<div className="space-y-0.5">
				<h2 className="text-2xl font-bold tracking-tight">
					{t('device_settings')}
				</h2>
				<p className="text-muted-foreground">{t('manage_device_data')}</p>
			</div>

			<Separator />

			<div className="flex flex-col gap-8 lg:flex-row lg:gap-12">
				<aside className="w-full shrink-0 lg:w-1/5">
					<EditDeviceSidebarNav items={sidebarNavItems} />
				</aside>

				<main className="min-w-0 flex-1">
					<Outlet context={[setToastOpen]} />
				</main>
			</div>
		</div>
	)
}

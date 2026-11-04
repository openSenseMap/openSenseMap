import { useTranslation } from 'react-i18next'
import { redirect, useLoaderData } from 'react-router'
import { type Route } from './+types/profile.$username'
import { getColumns, type SenseBox } from '~/components/mydevices/dt/columns'
import {
	CustomTableFeatures,
	DataTable,
} from '~/components/mydevices/dt/data-table'
import { NavBar } from '~/components/nav-bar'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { getPublicDeviceSchemasForUser } from '~/db/models/device-schema.server'
import {
	getProfileByUserId,
	getProfileByUsername,
	getProfileSensorsAndMeasurementsCount,
} from '~/db/models/profile.server'
import { formatCount } from '~/lib/numbers'
import { getInitials } from '~/lib/strings'
import { getUserId } from '~/services/session-service.server'
import { claimDevice } from '~/services/transfer-service.server'
import { userNameFromURl } from '~/services/user-service.server'
import { useHydrated } from '~/hooks/use-hydrated'
import { ColumnDef, RowData } from '@tanstack/react-table'

type ActionData = {
	success: boolean
	message?: string
	error?: string
	claimedBoxId?: string
}

export async function loader({ params, request }: Route.LoaderArgs) {
	const requestingUserId = await getUserId(request)

	const username = userNameFromURl(params.username as string)
	if (!username) {
		return {
			profile: null,
			requestingUserId,
			sensorsCount: '0',
			measurementsCount: '0',
			deviceSchemas: [],
		}
	}

	const profile = await getProfileByUsername(username)

	if (!profile) return redirect('/explore')

	// Block access only if private AND not the owner
	if (!profile.public && requestingUserId !== profile.userId) {
		return redirect('/explore')
	}

	const counts = await getProfileSensorsAndMeasurementsCount(profile)
	const deviceSchemas = await getPublicDeviceSchemasForUser(profile.userId)

	return {
		profile,
		requestingUserId,
		sensorsCount: counts.sensorsCount,
		measurementsCount: counts.measurementsCount,
		deviceSchemas,
	}
}

export async function action({ request, params }: Route.ActionArgs) {
	const userId = await getUserId(request)
	if (!userId) return redirect('/')

	const username = params.username
	if (!username) {
		return {
			success: false,
			error: 'Missing username.',
		} satisfies ActionData
	}

	const profile = await getProfileByUserId(userId)
	if (!profile || profile.userId !== userId) {
		return {
			success: false,
			error: 'You can only claim a device from your own profile page.',
		} satisfies ActionData
	}

	const formData = await request.formData()
	const intent = formData.get('intent')?.toString()
	const token = formData.get('token')?.toString().trim()

	if (intent !== 'claim-device') {
		return {
			success: false,
			error: 'Unknown action.',
		} satisfies ActionData
	}

	if (!token) {
		return {
			success: false,
			error: 'Please enter a transfer token.',
		} satisfies ActionData
	}

	try {
		const result = await claimDevice(userId, token)

		return {
			success: true,
			message: result.message,
			claimedBoxId: result.boxId,
		} satisfies ActionData
	} catch (err) {
		const message =
			err instanceof Error ? err.message : 'Failed to claim device.'

		return {
			success: false,
			error: message,
		} satisfies ActionData
	}
}

export default function ProfilePage() {
	const {
		profile,
		sensorsCount,
		measurementsCount,
		requestingUserId,
		deviceSchemas,
	} = useLoaderData<typeof loader>()

	const { t, i18n } = useTranslation('profile')
	const columnsTranslation = useTranslation('data-table')
	const hydrated = useHydrated()

	const isOwner = !!profile?.userId && requestingUserId === profile.userId

	return (
		<div className="bg-background text-foreground min-h-screen">
			<NavBar />
			<div className="flex w-full flex-col gap-6 p-4 sm:p-6 lg:flex-row lg:gap-8 lg:p-8 lg:pt-4">
				<div className="border-border bg-card text-card-foreground flex w-full min-w-0 flex-col gap-6 rounded-xl border p-4 shadow-sm sm:p-6 lg:w-1/3">
					<div className="flex items-center gap-4">
						<Avatar className="h-16 w-16 shrink-0">
							{profile?.profileImage?.id ? (
								<AvatarImage
									className="aspect-auto h-full w-full rounded-full object-cover"
									src={`/resources/file/${profile.profileImage.id}`}
								/>
							) : null}
							<AvatarFallback>
								{getInitials(profile?.displayName ?? '')}
							</AvatarFallback>
						</Avatar>
						<div className="min-w-0">
							<h3 className="text-title text-2xl font-semibold wrap-break-word">
								{profile?.displayName || ''}
							</h3>
							<h4 className="text-foreground text-lg wrap-break-word">
								{profile?.user?.name || ''}
							</h4>
							<p className="text-muted-foreground text-sm">
								{t('user_since')}{' '}
								{hydrated &&
									new Date(profile?.user?.createdAt || '').toLocaleDateString(
										i18n.language,
									)}
							</p>
						</div>
					</div>

					<div className="grid grid-cols-2 gap-4 md:pt-6">
						<div className="border-border bg-muted/60 flex flex-col items-center rounded-lg border p-4">
							<span className="text-primary text-2xl font-bold">
								{formatCount(profile?.user?.devices.length || 0)}
							</span>
							<span className="text-sm text-gray-500 dark:text-gray-400">
								{t('devices')}
							</span>
						</div>
						<div className="border-border bg-muted/60 flex flex-col items-center rounded-lg border p-4">
							<span className="text-primary text-2xl font-bold">
								{sensorsCount}
							</span>
							<span className="text-sm text-gray-500 dark:text-gray-400">
								{t('sensors')}
							</span>
						</div>
						<div className="border-border bg-muted/60 flex flex-col items-center rounded-lg border p-4">
							<span className="text-primary text-2xl font-bold">
								{measurementsCount}
							</span>
							<span className="text-sm text-gray-500 dark:text-gray-400">
								{t('measurements')}
							</span>
						</div>
					</div>
				</div>

				<div className="flex w-full max-w-full min-w-0 flex-col gap-6 lg:w-2/3">
					<div className="border-border bg-card text-card-foreground max-w-full min-w-0 overflow-hidden rounded-xl border p-4 shadow-sm sm:p-6">
						<div className="text-primary mb-4 text-2xl font-semibold sm:text-3xl">
							{t('devices')}
						</div>

						{profile?.user?.devices && (
							<DataTable
								columns={
									getColumns(columnsTranslation, hydrated, {
										isOwner,
									}) as ColumnDef<CustomTableFeatures, RowData, unknown>[]
								}
								data={profile.user.devices}
								getRowClassName={(device) =>
									device.archivedAt
										? 'opacity-60 bg-slate-100 dark:bg-slate-900/40'
										: ''
								}
							/>
						)}
					</div>

					{deviceSchemas.length > 0 && (
						<div className="border-border bg-card text-card-foreground min-w-0 rounded-xl border p-4 shadow-sm sm:p-6">
							<div className="text-primary mb-4 text-2xl font-semibold sm:text-3xl">
								{t('device_schemas')}
							</div>
							<div className="space-y-3">
								{deviceSchemas.map((schema) => (
									<div
										key={schema.versionId}
										className="border-border bg-muted/40 flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-center md:justify-between"
									>
										<div className="space-y-1">
											<div className="flex flex-wrap items-center gap-2">
												<h3 className="font-medium">{schema.name}</h3>
												<Badge variant="secondary">v{schema.version}</Badge>
												<Badge variant="outline">
													{schema.content.sensors.length} {t('sensors')}
												</Badge>
											</div>
											{schema.description && (
												<p className="text-muted-foreground text-sm">
													{schema.description}
												</p>
											)}
										</div>
										<Button asChild variant="outline">
											<a href={`/resources/device-schema/${schema.versionId}`}>
												{t('download')}
											</a>
										</Button>
									</div>
								))}
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	)
}

import { ArrowLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
	Form,
	Link,
	redirect,
	useActionData,
	useNavigation,
} from 'react-router'
import { type Route } from './+types/device.transfer'
import Home from '~/components/header/home'
import { Separator } from '~/components/ui/separator'
import { getUserId } from '~/services/session-service.server'
import { claimDevice } from '~/services/transfer-service.server'

type ActionData = {
	success: boolean
	message?: string
	error?: string
	claimedBoxId?: string
}

export async function action({ request }: Route.ActionArgs) {
	const userId = await getUserId(request)
	if (!userId) return redirect('/')

	const formData = await request.formData()
	const token = formData.get('token')?.toString().trim()

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
		return {
			success: false,
			error: err instanceof Error ? err.message : 'Failed to claim device.',
		} satisfies ActionData
	}
}

export default function DeviceTransfer() {
	const actionData = useActionData<typeof action>()
	const navigation = useNavigation()
	const { t } = useTranslation('profile')
	const isSubmitting = navigation.state === 'submitting'

	return (
		<div>
			<div className="pointer-events-none z-10 flex h-14 w-full p-2">
				<Home />
			</div>

			<div className="font-helvetica mx-auto max-w-5xl space-y-6 p-4 pb-14 sm:p-6 sm:pb-14 lg:p-10 lg:pb-14">
				<div className="rounded text-[#676767]">
					<ArrowLeft className="mr-2 inline h-5 w-5" />
					<Link to="/profile/me">{t('back_to_dashboard')}</Link>
				</div>

				<div className="space-y-0.5">
					<h2 className="text-3xl font-bold tracking-normal">
						{t('transfer_device')}
					</h2>
					<p className="text-muted-foreground">{t('import_device')}</p>
				</div>
				<Separator />

				<div className="dark:bg-dark-boxes rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700">
					<h3 className="dark:text-dark-text mb-2 text-lg font-semibold">
						{t('take_over_device')}
					</h3>
					<p className="mb-4 text-sm text-gray-600 dark:text-gray-300">
						{t('enter_transfer_token')}
					</p>

					<Form method="post" replace className="flex flex-col gap-3">
						<input
							name="token"
							type="text"
							placeholder={t('example_token')}
							className="dark:bg-dark-background dark:text-dark-text w-full rounded-md border border-gray-300 px-3 py-2 text-base dark:border-gray-600"
						/>
						<button
							type="submit"
							disabled={isSubmitting}
							className="bg-light-green dark:bg-dark-green w-full rounded-md px-4 py-2 text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 sm:w-60"
						>
							{isSubmitting ? t('taking_over') : t('take_over_device')}
						</button>
					</Form>

					{actionData?.error && (
						<div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
							{actionData.error}
						</div>
					)}
					{actionData?.success && (
						<div className="mt-3 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
							{actionData.message ?? t('device_successfully_claimed')}
						</div>
					)}
				</div>
			</div>
		</div>
	)
}

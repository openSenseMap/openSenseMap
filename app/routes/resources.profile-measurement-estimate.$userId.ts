import { data, type LoaderFunctionArgs } from 'react-router'
import { getProfileEstimatedMeasurementCount } from '~/db/models/profile.server'
import { drizzleClient } from '~/db.server'
import { shouldRevalidateExceptRootPreferences } from '~/lib/root-preference-revalidation'
import { getUserId } from '~/services/session-service.server'

export { shouldRevalidateExceptRootPreferences as shouldRevalidate }

export async function loader({ params, request }: LoaderFunctionArgs) {
	const userId = params.userId
	if (!userId) throw data(null, { status: 404 })

	const [requestingUserId, profile] = await Promise.all([
		getUserId(request),
		drizzleClient.query.profile.findFirst({
			where: (profile, { eq }) => eq(profile.userId, userId),
			columns: { public: true },
		}),
	])

	if (!profile || (!profile.public && requestingUserId !== userId)) {
		throw data(null, { status: 404 })
	}

	try {
		return {
			userId,
			estimatedMeasurementCount:
				await getProfileEstimatedMeasurementCount(userId),
		}
	} catch (error) {
		console.error('Failed to estimate profile measurements', error)
		return { userId, estimatedMeasurementCount: null }
	}
}

import { redirect } from 'react-router'
import invariant from 'tiny-invariant'
import { type Route } from './+types/resources.profile-image.$profileId'
import { drizzleClient } from '~/db.server'
import { getProfileImageUrl } from '~/lib/s3.server'
import { getUser } from '~/services/session-service.server'

export async function loader({ params, request }: Route.LoaderArgs) {
	invariant(params.profileId, 'Profile ID is required')

	const profile = await drizzleClient.query.profile.findFirst({
		where: (profile, { eq }) => eq(profile.id, params.profileId),
		columns: { image: true, public: true, userId: true },
	})

	if (!profile?.image) {
		throw new Response('Not found', { status: 404 })
	}
	if (!profile.public) {
		const user = await getUser(request)
		if (user?.id !== profile.userId) {
			throw new Response('Not found', { status: 404 })
		}
	}

	return redirect(await getProfileImageUrl(profile.image), {
		headers: {
			'Cache-Control': 'private, max-age=300',
		},
	})
}

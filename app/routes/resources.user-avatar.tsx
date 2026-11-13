import { useEffect } from 'react'
import { useFetcher } from 'react-router'
import { type Route } from './+types/resources.user-avatar'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { getProfileByUserId } from '~/db/models/profile.server'
import { getInitials } from '~/lib/strings'
import { requireUser } from '~/services/session-service.server'

export async function loader({ request }: Route.LoaderArgs) {
	const user = await requireUser(request)
	const profile = await getProfileByUserId(user.id)

	if (!user || !profile) {
		throw new Error()
	}

	return { user, profile }
}

export function UserAvatar() {
	const fetcher = useFetcher<typeof loader>()

	useEffect(() => {
		if (fetcher.state === 'idle' && fetcher.data == null) {
			void fetcher.load('/resources/user-avatar')
		}
	}, [fetcher])

	return (
		<Avatar className="h-8 w-8">
			<AvatarImage
				className="aspect-auto h-full w-full rounded-full object-cover"
				src={
					fetcher.data?.profile.image
						? `/resources/profile-image/${fetcher.data.profile.id}?v=${encodeURIComponent(fetcher.data.profile.image)}`
						: undefined
				}
				alt={fetcher.data?.profile.displayName}
			/>
			<AvatarFallback>
				{getInitials(fetcher.data?.profile?.displayName ?? '')}
			</AvatarFallback>
		</Avatar>
	)
}

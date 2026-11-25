import { type User } from '~/db/schema'

export const transformUserToApiFormat = (user: User) => ({
	...user,
	createdAt:
		user.createdAt instanceof Date
			? user.createdAt.toISOString()
			: user.createdAt,
	updatedAt:
		user.updatedAt instanceof Date
			? user.updatedAt.toISOString()
			: user.updatedAt,
	acceptedTosAt:
		user.acceptedTosAt instanceof Date
			? user.acceptedTosAt.toISOString()
			: user.acceptedTosAt,
})

// Define the structure of the MyBadge object
export interface MyBadge {
	acceptance: string
	badgeclass: string
	badgeclassOpenBadgeId: string
	entityId: string
	entityType: string
	expires: null | string
	image: string
	issuedOn: string
	issuer: string
	issuerOpenBadgeId: string
	name: string
	narrative: null | string
	openBadgeId: string
	pending: boolean
	recipient: {
		identity: string
		hashed: boolean
		type: string
		plaintextIdentity: string
		salt: string
	}
	revocationReason: null | string
	revoked: boolean
}

export async function getMyBadgesAccessToken() {
	// Make a request to get an access token from the MyBadges API
	const authRequest = new Request(process.env.MYBADGES_API_URL + 'o/token', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
		},
		body: new URLSearchParams({
			grant_type: 'password',
			username: `${process.env.MYBADGES_SERVERADMIN_USERNAME}`,
			password: `${process.env.MYBADGES_SERVERADMIN_PASSWORD}`,
			client_id: `${process.env.MYBADGES_CLIENT_ID}`,
			client_secret: `${process.env.MYBADGES_CLIENT_SECRET}`,
			scope: 'rw:serverAdmin',
		}),
	})
	const authResponse = await fetch(authRequest)
	const authData = await authResponse.json()

	return authData
}

export async function getAllBadges(accessToken: string) {
	const allBadgesRequest = new Request(
		process.env.MYBADGES_API_URL +
			'v2/issuers/' +
			process.env.MYBADGES_ISSUERID_OSEM +
			'/badgeclasses',
		{
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${accessToken}`,
			},
		},
	)
	const allBadgesResponse = await fetch(allBadgesRequest)
	const allBadgesData = await allBadgesResponse.json()
	return allBadgesData
}

export async function getUserBackpack(email: string, accessToken: string) {
	// Make a request to the backpack endpoint with the bearer token
	const backpackRequest = new Request(
		process.env.MYBADGES_API_URL + 'v2/backpack/' + email,
		{
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${accessToken}`,
			},
		},
	)
	const backpackResponse = await fetch(backpackRequest)
	if (backpackResponse.status === 500) {
		return null
	}
	const backpackData = await backpackResponse.json()

	// filter the badges by issuer (only OSeM badges)
	const filteredBadgeData = backpackData.result?.filter(
		(badge: MyBadge) => badge.issuer === process.env.MYBADGES_ISSUERID_OSEM,
	)

	return filteredBadgeData
}

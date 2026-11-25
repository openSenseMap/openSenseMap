type RouteInfo = {
	path: string
	method: 'GET' | 'PUT' | 'POST' | 'DELETE'
	tosExempt: boolean
	deprecationNotice?: string
}

export const apiRoutes: { noauth: RouteInfo[]; auth: RouteInfo[] } = {
	noauth: [
		{
			path: '/',
			method: 'GET',
			tosExempt: true,
		},
		{
			path: '/stats',
			method: 'GET',
			tosExempt: true,
		},
		{
			path: '/tags',
			method: 'GET',
			tosExempt: true,
		},
		// {
		//   path: `statistics/idw`,
		//   method: "GET",

		// },
		// {
		//   path: `statistics/descriptive`,
		//   method: "GET",

		// },
		{
			path: `boxes`,
			method: 'GET',
			tosExempt: true,
		},
		{
			path: `boxes/data`,
			method: 'GET',
			tosExempt: true,
		},
		// {
		//   path: `boxes/:boxId`,
		//   method: "GET",
		// },
		{
			path: `boxes/:boxId/sensors`,
			method: 'GET',
			tosExempt: true,
		},
		{
			path: `boxes/:boxId/sensors/:sensorId`,
			method: 'GET',
			tosExempt: true,
		},
		// {
		//   path: `boxes/:boxId/data/:sensorId`,
		//   method: "GET",
		// },
		// {
		//   path: `boxes/:boxId/locations`,
		//   method: "GET",
		// },
		// {
		//   path: `boxes/data`,
		//   method: "POST",
		// },
		{
			path: `boxes/:boxId/data`,
			method: 'POST',
			tosExempt: true,
		},
		{
			path: `boxes/:boxId/:sensorId`,
			method: 'POST',
			tosExempt: true,
		},
		{
			path: `users/register`,
			method: 'POST',
			tosExempt: true,
		},
		{
			path: `users/request-password-reset`,
			method: 'POST',
			tosExempt: true,
		},
		{
			path: `users/password-reset`,
			method: 'POST',
			tosExempt: true,
		},
		{
			path: `users/confirm-email`,
			method: 'POST',
			tosExempt: true,
		},
		{
			path: `users/sign-in`,
			method: 'POST',
			tosExempt: true,
		},
		{
			path: `discourse/sso`,
			method: 'GET',
			tosExempt: true,
		},
	],
	auth: [
		{
			path: `users/refresh-auth`,
			method: 'POST',
			tosExempt: true,
		},
		{
			path: `users/me`,
			method: 'GET',
			tosExempt: true,
		},
		{
			path: `users/me`,
			method: 'PUT',
			tosExempt: false,
		},
		{
			path: `users/me/boxes`,
			method: 'GET',
			tosExempt: true,
		},
		{
			path: `users/me/boxes/:boxId`,
			method: 'GET',
			tosExempt: true,
		},
		// {
		//   path: `boxes/:boxId/script`,
		//   method: "GET",
		// },
		{
			path: `boxes`,
			method: 'POST',
			tosExempt: false,
		},
		{
			path: `boxes/claim`,
			method: 'POST',
			tosExempt: false,
		},
		{
			path: `boxes/transfer`,
			method: 'POST',
			tosExempt: false,
		},
		{
			path: `boxes/transfer`,
			method: 'DELETE',
			tosExempt: false,
		},
		{
			path: `boxes/transfer/:boxId`,
			method: 'GET',
			tosExempt: true,
		},
		{
			path: `boxes/transfer/:boxId`,
			method: 'PUT',
			tosExempt: false,
		},
		{
			path: `boxes/:boxId`,
			method: 'PUT',
			tosExempt: false,
		},
		{
			path: `boxes/:boxId`,
			method: 'DELETE',
			tosExempt: false,
		},
		{
			path: `boxes/:boxId/:sensorId/measurements`,
			method: 'DELETE',
			tosExempt: false,
		},
		{
			path: `users/sign-out`,
			method: 'POST',
			tosExempt: true,
		},
		{
			path: `users/me`,
			method: 'DELETE',
			tosExempt: true,
		},
		{
			path: `users/me/resend-email-confirmation`,
			method: 'POST',
			tosExempt: false,
		},
	],
	// management: [
	//   {
	//     path: `${managementPath}/boxes`,
	//     method: "GET",
	//   },
	//   {
	//     path: `${managementPath}/boxes/:boxId`,
	//     method: "GET",
	//   },
	//   {
	//     path: `${managementPath}/boxes/:boxId`,
	//     method: "PUT",
	//   },
	//   {
	//     path: `${managementPath}/boxes/delete`,
	//     method: "POST",
	//   },
	//   {
	//     path: `${managementPath}/users`,
	//     method: "GET",
	//   },
	//   {
	//     path: `${managementPath}/users/:userId`,
	//     method: "GET",
	//   },
	//   {
	//     path: `${managementPath}/users/:userId`,
	//     method: "PUT",
	//   },
	//   {
	//     path: `${managementPath}/users/delete`,
	//     method: "POST",
	//   },
	//   {
	//     path: `${managementPath}/users/:userId/exec`,
	//     method: "POST",
	//   },
	// ],
}

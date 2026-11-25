import { createCookieSessionStorage } from 'react-router'

type TosFlowSessionData = {
	tokenId: string
	userId: string
}

const sessionSecret = process.env.SESSION_SECRET
if (!sessionSecret) {
	throw new Error('SESSION_SECRET must be set')
}

export const tosFlowSessionStorage =
	createCookieSessionStorage<TosFlowSessionData>({
		cookie: {
			name: '__tos_flow',
			httpOnly: true,
			sameSite: 'lax',
			secure: process.env.NODE_ENV === 'production',
			path: '/',
			maxAge: 60 * 30, // 30 minutes after opening the email link
			secrets: [sessionSecret],
		},
	})

export function getTosFlowSession(request: Request) {
	return tosFlowSessionStorage.getSession(request.headers.get('Cookie'))
}

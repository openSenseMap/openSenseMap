import { createCookie } from 'react-router'
import { type ThemePreference, ThemePreferenceSchema } from '~/lib/theme'
export const themeCookie = createCookie('theme', {
	path: '/',
	sameSite: 'lax',
	httpOnly: true,
	secure: process.env.NODE_ENV === 'production',
	maxAge: 60 * 60 * 24 * 365,
})

export async function getThemePreference(
	request: Request,
): Promise<ThemePreference> {
	const value = await themeCookie.parse(request.headers.get('Cookie'))
	const res = ThemePreferenceSchema.safeParse(value)
	return res.success ? res.data : 'system'
}

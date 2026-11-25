import { z } from 'zod'

export const ThemePreferenceSchema = z.enum(['light', 'dark', 'system'])

export type ThemePreference = z.infer<typeof ThemePreferenceSchema>
export type ResolvedTheme = 'light' | 'dark'

export function getServerTheme(preference: ThemePreference): ResolvedTheme {
	return preference === 'dark' ? 'dark' : 'light'
}

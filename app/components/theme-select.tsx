import { useEffect } from 'react'
import { useFetcher } from 'react-router'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '~/components/ui/select'
import { ThemePreferenceSchema, type ThemePreference } from '~/lib/theme'
import { useRootRouteLoaderData } from '~/root'

function parseThemePreference(value: unknown): ThemePreference | null {
	const result = ThemePreferenceSchema.safeParse(value)
	return result.success ? result.data : null
}

function resolveThemePreference(preference: ThemePreference): 'light' | 'dark' {
	if (preference === 'dark') return 'dark'
	if (preference === 'light') return 'light'

	return window.matchMedia('(prefers-color-scheme: dark)').matches
		? 'dark'
		: 'light'
}

function applyThemePreference(preference: ThemePreference) {
	const resolvedTheme = resolveThemePreference(preference)
	const root = document.documentElement

	root.classList.remove('light', 'dark')
	root.classList.add(resolvedTheme)
	root.style.colorScheme = resolvedTheme
}

export function ThemeSelect() {
	const { themePreference: serverThemePreference } = useRootRouteLoaderData()
	const fetcher = useFetcher<{ ok: boolean }>()

	const optimisticThemePreference = parseThemePreference(
		fetcher.formData?.get('set-theme'),
	)

	const currentThemePreference =
		optimisticThemePreference ?? serverThemePreference

	useEffect(() => {
		applyThemePreference(currentThemePreference)

		if (currentThemePreference !== 'system') return

		const media = window.matchMedia('(prefers-color-scheme: dark)')
		const listener = () => applyThemePreference('system')

		media.addEventListener('change', listener)

		return () => {
			media.removeEventListener('change', listener)
		}
	}, [currentThemePreference])

	return (
		<Select
			value={currentThemePreference}
			disabled={fetcher.state !== 'idle'}
			onValueChange={(nextThemePreference) => {
				const parsedThemePreference = parseThemePreference(nextThemePreference)

				if (!parsedThemePreference) return

				applyThemePreference(parsedThemePreference)

				void fetcher.submit(
					{ 'set-theme': parsedThemePreference },
					{ method: 'post', action: '/' },
				)
			}}
		>
			<SelectTrigger className="border-input bg-background text-foreground w-36">
				<SelectValue />
			</SelectTrigger>
			<SelectContent>
				<SelectItem value="system">System</SelectItem>
				<SelectItem value="light">Light</SelectItem>
				<SelectItem value="dark">Dark</SelectItem>
			</SelectContent>
		</Select>
	)
}

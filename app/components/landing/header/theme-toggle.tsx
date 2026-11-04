import { Moon, Sun } from 'lucide-react'
import { useFetcher } from 'react-router'
import { Button } from '~/components/ui/button'
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from '~/components/ui/tooltip'
import type { ThemePreference } from '~/lib/theme'
import { useRootRouteLoaderData } from '~/root'

function applyThemePreference(preference: ThemePreference) {
	const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches

	const resolvedTheme =
		preference === 'dark' || (preference === 'system' && prefersDark)
			? 'dark'
			: 'light'

	const root = document.documentElement

	root.classList.remove('light', 'dark')
	root.classList.add(resolvedTheme)
	root.style.colorScheme = resolvedTheme
}

function getCurrentResolvedTheme(): 'light' | 'dark' {
	return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

export default function ThemeToggle() {
	const { themePreference } = useRootRouteLoaderData()
	const fetcher = useFetcher()

	const toggleTheme = () => {
		const currentTheme = getCurrentResolvedTheme()

		const nextThemePreference: ThemePreference =
			currentTheme === 'dark' ? 'light' : 'dark'

		applyThemePreference(nextThemePreference)

		void fetcher.submit(
			{ 'set-theme': nextThemePreference },
			{ method: 'post', action: '/' },
		)
	}

	const tooltipText =
		themePreference === 'system'
			? 'System theme'
			: `${themePreference[0].toUpperCase()}${themePreference.slice(1)} theme`

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button
					variant="topbar"
					size="topbarPill"
					onClick={toggleTheme}
					disabled={fetcher.state !== 'idle'}
					aria-label={`Toggle theme. Current preference: ${themePreference}`}
				>
					<Sun className="block dark:hidden" />
					<Moon className="hidden dark:block" />
				</Button>
			</TooltipTrigger>

			<TooltipContent side="bottom">{tooltipText}</TooltipContent>
		</Tooltip>
	)
}

import { Languages } from 'lucide-react'
import { useFetcher } from 'react-router'
import { Button } from '~/components/ui/button'
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from '~/components/ui/tooltip'
import { useRootRouteLoaderData } from '~/root'

export default function LanguageSelector() {
	const { locale } = useRootRouteLoaderData()
	const fetcher = useFetcher()

	const toggleLanguage = () => {
		const newLocale = locale === 'en' ? 'de' : 'en'

		void fetcher.submit(
			{ 'set-language': newLocale },
			{ method: 'post', action: '/' },
		)
	}

	const languageLabel = locale === 'de' ? 'Deutsch' : 'English'
	const nextLanguageLabel = locale === 'de' ? 'English' : 'Deutsch'

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button
					variant="topbar"
					size="topbarPill"
					onClick={toggleLanguage}
					disabled={fetcher.state !== 'idle'}
					aria-label={`Current language: ${languageLabel}. Switch to ${nextLanguageLabel}.`}
				>
					<Languages />
				</Button>
			</TooltipTrigger>

			<TooltipContent side="bottom">{languageLabel}</TooltipContent>
		</Tooltip>
	)
}

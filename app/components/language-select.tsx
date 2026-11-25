import { useFetcher } from 'react-router'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '~/components/ui/select'
import { useRootRouteLoaderData } from '~/root'

const supportedLocales = ['en', 'de'] as const

type SupportedLocale = (typeof supportedLocales)[number]

function isSupportedLocale(value: unknown): value is SupportedLocale {
	return (
		typeof value === 'string' &&
		(supportedLocales as readonly string[]).includes(value)
	)
}

export function LanguageSelect() {
	const { locale } = useRootRouteLoaderData()
	const fetcher = useFetcher<{ ok: boolean }>()

	const optimisticLocale = fetcher.formData?.get('set-language')
	const currentLocale = isSupportedLocale(optimisticLocale)
		? optimisticLocale
		: locale

	return (
		<Select
			value={currentLocale}
			disabled={fetcher.state !== 'idle'}
			onValueChange={(nextLocale) => {
				if (!isSupportedLocale(nextLocale)) return

				void fetcher.submit(
					{ 'set-language': nextLocale },
					{ method: 'post', action: '/' },
				)
			}}
		>
			<SelectTrigger className="border-input bg-background text-foreground w-36">
				<SelectValue />
			</SelectTrigger>
			<SelectContent>
				<SelectItem value="en">English</SelectItem>
				<SelectItem value="de">Deutsch</SelectItem>
			</SelectContent>
		</Select>
	)
}

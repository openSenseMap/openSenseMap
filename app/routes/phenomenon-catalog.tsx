import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { type Route } from './+types/phenomenon-catalog'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { NavBar } from '~/components/nav-bar'
import { sensorWikiAliasCatalog } from '~/lib/sensor-wiki/alias-catalog'
import { normalizeSensorWikiAliasValue } from '~/lib/sensor-wiki/aliases'

const CONTRIBUTION_GUIDE_URL =
	'https://github.com/openSenseMap/openSenseMap/blob/dev/app/lib/sensor-wiki/PHENOMENON_CATALOG.md'

export const meta: Route.MetaFunction = () => [
	{ title: 'Phenomenon catalog | openSenseMap' },
	{
		name: 'description',
		content:
			'Browse the phenomena, units, and aliases supported by openSenseMap.',
	},
]

export function loader() {
	return sensorWikiAliasCatalog
}

export default function PhenomenonCatalogRoute({
	loaderData: catalog,
}: Route.ComponentProps) {
	const { t } = useTranslation('phenomenon-catalog')
	const { t: translatePhenomenon } = useTranslation('phenomena')
	const [query, setQuery] = useState('')

	const entries = useMemo(() => {
		const normalizedQuery = normalizeSensorWikiAliasValue(query)

		return catalog.entries
			.filter((entry) => {
				if (!normalizedQuery) return true

				const localizedTitle = translatePhenomenon(entry.sensorWikiPhenomenon, {
					defaultValue: entry.title,
				})
				const searchableValues = [
					entry.sensorWikiPhenomenon,
					entry.sensorWikiUnit,
					entry.title,
					localizedTitle,
					entry.unit,
					...entry.titleAliases,
					...(entry.unitAliases ?? []),
					...(entry.sensorTypeAliases ?? []),
				]

				return searchableValues.some((value) =>
					normalizeSensorWikiAliasValue(value).includes(normalizedQuery),
				)
			})
			.sort((left, right) =>
				translatePhenomenon(left.sensorWikiPhenomenon, {
					defaultValue: left.title,
				}).localeCompare(
					translatePhenomenon(right.sensorWikiPhenomenon, {
						defaultValue: right.title,
					}),
				),
			)
	}, [catalog.entries, query, translatePhenomenon])

	return (
		<>
			<NavBar />
			<main className="mx-auto w-full max-w-5xl space-y-8 px-4 py-8 sm:px-6">
				<header className="space-y-3">
					<h1 className="text-3xl font-semibold">{t('title')}</h1>
					<p className="text-muted-foreground max-w-3xl">{t('intro')}</p>
					<p className="text-muted-foreground text-sm">
						{t('catalog_summary', {
							version: catalog.version,
							count: catalog.entries.length,
						})}
					</p>
					<div className="flex flex-wrap gap-3">
						<Button asChild>
							<a href={CONTRIBUTION_GUIDE_URL}>{t('contribute')}</a>
						</Button>
						<Button asChild variant="outline">
							<a href="/resources/phenomenon-catalog">{t('view_json')}</a>
						</Button>
					</div>
				</header>

				<div>
						<label htmlFor="phenomenon-catalog-search" className="sr-only">
						{t('search_label')}
					</label>
					<Input
							id="phenomenon-catalog-search"
						type="search"
						value={query}
						onChange={(event) => setQuery(event.target.value)}
						placeholder={t('search_placeholder')}
					/>
				</div>

				{entries.length === 0 ? (
					<p className="text-muted-foreground rounded-md border p-6 text-center">
						{t('no_results')}
					</p>
				) : (
					<div className="grid gap-4 md:grid-cols-2">
						{entries.map((entry) => (
							<article
								key={`${entry.sensorWikiPhenomenon}:${entry.sensorWikiUnit ?? ''}`}
								className="space-y-4 rounded-md border p-5"
							>
								<div>
									<h2 className="text-lg font-semibold">
										{translatePhenomenon(entry.sensorWikiPhenomenon, {
											defaultValue: entry.title,
										})}
									</h2>
									<p className="text-muted-foreground text-sm">
										<code>{entry.sensorWikiPhenomenon}</code>
										{entry.sensorWikiUnit ? (
											<>
												{' · '}
												<code>{entry.sensorWikiUnit}</code>
											</>
										) : null}
									</p>
								</div>

								<AliasList
									label={t('title_aliases')}
									values={entry.titleAliases}
								/>
								<AliasList
									label={t('unit_aliases')}
									values={entry.unitAliases ?? []}
								/>
								<AliasList
									label={t('sensor_type_aliases')}
									values={entry.sensorTypeAliases ?? []}
								/>
							</article>
						))}
					</div>
				)}
			</main>
		</>
	)
}

function AliasList({ label, values }: { label: string; values: string[] }) {
	if (values.length === 0) return null

	return (
		<div className="space-y-2">
			<h3 className="text-sm font-medium">{label}</h3>
			<div className="flex flex-wrap gap-2">
				{values.map((value) => (
					<Badge key={value} variant="secondary">
						{value}
					</Badge>
				))}
			</div>
		</div>
	)
}

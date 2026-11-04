import MultiSelectComboboxFilter from '~/components/ui/combobox-filter'
import {
	parsePhenomenonFilterValue,
	type PhenomenonFilterOption,
} from '~/lib/phenomenon-filter'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

interface FilterPhenomenaProps {
	phenomena: string[]
	availablePhenomena: PhenomenonFilterOption[]
	onPhenomenaChange: (phenomena: string[]) => void
}

export default function FilterPhenomena({
	phenomena,
	availablePhenomena,
	onPhenomenaChange,
}: FilterPhenomenaProps) {
	const { t } = useTranslation('filter')
	const { t: translatePhenomenon } = useTranslation('phenomena')
	const localizedPhenomena = useMemo(
		() =>
			availablePhenomena
				.map((option) => {
					const parsed = parsePhenomenonFilterValue(option.value)
					if (parsed.source !== 'sensor-wiki') return option

					return {
						...option,
						label: translatePhenomenon(parsed.phenomenon, {
							defaultValue: option.label,
						}),
					}
				})
				.sort((left, right) => left.label.localeCompare(right.label)),
		[availablePhenomena, translatePhenomenon],
	)
	return (
		<div className="space-y-2">
			<MultiSelectComboboxFilter
				label={t('phenomenon')}
				values={phenomena}
				options={localizedPhenomena}
				placeholder={t('select_phenomena')}
				searchPlaceholder={t('search_phenomena')}
				emptyText={t('phenomena_not_found')}
				onChange={onPhenomenaChange}
			/>
			<Link
				to="/sensor-wiki-aliases"
				target="_blank"
				rel="noreferrer"
				className="text-muted-foreground block text-xs underline underline-offset-2"
			>
				{t('view_supported_mappings')}
			</Link>
		</div>
	)
}

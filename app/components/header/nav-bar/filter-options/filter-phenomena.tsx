import MultiSelectComboboxFilter from '~/components/ui/combobox-filter'
import { type PhenomenonFilterOption } from '~/lib/phenomenon-filter'
import { useTranslation } from 'react-i18next'

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
	return (
		<MultiSelectComboboxFilter
			label={t('phenomenon')}
			values={phenomena}
			options={availablePhenomena}
			placeholder={t('select_phenomena')}
			searchPlaceholder={t('search_phenomena')}
			emptyText={t('phenomena_not_found')}
			onChange={onPhenomenaChange}
		/>
	)
}

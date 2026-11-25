import Search from '~/components/search'
import FilterPanel from './filter-panel'
import { type DeviceFeatureCollection } from '~/components/search/search-types'

interface NavBarHandlerProps {
	devices: DeviceFeatureCollection
	searchString: string
}

export default function NavbarHandler({
	devices,
	searchString,
}: NavBarHandlerProps) {
	const isSearching = searchString.trim().length >= 2

	if (isSearching) {
		return <Search devices={devices} searchString={searchString} />
	}

	return <FilterPanel />
}

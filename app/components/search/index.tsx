import { useEffect, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import SearchList from './search-list'
import { searchNominatimLocations } from './nominatim'
import {
	type DeviceFeatureCollection,
	type DeviceSearchResult,
	type LocationSearchResult,
} from './search-types'

interface SearchProps {
	searchString: string
	devices: DeviceFeatureCollection
}

const MIN_QUERY_LENGTH = 2
const QUERY_DEBOUNCE_MS = 500

function getDeviceResults(
	searchString: string,
	devices: DeviceFeatureCollection,
): DeviceSearchResult[] {
	const normalizedSearch = searchString.toLowerCase().trim()

	if (!normalizedSearch) return []

	return devices.features
		.filter((device) => {
			const name = device.properties.name.toLowerCase()
			const id = device.properties.id.toLowerCase()

			return name.includes(normalizedSearch) || id.includes(normalizedSearch)
		})
		.slice(0, 4)
		.map((device) => ({
			type: 'device',
			id: device.properties.id,
			displayName: device.properties.name,
			deviceId: device.properties.id,
			lng: device.properties.longitude,
			lat: device.properties.latitude,
		}))
}

export default function Search(props: SearchProps) {
	const { t, i18n } = useTranslation('search')

	const userLocaleString = i18n.language || 'en'

	const [searchResultsLocation, setSearchResultsLocation] = useState<
		LocationSearchResult[]
	>([])
	const [searchResultsDevice, setSearchResultsDevice] = useState<
		DeviceSearchResult[]
	>([])

	useEffect(() => {
		const query = props.searchString.trim()

		if (query.length < MIN_QUERY_LENGTH) {
			setSearchResultsLocation([])
			setSearchResultsDevice([])
			return
		}

		setSearchResultsDevice(getDeviceResults(query, props.devices))

		const controller = new AbortController()

		const timeoutId = window.setTimeout(() => {
			void searchNominatimLocations({
				query,
				locale: userLocaleString,
				signal: controller.signal,
			})
				.then(setSearchResultsLocation)
				.catch((error) => {
					if ((error as Error).name !== 'AbortError') {
						console.error('Location search error', error)
						setSearchResultsLocation([])
					}
				})
		}, QUERY_DEBOUNCE_MS)

		return () => {
			window.clearTimeout(timeoutId)
			controller.abort()
		}
	}, [props.searchString, props.devices, userLocaleString])

	if (searchResultsLocation.length === 0 && searchResultsDevice.length === 0) {
		return null
	}

	return (
		<div className="mt-2">
			<SearchList
				searchResultsLocation={searchResultsLocation}
				searchResultsDevice={searchResultsDevice}
			/>
			<div className="flex">
				<div className="text-center text-sm text-gray-500">
					<p>
						<Trans
							t={t}
							i18nKey="hint_select_result"
							components={[<kbd key="select_result"></kbd>]}
						/>
					</p>
				</div>
			</div>
		</div>
	)
}

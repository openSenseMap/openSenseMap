import { Cpu, Globe, MapPin } from 'lucide-react'
import { useCallback, useContext, useEffect, useMemo } from 'react'
import { useMap } from 'react-map-gl/maplibre'
import { useMatches, useNavigate, useSearchParams } from 'react-router'
import { useGlobalCompareMode } from '../device-detail/useGlobalCompareMode'
import { NavbarContext } from '../header/nav-bar'
import useKeyboardNav from '../header/nav-bar/use-keyboard-nav'
import SearchListItem from './search-list-item'
import { goTo } from '~/lib/search-map-helper'
import {
	type DeviceSearchResult,
	type LocationSearchResult,
	type SearchResult,
} from './search-types'

interface SearchListProps {
	searchResultsLocation: LocationSearchResult[]
	searchResultsDevice: DeviceSearchResult[]
}

export default function SearchList(props: SearchListProps) {
	const { osem } = useMap()
	const navigate = useNavigate()
	const matches = useMatches()
	const [searchParams] = useSearchParams()
	const { setOpen } = useContext(NavbarContext)
	const [compareMode] = useGlobalCompareMode()

	const searchResultsAll = useMemo<SearchResult[]>(
		() => [...props.searchResultsDevice, ...props.searchResultsLocation],
		[props.searchResultsDevice, props.searchResultsLocation],
	)

	const length = searchResultsAll.length

	const { cursor, setCursor, enterPress, controlPress } = useKeyboardNav(
		0,
		0,
		length,
	)

	const selected = searchResultsAll[cursor]

	const closeSearch = useCallback(() => {
		setOpen(false)
	}, [setOpen])

	const handleNavigate = useCallback(
		(result: SearchResult) => {
			const params = searchParams.toString()
			const suffix = params ? `?${params}` : ''

			if (result.type === 'device') {
				const baseDeviceId = matches[2]?.params?.deviceId

				if (compareMode && baseDeviceId) {
					return `/explore/${baseDeviceId}/compare/${result.deviceId}`
				}

				return `/explore/${result.deviceId}${suffix}`
			}

			return `/explore${suffix}`
		},
		[searchParams, compareMode, matches],
	)

	const selectResult = useCallback(
		(result: SearchResult) => {
			goTo(osem, result)
			closeSearch()
			void navigate(handleNavigate(result))
		},
		[osem, closeSearch, navigate, handleNavigate],
	)

	const handleDigitPress = useCallback(
		(event: KeyboardEvent) => {
			const digit = Number(event.key)

			if (
				!controlPress ||
				!Number.isInteger(digit) ||
				digit < 1 ||
				digit > length
			) {
				return
			}

			event.preventDefault()

			const result = searchResultsAll[digit - 1]

			setCursor(digit - 1)
			goTo(osem, result)

			window.setTimeout(() => {
				closeSearch()
				void navigate(handleNavigate(result))
			}, 500)
		},
		[
			controlPress,
			length,
			searchResultsAll,
			setCursor,
			osem,
			closeSearch,
			navigate,
			handleNavigate,
		],
	)

	useEffect(() => {
		if (length !== 0 && enterPress && selected) {
			selectResult(selected)
		}
	}, [enterPress, length, selected, selectResult])

	useEffect(() => {
		window.addEventListener('keydown', handleDigitPress)

		return () => {
			window.removeEventListener('keydown', handleDigitPress)
		}
	}, [handleDigitPress])

	return (
		<div className="max-h-[min(52dvh,22rem)] w-full overflow-y-auto overscroll-contain rounded-[1.25rem] bg-white pb-2 text-black dark:bg-zinc-800 dark:text-zinc-200 dark:opacity-90">
			{props.searchResultsDevice.length > 0 && (
				<hr className="solid mx-2 mb-2 border-t-2" />
			)}

			{props.searchResultsDevice.map((device, index) => (
				<SearchListItem
					key={device.id}
					index={index}
					active={index === cursor}
					name={device.displayName}
					icon={Cpu}
					controlPress={controlPress}
					onMouseEnter={() => setCursor(index)}
					onClick={() => selectResult(device)}
				/>
			))}

			{props.searchResultsLocation.length > 0 && (
				<hr className="solid m-2 border-t-2" />
			)}

			{props.searchResultsLocation.map((location, index) => {
				const globalIndex = index + props.searchResultsDevice.length
				const Icon = location.locationKind === 'country' ? Globe : MapPin

				return (
					<SearchListItem
						key={location.id}
						index={globalIndex}
						active={globalIndex === cursor}
						name={location.displayName}
						icon={Icon}
						controlPress={controlPress}
						onMouseEnter={() => setCursor(globalIndex)}
						onClick={() => selectResult(location)}
					/>
				)
			})}
		</div>
	)
}

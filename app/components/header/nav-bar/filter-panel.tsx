import { X } from 'lucide-react'
import { useContext, useEffect, useMemo, useState } from 'react'
import {
	useLocation,
	useNavigation,
	useRouteLoaderData,
	useSearchParams,
} from 'react-router'
import { NavbarContext } from '.'
import Spinner from '~/components/spinner'
import { Button } from '~/components/ui/button'
import { type loader as exploreLoader } from '~/routes/explore'
import FilterOptions from './filter-options/filter-options'
import FilterTags from './filter-options/filter-tags'
import FilterPhenomena from './filter-options/filter-phenomena'
import FilterTime from './filter-options/filter-time'
import { useTranslation } from 'react-i18next'
import { DeviceExposureType, DeviceStatusType } from '~/lib/device-enums'
import { getExplorePendingUi } from '~/lib/explore-pending-navigation'

export type TimeFilterState =
	| {
			mode: 'live'
	  }
	| {
			mode: 'pointintime'
			date?: string
	  }
	| {
			mode: 'timeperiod'
			from?: string
			to?: string
	  }

export interface FilterState {
	exposure: DeviceExposureType[]
	status: DeviceStatusType[]
	tags: string[]
	phenomena: string[]
	time: TimeFilterState
}

const emptyFilters: FilterState = {
	exposure: [],
	status: [],
	tags: [],
	phenomena: [],
	time: {
		mode: 'live',
	},
}

function getTimeFilterFromSearchParams(
	searchParams: URLSearchParams,
): TimeFilterState {
	const timeMode = searchParams.get('timeMode')

	if (timeMode === 'pointintime') {
		return {
			mode: 'pointintime',
			date: searchParams.get('date') ?? undefined,
		}
	}

	if (timeMode === 'timeperiod') {
		return {
			mode: 'timeperiod',
			from: searchParams.get('from') ?? undefined,
			to: searchParams.get('to') ?? undefined,
		}
	}

	return {
		mode: 'live',
	}
}

function serializeTimeFilter(
	nextParams: URLSearchParams,
	time: TimeFilterState,
) {
	nextParams.delete('timeMode')
	nextParams.delete('date')
	nextParams.delete('from')
	nextParams.delete('to')

	if (time.mode === 'live') {
		return
	}

	nextParams.set('timeMode', time.mode)

	if (time.mode === 'pointintime' && time.date) {
		nextParams.set('date', time.date)
	}

	if (time.mode === 'timeperiod') {
		if (time.from) {
			nextParams.set('from', time.from)
		}

		if (time.to) {
			nextParams.set('to', time.to)
		}
	}
}

function areTimeFiltersEqual(a: TimeFilterState, b: TimeFilterState) {
	return JSON.stringify(a) === JSON.stringify(b)
}

function parseCsvParam<T extends string>(
	searchParams: URLSearchParams,
	key: string,
): T[] {
	return searchParams
		.getAll(key)
		.flatMap((value) => value.split(','))
		.map((value) => value.trim())
		.filter(Boolean)
		.filter((value) => value !== 'all') as T[]
}

function getFiltersFromSearchParams(
	searchParams: URLSearchParams,
): FilterState {
	return {
		exposure: parseCsvParam<DeviceExposureType>(searchParams, 'exposure'),
		status: parseCsvParam<DeviceStatusType>(searchParams, 'status'),
		tags: parseCsvParam<string>(searchParams, 'tags'),
		phenomena: parseCsvParam<string>(searchParams, 'phenomenon'),
		time: getTimeFilterFromSearchParams(searchParams),
	}
}

function serializeFilters(
	searchParams: URLSearchParams,
	filters: FilterState,
): URLSearchParams {
	const nextParams = new URLSearchParams(searchParams)

	nextParams.delete('exposure')
	nextParams.delete('status')
	nextParams.delete('tags')
	nextParams.delete('phenomenon')

	if (filters.exposure.length > 0) {
		nextParams.set('exposure', filters.exposure.join(','))
	}

	if (filters.status.length > 0) {
		nextParams.set('status', filters.status.join(','))
	}

	if (filters.tags.length > 0) {
		nextParams.set('tags', filters.tags.join(','))
	}

	if (filters.phenomena.length > 0) {
		nextParams.set('phenomenon', filters.phenomena.join(','))
	}

	serializeTimeFilter(nextParams, filters.time)

	return nextParams
}

function areArraysEqual(a: string[], b: string[]) {
	if (a.length !== b.length) return false

	return a.every((value, index) => value === b[index])
}

function areFiltersEqual(a: FilterState, b: FilterState) {
	return (
		areArraysEqual(a.exposure, b.exposure) &&
		areArraysEqual(a.status, b.status) &&
		areArraysEqual(a.tags, b.tags) &&
		areArraysEqual(a.phenomena, b.phenomena) &&
		areTimeFiltersEqual(a.time, b.time)
	)
}

export default function FilterPanel() {
	const { setOpen } = useContext(NavbarContext)
	const [searchParams, setSearchParams] = useSearchParams()
	const navigation = useNavigation()
	const location = useLocation()
	const { filters: areFiltersPending } = getExplorePendingUi({
		navigationState: navigation.state,
		currentLocation: location,
		nextLocation: navigation.location,
	})
	const { t } = useTranslation('filter')

	const data = useRouteLoaderData<typeof exploreLoader>('routes/explore')

	const availableTags = data?.availableTags ?? []
	const availablePhenomena = data?.phenomena ?? []

	const currentFilters = useMemo(
		() => getFiltersFromSearchParams(searchParams),
		[searchParams],
	)

	const [draftFilters, setDraftFilters] = useState<FilterState>(currentFilters)

	useEffect(() => {
		setDraftFilters(currentFilters)
	}, [currentFilters])

	const isChanged = !areFiltersEqual(draftFilters, currentFilters)

	const updateDraftFilters = <Key extends keyof FilterState>(
		key: Key,
		value: FilterState[Key],
	) => {
		setDraftFilters((current) => ({
			...current,
			[key]: value,
		}))
	}

	const handleApplyChanges = () => {
		const nextParams = serializeFilters(searchParams, draftFilters)

		setSearchParams(nextParams)
		setOpen(false)
	}

	const handleResetFilters = () => {
		setDraftFilters(emptyFilters)

		const nextParams = serializeFilters(searchParams, emptyFilters)

		setSearchParams(nextParams)
	}

	return (
		<div className="relative py-2 dark:text-zinc-200">
			{areFiltersPending && (
				<div
					className="absolute inset-0 z-50 flex items-center justify-center bg-white/30 backdrop-blur-xs dark:bg-zinc-800/30"
					role="status"
					aria-live="polite"
				>
					<Spinner />
					<span className="sr-only">{t('applying_filters')}</span>
				</div>
			)}

			<div className="flex max-h-[min(56vh,24rem)] flex-col gap-3 overflow-y-auto px-1 pb-2">
				<FilterOptions
					exposure={draftFilters.exposure}
					status={draftFilters.status}
					onExposureChange={(exposure) => {
						updateDraftFilters('exposure', exposure)
					}}
					onStatusChange={(status) => {
						updateDraftFilters('status', status)
					}}
				/>

				<FilterTags
					tags={draftFilters.tags}
					availableTags={availableTags}
					onTagsChange={(tags) => {
						updateDraftFilters('tags', tags)
					}}
				/>

				<FilterPhenomena
					phenomena={draftFilters.phenomena}
					availablePhenomena={availablePhenomena}
					onPhenomenaChange={(phenomena) => {
						updateDraftFilters('phenomena', phenomena)
					}}
				/>
				<FilterTime
					time={draftFilters.time}
					onTimeChange={(time) => {
						updateDraftFilters('time', time)
					}}
				/>
			</div>

			<div className="mt-3 flex justify-end gap-2 border-t border-black/5 pt-3 dark:border-white/10">
				<Button
					variant="outline"
					className="h-8 rounded-md px-2 text-sm"
					onClick={handleResetFilters}
				>
					<X className="mr-1 h-3.5 w-3.5" />
					{t('reset')}
				</Button>

				<Button
					className="h-8 rounded-md px-3 text-sm"
					onClick={handleApplyChanges}
					disabled={!isChanged}
				>
					{t('apply')}
				</Button>
			</div>
		</div>
	)
}

type NavigationState = 'idle' | 'loading' | 'submitting'

type LocationDescriptor = {
	pathname: string
	search: string
}

type ExploreRoute =
	| { kind: 'index'; sensorIds: [] }
	| { kind: 'dialog'; sensorIds: [] }
	| { kind: 'device'; deviceId: string; sensorIds: string[] }

export type ExplorePendingUi = {
	deviceDetail: boolean
	dismissDeviceDetail: boolean
	filters: boolean
	graph: boolean
}

type ExplorePendingUiOptions = {
	navigationState: NavigationState
	currentLocation: LocationDescriptor
	nextLocation?: LocationDescriptor
}

const IDLE_PENDING_UI: ExplorePendingUi = {
	deviceDetail: false,
	dismissDeviceDetail: false,
	filters: false,
	graph: false,
}

const EXPLORE_DIALOG_SEGMENTS = new Set(['forgot', 'login', 'register'])
const FILTER_SEARCH_KEYS = [
	'exposure',
	'status',
	'tags',
	'phenomenon',
	'timeMode',
	'date',
	'from',
	'to',
] as const
const GRAPH_SEARCH_KEYS = ['aggregation', 'date_from', 'date_to'] as const

function decodePathSegment(segment: string) {
	try {
		return decodeURIComponent(segment)
	} catch {
		return segment
	}
}

function parseExploreRoute(pathname: string): ExploreRoute | null {
	const segments = pathname.split('/').filter(Boolean)

	if (segments[0] !== 'explore') return null
	if (segments.length === 1) return { kind: 'index', sensorIds: [] }
	if (EXPLORE_DIALOG_SEGMENTS.has(segments[1])) {
		return { kind: 'dialog', sensorIds: [] }
	}

	return {
		kind: 'device',
		deviceId: decodePathSegment(segments[1]),
		sensorIds: segments.slice(2).map(decodePathSegment),
	}
}

function searchValues(search: string, key: string) {
	return new URLSearchParams(search).getAll(key).sort()
}

function hasScopedSearchChange(
	currentSearch: string,
	nextSearch: string,
	keys: readonly string[],
) {
	return keys.some((key) => {
		const currentValues = searchValues(currentSearch, key)
		const nextValues = searchValues(nextSearch, key)

		return (
			currentValues.length !== nextValues.length ||
			currentValues.some((value, index) => value !== nextValues[index])
		)
	})
}

function haveDifferentSensors(current: ExploreRoute, next: ExploreRoute) {
	if (current.kind !== 'device' || next.kind !== 'device') return false
	if (current.sensorIds.length !== next.sensorIds.length) return true

	return current.sensorIds.some(
		(sensorId, index) => sensorId !== next.sensorIds[index],
	)
}

/**
 * Classifies a pending Explore navigation by the region whose data will change.
 * This prevents unrelated navigations from blanketing every visible panel with
 * a spinner merely because React Router has entered its global loading state.
 */
export function getExplorePendingUi({
	navigationState,
	currentLocation,
	nextLocation,
}: ExplorePendingUiOptions): ExplorePendingUi {
	if (navigationState !== 'loading' || !nextLocation) return IDLE_PENDING_UI

	const currentRoute = parseExploreRoute(currentLocation.pathname)
	const nextRoute = parseExploreRoute(nextLocation.pathname)

	if (!currentRoute || !nextRoute) return IDLE_PENDING_UI

	const currentDeviceId =
		currentRoute.kind === 'device' ? currentRoute.deviceId : undefined
	const nextDeviceId =
		nextRoute.kind === 'device' ? nextRoute.deviceId : undefined
	const isSameDevice =
		currentDeviceId !== undefined && currentDeviceId === nextDeviceId

	const deviceDetail =
		nextDeviceId !== undefined && nextDeviceId !== currentDeviceId
	const dismissDeviceDetail =
		currentDeviceId !== undefined && nextRoute.kind === 'index'
	const filters = hasScopedSearchChange(
		currentLocation.search,
		nextLocation.search,
		FILTER_SEARCH_KEYS,
	)
	const graph = Boolean(
		isSameDevice &&
		currentRoute.kind === 'device' &&
		nextRoute.kind === 'device' &&
		currentRoute.sensorIds.length > 0 &&
		nextRoute.sensorIds.length > 0 &&
		(haveDifferentSensors(currentRoute, nextRoute) ||
			hasScopedSearchChange(
				currentLocation.search,
				nextLocation.search,
				GRAPH_SEARCH_KEYS,
			)),
	)

	return {
		deviceDetail,
		dismissDeviceDetail,
		filters,
		graph,
	}
}

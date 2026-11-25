import { type ShouldRevalidateFunctionArgs } from 'react-router'
import { isRootPreferenceSubmission } from './root-preference-revalidation'

const CHART_SEARCH_PARAMS = ['aggregation', 'date_from', 'date_to']

function searchWithoutChartParams(url: URL) {
	const params = new URLSearchParams(url.search)
	for (const key of CHART_SEARCH_PARAMS) params.delete(key)
	return params.toString()
}

export function shouldRevalidate({
	currentUrl,
	nextUrl,
	formMethod,
	formAction,
	formData,
	defaultShouldRevalidate,
}: ShouldRevalidateFunctionArgs) {
	// Chart controls only affect the sensor route, not the map data.
	// Still revalidate map filters if a preference fetcher finishes during navigation.
	if (currentUrl.search !== nextUrl.search) {
		return (
			(formMethod !== undefined && formMethod.toUpperCase() !== 'GET') ||
			searchWithoutChartParams(currentUrl) !== searchWithoutChartParams(nextUrl)
		)
	}

	if (
		isRootPreferenceSubmission({
			currentUrl,
			formMethod,
			formAction,
			formData,
		})
	)
		return false

	// Opening, closing, or switching an Explore child overlay should reuse the
	// already loaded map data when its filters have not changed.
	const isPathnameOnlyChildTransition =
		formMethod === undefined && currentUrl.pathname !== nextUrl.pathname

	return isPathnameOnlyChildTransition ? false : defaultShouldRevalidate
}

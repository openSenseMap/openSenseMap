import { type ShouldRevalidateFunctionArgs } from 'react-router'
import { clearExploreLoaderCache } from './explore-loader-cache'
import { searchWithoutChartParams } from './explore-map-search'
import { isRootPreferenceSubmission } from './root-preference-revalidation'

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
			searchWithoutChartParams(currentUrl.search) !==
				searchWithoutChartParams(nextUrl.search)
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

	if (isPathnameOnlyChildTransition) return false

	// Refreshing the unfiltered map should fetch a fresh response.
	if (
		defaultShouldRevalidate &&
		currentUrl.href === nextUrl.href &&
		!searchWithoutChartParams(nextUrl.search)
	)
		clearExploreLoaderCache()

	return defaultShouldRevalidate
}

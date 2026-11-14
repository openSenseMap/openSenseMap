import { type ShouldRevalidateFunctionArgs } from 'react-router'
import { isRootPreferenceSubmission } from './root-preference-revalidation'

export function shouldRevalidate({
	currentUrl,
	nextUrl,
	formMethod,
	formAction,
	formData,
	defaultShouldRevalidate,
}: ShouldRevalidateFunctionArgs) {
	// Always revalidate when query params change
	// Check this first because a preference fetcher may finish during a pending filter navigation.
	if (currentUrl.search !== nextUrl.search) return true

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

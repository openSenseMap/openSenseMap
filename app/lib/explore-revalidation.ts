import { type ShouldRevalidateFunctionArgs } from 'react-router'

export function shouldRevalidate({
	currentUrl,
	nextUrl,
	formMethod,
	formAction,
	formData,
	defaultShouldRevalidate,
}: ShouldRevalidateFunctionArgs) {
	const formActionUrl = formAction ? new URL(formAction, currentUrl) : null
	const isRootPreferenceSubmission =
		formMethod === 'POST' &&
		formActionUrl?.origin === currentUrl.origin &&
		formActionUrl.pathname === '/' &&
		(formData?.has('set-language') === true ||
			formData?.has('set-theme') === true)

	if (isRootPreferenceSubmission) return false

	const isPathnameOnlyChildTransition =
		formMethod === undefined &&
		currentUrl.pathname !== nextUrl.pathname &&
		currentUrl.search === nextUrl.search

	return isPathnameOnlyChildTransition ? false : defaultShouldRevalidate
}

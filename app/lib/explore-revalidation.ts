import { type ShouldRevalidateFunctionArgs } from 'react-router'

export function shouldRevalidate({
	currentUrl,
	nextUrl,
	formMethod,
	defaultShouldRevalidate,
}: ShouldRevalidateFunctionArgs) {
	const isPathnameOnlyChildTransition =
		formMethod === undefined &&
		currentUrl.pathname !== nextUrl.pathname &&
		currentUrl.search === nextUrl.search

	return isPathnameOnlyChildTransition ? false : defaultShouldRevalidate
}

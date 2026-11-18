import { type ShouldRevalidateFunctionArgs } from 'react-router'

export function isRootPreferenceSubmission({
	currentUrl,
	formMethod,
	formAction,
	formData,
}: Pick<
	ShouldRevalidateFunctionArgs,
	'currentUrl' | 'formMethod' | 'formAction' | 'formData'
>) {
	const formActionUrl = formAction ? new URL(formAction, currentUrl) : null
	return (
		formMethod === 'POST' &&
		formActionUrl?.origin === currentUrl.origin &&
		formActionUrl.pathname === '/' &&
		(formData?.has('set-language') === true ||
			formData?.has('set-theme') === true)
	)
}

export function shouldRevalidateExceptRootPreferences(
	args: ShouldRevalidateFunctionArgs,
) {
	if (
		args.currentUrl.pathname === args.nextUrl.pathname &&
		args.currentUrl.search === args.nextUrl.search &&
		isRootPreferenceSubmission(args)
	) {
		return false
	}

	return args.defaultShouldRevalidate
}

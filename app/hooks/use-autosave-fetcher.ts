import { useCallback, useEffect, useRef, useState } from 'react'
import { useFetcher } from 'react-router'

export type AutosaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error'
export type AutosaveNavigationState = 'idle' | 'pending' | 'blocked'
export const AUTOSAVE_DELAY_MS = 700

export function shouldBlockAutosaveNavigation({
	hasChanges,
	isSaving,
}: {
	hasChanges: boolean
	isSaving: boolean
}) {
	return hasChanges || isSaving
}

export function getAutosaveNavigationState({
	hasChanges,
	isSaving,
	canAutosave,
	hasError,
}: {
	hasChanges: boolean
	isSaving: boolean
	canAutosave: boolean
	hasError: boolean
}): AutosaveNavigationState {
	if (!shouldBlockAutosaveNavigation({ hasChanges, isSaving })) return 'idle'
	if (isSaving) return 'pending'
	if (hasError || !canAutosave) return 'blocked'

	return 'pending'
}

export function combineAutosaveNavigationStates(
	...states: AutosaveNavigationState[]
): AutosaveNavigationState {
	if (states.includes('blocked')) return 'blocked'
	if (states.includes('pending')) return 'pending'

	return 'idle'
}

function getAutosaveStatus({
	isSaving,
	hasError,
	hasChanges,
	saveCount,
}: {
	isSaving: boolean
	hasError: boolean
	hasChanges: boolean
	saveCount: number
}): AutosaveStatus {
	if (isSaving) return 'saving'
	if (hasError) return 'error'
	if (hasChanges) return 'dirty'
	if (saveCount > 0) return 'saved'

	return 'idle'
}

type UseAutosaveFetcherOptions<TValues, TData> = {
	values: TValues
	lastSavedValues: TValues
	debounceMs?: number
	enabled?: boolean
	validate?: (values: TValues) => boolean
	getPayload: (values: TValues) => Record<string, string>
	isSuccess: (data: TData) => boolean
	getSavedValues?: (data: TData, submittedValues: TValues) => TValues
	onSuccess?: (data: TData) => void
	onError?: (data: TData) => void
}

export function useAutosaveFetcher<TValues, TData>({
	values,
	lastSavedValues,
	debounceMs = AUTOSAVE_DELAY_MS,
	enabled = true,
	validate,
	getPayload,
	isSuccess,
	getSavedValues,
	onSuccess,
	onError,
}: UseAutosaveFetcherOptions<TValues, TData>) {
	const fetcher = useFetcher()

	const lastSavedRef = useRef(lastSavedValues)
	const processedDataRef = useRef<TData | null>(null)

	const [saveCount, setSaveCount] = useState(0)
	const [lastSubmittedValues, setLastSubmittedValues] =
		useState<TValues | null>(null)
	const [failedValues, setFailedValues] = useState<TValues | null>(null)

	const valuesJson = JSON.stringify(values)
	const lastSavedJson = JSON.stringify(lastSavedRef.current)
	const lastSubmittedJson = JSON.stringify(lastSubmittedValues)
	const failedValuesJson = JSON.stringify(failedValues)
	const hasChanges = valuesJson !== lastSavedJson

	const isSaving = fetcher.state === 'submitting' || fetcher.state === 'loading'
	const currentValuesHaveFailed =
		failedValues !== null && valuesJson === failedValuesJson
	const currentValuesWereSubmitted =
		lastSubmittedValues !== null && valuesJson === lastSubmittedJson
	const canAutosave =
		(enabled && (!validate || validate(values))) || currentValuesWereSubmitted

	const status: AutosaveStatus = getAutosaveStatus({
		isSaving,
		hasError: currentValuesHaveFailed,
		hasChanges,
		saveCount,
	})
	const navigationState = getAutosaveNavigationState({
		hasChanges,
		isSaving,
		canAutosave,
		hasError: currentValuesHaveFailed,
	})
	const shouldBlockNavigation = navigationState !== 'idle'

	const submit = useCallback(
		(nextValues: TValues) => {
			setLastSubmittedValues(() => nextValues)
			setFailedValues(null)

			fetcher.submit(getPayload(nextValues), {
				method: 'post',
			})
		},
		[fetcher, getPayload, setFailedValues, setLastSubmittedValues],
	)

	useEffect(() => {
		if (!enabled) return
		if (!hasChanges) return
		if (isSaving) return
		if (currentValuesHaveFailed) return
		if (validate && !validate(values)) return

		const timeout = window.setTimeout(() => {
			submit(values)
		}, debounceMs)

		return () => window.clearTimeout(timeout)
	}, [
		enabled,
		hasChanges,
		isSaving,
		currentValuesHaveFailed,
		valuesJson,
		values,
		debounceMs,
		validate,
		submit,
	])

	useEffect(() => {
		if (fetcher.state !== 'idle') return
		if (fetcher.data == null) return
		if (processedDataRef.current === fetcher.data) return

		processedDataRef.current = fetcher.data

		const data = fetcher.data
		const submittedValues = lastSubmittedValues

		if (!submittedValues) return

		if (isSuccess(data)) {
			lastSavedRef.current = getSavedValues
				? getSavedValues(data, submittedValues)
				: submittedValues

			setFailedValues(null)
			setSaveCount((count) => count + 1)
			onSuccess?.(data)
		} else {
			setFailedValues(() => submittedValues)
			onError?.(data)
		}
	}, [
		fetcher.state,
		fetcher.data,
		lastSubmittedValues,
		getSavedValues,
		isSuccess,
		onSuccess,
		onError,
	])

	const resetLastSaved = useCallback(
		(
			nextValues: TValues,
			options?: {
				markSaved?: boolean
			},
		) => {
			lastSavedRef.current = nextValues
			setFailedValues(null)

			if (options?.markSaved) {
				setSaveCount((count) => count + 1)
			}
		},
		[],
	)

	return {
		fetcher,
		submit,
		status,
		isSaving,
		hasChanges,
		navigationState,
		shouldBlockNavigation,
		resetLastSaved,
		lastSavedRef,
	}
}

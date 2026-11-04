import { useCallback, useEffect, useRef, useState } from 'react'
import { useFetcher } from 'react-router'

export type AutosaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error'
export const AUTOSAVE_DELAY_MS = 700

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
	const lastSubmittedRef = useRef<TValues | null>(null)
	const processedDataRef = useRef<TData | null>(null)

	const [saveCount, setSaveCount] = useState(0)
	const [hasError, setHasError] = useState(false)

	const valuesJson = JSON.stringify(values)
	const lastSavedJson = JSON.stringify(lastSavedRef.current)

	const hasChanges = valuesJson !== lastSavedJson

	const isSaving = fetcher.state === 'submitting' || fetcher.state === 'loading'

	const status: AutosaveStatus = getAutosaveStatus({
		isSaving,
		hasError,
		hasChanges,
		saveCount,
	})
	const shouldBlockNavigation = hasChanges || isSaving || status === 'error'

	const submit = useCallback(
		(nextValues: TValues) => {
			lastSubmittedRef.current = nextValues
			setHasError(false)

			fetcher.submit(getPayload(nextValues), {
				method: 'post',
			})
		},
		[fetcher, getPayload],
	)

	useEffect(() => {
		if (!enabled) return
		if (!hasChanges) return
		if (isSaving) return
		if (validate && !validate(values)) return

		const timeout = window.setTimeout(() => {
			submit(values)
		}, debounceMs)

		return () => window.clearTimeout(timeout)
	}, [
		enabled,
		hasChanges,
		isSaving,
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
		const submittedValues = lastSubmittedRef.current

		if (!submittedValues) return

		if (isSuccess(data)) {
			lastSavedRef.current = getSavedValues
				? getSavedValues(data, submittedValues)
				: submittedValues

			setHasError(false)
			setSaveCount((count) => count + 1)
			onSuccess?.(data)
		} else {
			setHasError(true)
			onError?.(data)
		}
	}, [
		fetcher.state,
		fetcher.data,
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
			setHasError(false)

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
		shouldBlockNavigation,
		resetLastSaved,
		lastSavedRef,
	}
}

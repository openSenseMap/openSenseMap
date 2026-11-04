import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
	type ElevationLookupErrorCode,
	type ElevationResourceResponse,
	type TerrainElevationResult,
} from '~/lib/elevation'
import { isValidLocation } from '~/lib/location'

type ElevationState =
	| { status: 'idle'; result: null; error: null }
	| { status: 'loading'; result: TerrainElevationResult | null; error: null }
	| { status: 'success'; result: TerrainElevationResult; error: null }
	| {
			status: 'error'
			result: null
			error: ElevationLookupErrorCode
	  }

function resultMatchesLocation(
	result: TerrainElevationResult | null | undefined,
	latitude: number,
	longitude: number,
): result is TerrainElevationResult {
	return (
		result !== null &&
		result !== undefined &&
		result.latitude === latitude &&
		result.longitude === longitude
	)
}

export function useTerrainElevation({
	latitude,
	longitude,
	initialResult,
	debounceMs = 500,
}: {
	latitude: number | null | undefined
	longitude: number | null | undefined
	initialResult?: TerrainElevationResult | null
	debounceMs?: number
}) {
	const [retryCount, setRetryCount] = useState(0)
	const requestIdRef = useRef(0)
	const location = useMemo(() => {
		const candidate = { latitude, longitude }

		return isValidLocation(candidate) ? candidate : null
	}, [latitude, longitude])
	const initialState = useMemo<ElevationState>(() => {
		if (
			location &&
			resultMatchesLocation(
				initialResult,
				location.latitude,
				location.longitude,
			)
		) {
			return { status: 'success', result: initialResult, error: null }
		}

		return { status: 'idle', result: null, error: null }
	}, [initialResult, location])
	const [state, setState] = useState<ElevationState>(initialState)

	useEffect(() => {
		if (!location) {
			setState({ status: 'idle', result: null, error: null })
			return
		}

		if (
			resultMatchesLocation(
				initialResult,
				location.latitude,
				location.longitude,
			)
		) {
			setState({ status: 'success', result: initialResult, error: null })
			return
		}

		const requestId = ++requestIdRef.current
		const controller = new AbortController()
		setState({ status: 'loading', result: null, error: null })

		const timeout = window.setTimeout(async () => {
			try {
				const response = await fetch('/resources/elevation', {
					method: 'POST',
					headers: {
						Accept: 'application/json',
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						latitude: location.latitude,
						longitude: location.longitude,
						consent: true,
					}),
					signal: controller.signal,
				})
				const payload = (await response.json()) as ElevationResourceResponse

				if (controller.signal.aborted || requestId !== requestIdRef.current) {
					return
				}

				if (payload.ok) {
					setState({ status: 'success', result: payload.result, error: null })
				} else {
					setState({ status: 'error', result: null, error: payload.error })
				}
			} catch {
				if (controller.signal.aborted || requestId !== requestIdRef.current) {
					return
				}

				setState({
					status: 'error',
					result: null,
					error: 'upstream_error',
				})
			}
		}, debounceMs)

		return () => {
			window.clearTimeout(timeout)
			controller.abort()
		}
	}, [debounceMs, initialResult, location, retryCount])

	const retry = useCallback(() => setRetryCount((count) => count + 1), [])

	return { ...state, retry }
}

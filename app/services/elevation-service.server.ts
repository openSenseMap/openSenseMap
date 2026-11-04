import { z } from 'zod'
import {
	type ElevationLookupErrorCode,
	type TerrainElevationResult,
} from '~/lib/elevation'
import { isValidLocation } from '~/lib/location'

const DEFAULT_API_URL = 'https://api-eu.gpxz.io/v1/elevation/points'
const DEFAULT_TIMEOUT_MS = 5_000
const DEFAULT_CACHE_TTL_MS = 24 * 60 * 60 * 1_000 // 1 day
const MAX_CACHE_ENTRIES = 5_000

const responseSchema = z.object({
	status: z.literal('OK'),
	results: z.array(
		z.object({
			elevation: z.number().finite(),
			data_source: z.string().min(1),
			lat: z.number().finite(),
			lon: z.number().finite(),
		}),
	),
})

type CacheEntry = {
	result: TerrainElevationResult
	expiresAt: number
}

const cache = new Map<string, CacheEntry>()
const inFlight = new Map<string, Promise<TerrainElevationResult>>()

export class ElevationLookupError extends Error {
	constructor(
		public readonly code: ElevationLookupErrorCode,
		message: string,
	) {
		super(message)
		this.name = 'ElevationLookupError'
	}
}

function coordinateCacheKey(latitude: number, longitude: number) {
	return `${latitude.toFixed(5)},${longitude.toFixed(5)}` // meter-level precision
}

function pruneCache(now: number) {
	for (const [key, entry] of cache) {
		if (entry.expiresAt <= now) cache.delete(key)
	}

	while (cache.size >= MAX_CACHE_ENTRIES) {
		const oldestKey = cache.keys().next().value
		if (typeof oldestKey !== 'string') break
		cache.delete(oldestKey)
	}
}

async function requestElevation(
	latitude: number,
	longitude: number,
): Promise<TerrainElevationResult> {
	if (!process.env.GPXZ_API_KEY) {
		throw new ElevationLookupError(
			'upstream_error',
			'GPXZ_API_KEY must be configured.',
		)
	}

	const apiUrl = process.env.GPXZ_API_URL ?? DEFAULT_API_URL
	const apiKey = process.env.GPXZ_API_KEY
	const signal = AbortSignal.timeout(DEFAULT_TIMEOUT_MS)

	try {
		const headers: Record<string, string> = {
			Accept: 'application/json',
			'Content-Type': 'application/json',
			'x-api-key': apiKey,
		}

		const response = await fetch(apiUrl, {
			method: 'POST',
			headers,
			body: JSON.stringify({
				latlons: `${latitude},${longitude}`,
			}),
			signal,
		})

		if (response.status === 429) {
			throw new ElevationLookupError('rate_limited', 'GPXZ rate limit reached.')
		}

		if (!response.ok) {
			throw new ElevationLookupError(
				'upstream_error',
				`GPXZ responded with HTTP ${response.status}.`,
			)
		}

		const parsed = responseSchema.safeParse(await response.json())

		if (!parsed.success) {
			throw new ElevationLookupError(
				'invalid_response',
				'GPXZ returned an invalid response.',
			)
		}

		const firstResult = parsed.data.results[0]

		if (!firstResult) {
			throw new ElevationLookupError(
				'invalid_response',
				'GPXZ returned no elevation result.',
			)
		}

		return {
			elevation: firstResult.elevation,
			dataset: firstResult.data_source,
			latitude,
			longitude,
		}
	} catch (error) {
		if (error instanceof ElevationLookupError) throw error

		if (signal.aborted) {
			throw new ElevationLookupError(
				'timeout',
				'GPXZ API did not respond in time.',
			)
		}

		throw new ElevationLookupError(
			'upstream_error',
			'GPXZ API could not be reached.',
		)
	}
}

export function getTerrainElevation(
	latitude: number,
	longitude: number,
): Promise<TerrainElevationResult> {
	if (!isValidLocation({ latitude, longitude })) {
		return Promise.reject(
			new ElevationLookupError(
				'invalid_location',
				'Latitude or longitude is invalid.',
			),
		)
	}

	const key = coordinateCacheKey(latitude, longitude)
	const now = Date.now()
	const cached = cache.get(key)

	if (cached && cached.expiresAt > now) {
		return Promise.resolve({ ...cached.result, latitude, longitude })
	}

	const pending = inFlight.get(key)
	if (pending) {
		return pending.then((result) => ({ ...result, latitude, longitude }))
	}

	pruneCache(now)

	const request = requestElevation(latitude, longitude)
		.then((result) => {
			cache.set(key, {
				result,
				expiresAt: Date.now() + DEFAULT_CACHE_TTL_MS,
			})

			return result
		})
		.finally(() => inFlight.delete(key))

	inFlight.set(key, request)

	return request.then((result) => ({ ...result, latitude, longitude }))
}

import { searchWithoutChartParams } from './explore-map-search'

// Keep the complete Home map through filter visits. Sensor and time-range
// results change more often and can be much larger, so retain only one briefly.
export const EXPLORE_HOME_CACHE_TTL_MS = 10 * 60_000
export const EXPLORE_FILTERED_CACHE_TTL_MS = 60_000

type CacheEntry = {
	key: string
	expiresAt: number
	data: object
}

let homeEntry: CacheEntry | null = null
let filteredEntry: CacheEntry | null = null
let generation = 0

function cacheKey(url: URL) {
	// Child paths and chart controls do not change the map's loader data.
	return searchWithoutChartParams(url.search)
}

export function clearExploreLoaderCache() {
	homeEntry = null
	filteredEntry = null
	generation++
}

export function clearExploreLoaderCacheForUrl(url: URL) {
	const key = cacheKey(url)
	if (key === '') homeEntry = null
	else if (filteredEntry?.key === key) filteredEntry = null
	generation++
}

function getCachedExploreLoaderData<T extends object>(url: URL): T | undefined {
	const key = cacheKey(url)
	const entry = key === '' ? homeEntry : filteredEntry
	if (!entry || entry.key !== key) return undefined
	if (entry.expiresAt <= Date.now()) {
		if (key === '') homeEntry = null
		else filteredEntry = null
		return undefined
	}
	return entry.data as T
}

function cacheExploreLoaderData(url: URL, data: object) {
	const key = cacheKey(url)
	const entry: CacheEntry = {
		key,
		expiresAt:
			Date.now() +
			(key === '' ? EXPLORE_HOME_CACHE_TTL_MS : EXPLORE_FILTERED_CACHE_TTL_MS),
		data,
	}
	if (key === '') homeEntry = entry
	else filteredEntry = entry
}

export async function loadExploreDataWithCache<T extends object>(
	url: URL,
	load: () => Promise<T>,
): Promise<T> {
	const cached = getCachedExploreLoaderData<T>(url)
	if (cached) return cached

	const loadingGeneration = generation
	const data = await load()
	// A result from before invalidation must stay out of the cache.
	if (generation === loadingGeneration) cacheExploreLoaderData(url, data)
	return data
}

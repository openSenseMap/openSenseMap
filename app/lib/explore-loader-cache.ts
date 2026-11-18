import { searchWithoutChartParams } from './explore-revalidation'

// Keep the complete Home map through filter visits. Sensor and time-range
// results change more often and can be much larger, so retain only one briefly.
export const EXPLORE_HOME_CACHE_TTL_MS = 10 * 60_000
export const EXPLORE_FILTERED_CACHE_TTL_MS = 60_000

type CacheableExploreData = { user: { id: string } | null }
type CacheEntry = {
	key: string
	userId: string | null
	expiresAt: number
	data: CacheableExploreData
}

let currentUserId: string | null | undefined
let homeEntry: CacheEntry | null = null
let filteredEntry: CacheEntry | null = null
let generation = 0

function cacheKey(url: URL) {
	// Child paths and chart controls do not change the map's loader data.
	return searchWithoutChartParams(url)
}

export function setExploreCacheUserId(userId: string | null) {
	if (currentUserId !== undefined && currentUserId !== userId)
		clearExploreLoaderCache()
	currentUserId = userId
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

export function getCachedExploreLoaderData<T extends CacheableExploreData>(
	url: URL,
): T | undefined {
	if (currentUserId === undefined) return undefined
	const key = cacheKey(url)
	const entry = key === '' ? homeEntry : filteredEntry
	if (!entry || entry.key !== key) return undefined
	if (entry.expiresAt <= Date.now()) {
		if (key === '') homeEntry = null
		else filteredEntry = null
		return undefined
	}
	if (entry.userId !== currentUserId) return undefined
	return entry.data as T
}

export function cacheExploreLoaderData<T extends CacheableExploreData>(
	url: URL,
	data: T,
) {
	const key = cacheKey(url)
	const entry: CacheEntry = {
		key,
		userId: data.user?.id ?? null,
		expiresAt:
			Date.now() +
			(key === '' ? EXPLORE_HOME_CACHE_TTL_MS : EXPLORE_FILTERED_CACHE_TTL_MS),
		data,
	}
	if (key === '') homeEntry = entry
	else filteredEntry = entry
}

export async function loadExploreDataWithCache<T extends CacheableExploreData>(
	url: URL,
	load: () => Promise<T>,
): Promise<T> {
	const cached = getCachedExploreLoaderData<T>(url)
	if (cached) return cached

	const loadingGeneration = generation
	const data = await load()
	// A mutation or account change during the request makes its result stale.
	if (generation === loadingGeneration) cacheExploreLoaderData(url, data)
	return data
}

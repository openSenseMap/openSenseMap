import { searchWithoutChartParams } from './explore-map-search'

type CacheEntry = {
	expiresAt: number
	data: object
}

let homeEntry: CacheEntry | null = null
let generation = 0

export function clearExploreLoaderCache() {
	homeEntry = null
	generation++
}

export async function loadExploreDataWithCache<T extends object>(
	url: URL,
	load: () => Promise<T>,
	ttlMs: number,
): Promise<T> {
	// Child paths and chart controls do not change the unfiltered map response.
	if (ttlMs === 0 || searchWithoutChartParams(url.search)) return load()

	if (homeEntry && homeEntry.expiresAt > Date.now()) return homeEntry.data as T
	homeEntry = null

	const loadingGeneration = generation
	const data = await load()
	// A result from before invalidation must stay out of the cache.
	if (generation === loadingGeneration) {
		homeEntry = { data, expiresAt: Date.now() + ttlMs }
	}
	return data
}

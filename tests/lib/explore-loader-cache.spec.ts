import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import {
	clearExploreLoaderCache,
	EXPLORE_HOME_CACHE_TTL_MS,
	loadExploreDataWithCache,
} from '~/lib/explore-loader-cache'
import { shouldRevalidate } from '~/lib/explore-revalidation'

const url = (path: string) => new URL(path, 'https://example.com')
const data = (version: number) => ({ devices: [{ version }] })
type TestData = ReturnType<typeof data>
const loadCached = (path: string, load: () => Promise<TestData>) =>
	loadExploreDataWithCache(url(path), load)

beforeEach(() => {
	vi.useRealTimers()
	clearExploreLoaderCache()
})

describe('explore client loader cache', () => {
	it('reuses the Home map after a filtered load and ignores chart controls', async () => {
		const load = vi.fn<() => Promise<TestData>>().mockResolvedValue(data(1))
		const loadFiltered = vi
			.fn<() => Promise<TestData>>()
			.mockResolvedValue(data(2))
		const first = await loadCached('/explore', load)
		await loadCached('/explore?phenomenon=temperature', loadFiltered)
		const second = await loadCached('/explore/device-1?aggregation=day', load)

		expect(second).toBe(first)
		expect(load).toHaveBeenCalledTimes(1)
		expect(loadFiltered).toHaveBeenCalledTimes(1)
	})

	it('loads fresh data each time a filtered request runs', async () => {
		const load = vi
			.fn<() => Promise<TestData>>()
			.mockResolvedValueOnce(data(1))
			.mockResolvedValueOnce(data(2))
		const path = '/explore?phenomenon=temperature'
		expect(await loadCached(path, load)).toEqual(data(1))
		expect(await loadCached(path, load)).toEqual(data(2))

		expect(load).toHaveBeenCalledTimes(2)
	})

	it('expires the Home map ten minutes after loading it', async () => {
		vi.useFakeTimers()
		const load = vi
			.fn<() => Promise<TestData>>()
			.mockResolvedValueOnce(data(1))
			.mockResolvedValueOnce(data(2))
		await loadCached('/explore', load)
		vi.advanceTimersByTime(EXPLORE_HOME_CACHE_TTL_MS - 1)
		expect(await loadCached('/explore', load)).toEqual(data(1))
		vi.advanceTimersByTime(1)
		expect(await loadCached('/explore', load)).toEqual(data(2))
		expect(load).toHaveBeenCalledTimes(2)
	})

	it('evicts the Home cache when refreshing the unfiltered view', async () => {
		const load = vi
			.fn<() => Promise<TestData>>()
			.mockResolvedValueOnce(data(1))
			.mockResolvedValueOnce(data(2))
		const refresh = (path: string) =>
			shouldRevalidate({
				currentUrl: url(path),
				nextUrl: url(path),
				currentParams: {},
				nextParams: {},
				defaultShouldRevalidate: true,
			})
		await loadCached('/explore', load)
		expect(refresh('/explore?phenomenon=temperature')).toBe(true)
		expect(await loadCached('/explore', load)).toEqual(data(1))

		expect(refresh('/explore')).toBe(true)
		expect(await loadCached('/explore', load)).toEqual(data(2))
		expect(load).toHaveBeenCalledTimes(2)
	})

	it('does not restore a result invalidated while its request was pending', async () => {
		let resolveLoad!: (value: ReturnType<typeof data>) => void
		const pending = new Promise<ReturnType<typeof data>>((resolve) => {
			resolveLoad = resolve
		})
		const first = loadCached('/explore', () => pending)
		clearExploreLoaderCache()
		resolveLoad(data(1))
		await first

		const loadFresh = vi
			.fn<() => Promise<TestData>>()
			.mockResolvedValue(data(2))
		expect((await loadCached('/explore', loadFresh)).devices).toEqual([
			{ version: 2 },
		])
		expect(loadFresh).toHaveBeenCalledTimes(1)
	})
})

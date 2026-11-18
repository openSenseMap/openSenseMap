import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import {
	clearExploreLoaderCache,
	clearExploreLoaderCacheForUrl,
	EXPLORE_FILTERED_CACHE_TTL_MS,
	EXPLORE_HOME_CACHE_TTL_MS,
	loadExploreDataWithCache,
	setExploreCacheUserId,
} from '~/lib/explore-loader-cache'

const url = (path: string) => new URL(path, 'https://example.com')
const data = (userId: string | null, version: number) => ({
	user: userId ? { id: userId } : null,
	devices: [{ version }],
})
type TestData = ReturnType<typeof data>
const loadCached = (path: string, load: () => Promise<TestData>) =>
	loadExploreDataWithCache(url(path), load)

beforeEach(() => {
	vi.useRealTimers()
	clearExploreLoaderCache()
	setExploreCacheUserId('user-1')
})

describe('explore client loader cache', () => {
	it('reuses the Home map after visiting a filtered route and another page', async () => {
		const load = vi
			.fn<() => Promise<TestData>>()
			.mockResolvedValue(data('user-1', 1))
		const loadFiltered = vi
			.fn<() => Promise<TestData>>()
			.mockResolvedValue(data('user-1', 2))
		const first = await loadCached('/explore', load)
		await loadCached('/explore?phenomenon=temperature', loadFiltered)
		const second = await loadCached('/explore/device-1?aggregation=day', load)

		expect(second).toBe(first)
		expect(load).toHaveBeenCalledTimes(1)
		expect(loadFiltered).toHaveBeenCalledTimes(1)
	})

	it('loads a different map filter variant', async () => {
		const load = vi
			.fn<() => Promise<TestData>>()
			.mockResolvedValueOnce(data('user-1', 1))
			.mockResolvedValueOnce(data('user-1', 2))
		await loadCached('/explore', load)
		const filtered = await loadCached('/explore?phenomenon=temperature', load)

		expect(filtered.devices).toEqual([{ version: 2 }])
		expect(load).toHaveBeenCalledTimes(2)
	})

	it('keeps Home for ten minutes and expires filtered data after one minute', async () => {
		vi.useFakeTimers()
		const loadHome = vi
			.fn<() => Promise<TestData>>()
			.mockResolvedValueOnce(data('user-1', 1))
			.mockResolvedValueOnce(data('user-1', 3))
		const loadFiltered = vi
			.fn<() => Promise<TestData>>()
			.mockResolvedValueOnce(data('user-1', 2))
			.mockResolvedValueOnce(data('user-1', 4))
		await loadCached('/explore', loadHome)
		await loadCached('/explore?phenomenon=temperature', loadFiltered)
		vi.advanceTimersByTime(EXPLORE_FILTERED_CACHE_TTL_MS)
		expect((await loadCached('/explore', loadHome)).devices).toEqual([
			{ version: 1 },
		])
		expect(
			(await loadCached('/explore?phenomenon=temperature', loadFiltered))
				.devices,
		).toEqual([{ version: 4 }])
		vi.advanceTimersByTime(
			EXPLORE_HOME_CACHE_TTL_MS - EXPLORE_FILTERED_CACHE_TTL_MS,
		)
		expect((await loadCached('/explore', loadHome)).devices).toEqual([
			{ version: 3 },
		])
		expect(loadHome).toHaveBeenCalledTimes(2)
		expect(loadFiltered).toHaveBeenCalledTimes(2)
	})

	it('refreshes one URL without evicting Home and clears both on mutation', async () => {
		const loadHome = vi
			.fn<() => Promise<TestData>>()
			.mockResolvedValue(data('user-1', 1))
		const loadFiltered = vi
			.fn<() => Promise<TestData>>()
			.mockResolvedValue(data('user-1', 2))
		await loadCached('/explore', loadHome)
		await loadCached('/explore?phenomenon=temperature', loadFiltered)
		clearExploreLoaderCacheForUrl(url('/explore?phenomenon=temperature'))
		await loadCached('/explore?phenomenon=temperature', loadFiltered)
		await loadCached('/explore', loadHome)
		expect(loadHome).toHaveBeenCalledTimes(1)
		expect(loadFiltered).toHaveBeenCalledTimes(2)

		clearExploreLoaderCache()
		await loadCached('/explore', loadHome)
		expect(loadHome).toHaveBeenCalledTimes(2)
	})

	it('clears cached user data when the signed-in account changes', async () => {
		const load = vi
			.fn<() => Promise<TestData>>()
			.mockResolvedValueOnce(data('user-1', 1))
			.mockResolvedValueOnce(data('user-2', 2))
		await loadCached('/explore', load)

		setExploreCacheUserId('user-2')
		expect((await loadCached('/explore', load)).devices).toEqual([
			{ version: 2 },
		])
		expect(load).toHaveBeenCalledTimes(2)
	})

	it('does not restore a result invalidated while its request was pending', async () => {
		let resolveLoad!: (value: ReturnType<typeof data>) => void
		const pending = new Promise<ReturnType<typeof data>>((resolve) => {
			resolveLoad = resolve
		})
		const first = loadCached('/explore', () => pending)
		clearExploreLoaderCache()
		resolveLoad(data('user-1', 1))
		await first

		const loadFresh = vi
			.fn<() => Promise<TestData>>()
			.mockResolvedValue(data('user-1', 2))
		expect((await loadCached('/explore', loadFresh)).devices).toEqual([
			{ version: 2 },
		])
		expect(loadFresh).toHaveBeenCalledTimes(1)
	})
})

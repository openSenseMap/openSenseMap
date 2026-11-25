import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { getEnv } from '~/lib/env.server'
import {
	clearExploreLoaderCache,
	loadExploreDataWithCache,
} from '~/lib/explore-loader-cache'
import { shouldRevalidate } from '~/lib/explore-revalidation'

const url = (path: string) => new URL(path, 'https://example.com')
const data = (version: number) => ({ devices: [{ version }] })
type TestData = ReturnType<typeof data>
const loadCached = (path: string, load: () => Promise<TestData>) =>
	loadExploreDataWithCache(
		url(path),
		load,
		getEnv().EXPLORE_HOME_CACHE_TTL_SECONDS * 1_000,
	)

beforeEach(() => {
	vi.useRealTimers()
	vi.stubEnv('EXPLORE_HOME_CACHE_TTL_SECONDS', undefined)
	clearExploreLoaderCache()
})

afterEach(() => vi.unstubAllEnvs())

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

	it.each([
		{ setting: undefined, seconds: 300 },
		{ setting: '45', seconds: 45 },
		{ setting: '-1', seconds: 300 },
	])(
		'expires the Home map after $seconds seconds for setting $setting',
		async ({ setting, seconds }) => {
			vi.useFakeTimers()
			vi.stubEnv('EXPLORE_HOME_CACHE_TTL_SECONDS', setting)
			const load = vi
				.fn<() => Promise<TestData>>()
				.mockResolvedValueOnce(data(1))
				.mockResolvedValueOnce(data(2))
			await loadCached('/explore', load)
			vi.advanceTimersByTime(seconds * 1_000 - 1)
			expect(await loadCached('/explore', load)).toEqual(data(1))
			vi.advanceTimersByTime(1)
			expect(await loadCached('/explore', load)).toEqual(data(2))
			expect(load).toHaveBeenCalledTimes(2)
		},
	)

	it('loads fresh Home data when the cache lifetime is zero', async () => {
		vi.stubEnv('EXPLORE_HOME_CACHE_TTL_SECONDS', '0')
		const load = vi
			.fn<() => Promise<TestData>>()
			.mockResolvedValueOnce(data(1))
			.mockResolvedValueOnce(data(2))
		expect(await loadCached('/explore', load)).toEqual(data(1))
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

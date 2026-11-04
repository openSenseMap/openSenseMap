const TEST_API_URL = 'https://api-eu.gpxz.io/v1/elevation/points'

describe('elevation service', () => {
	beforeEach(() => {
		vi.stubEnv('GPXZ_API_KEY', 'test-api-key')
		vi.stubEnv('GPXZ_API_URL', TEST_API_URL)
	})

	afterEach(() => {
		vi.unstubAllGlobals()
		vi.unstubAllEnvs()
		vi.restoreAllMocks()
	})

	it('uses the native GPXZ points API and preserves its provenance', async () => {
		const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
			new Response(
				JSON.stringify({
					status: 'OK',
					results: [
						{
							elevation: 42.75,
							data_source: 'germany_nrw_1m_dtm',
							lat: 51.96,
							lon: 7.63,
						},
					],
				}),
				{
					status: 200,
					headers: { 'Content-Type': 'application/json' },
				},
			),
		)
		vi.stubGlobal('fetch', fetchMock)

		const { getTerrainElevation } =
			await import('~/services/elevation-service.server')
		const result = await getTerrainElevation(51.96, 7.63)

		expect(result).toEqual({
			elevation: 42.75,
			dataset: 'germany_nrw_1m_dtm',
			latitude: 51.96,
			longitude: 7.63,
		})
		expect(fetchMock).toHaveBeenCalledOnce()

		const [url, request] = fetchMock.mock.calls[0]!
		expect(url).toBe(TEST_API_URL)
		expect(request).toMatchObject({ method: 'POST' })
		expect(request?.headers).toMatchObject({
			'Content-Type': 'application/json',
			'x-api-key': 'test-api-key',
		})
		expect(JSON.parse(String(request?.body))).toEqual({
			latlons: '51.96,7.63',
		})
	})

	it('maps GPXZ rate limits to a rate_limited error', async () => {
		vi.stubGlobal(
			'fetch',
			vi
				.fn<typeof fetch>()
				.mockResolvedValue(new Response(null, { status: 429 })),
		)

		const { getTerrainElevation } =
			await import('~/services/elevation-service.server')

		await expect(getTerrainElevation(52.52, 13.405)).rejects.toMatchObject({
			code: 'rate_limited',
		})
	})
})

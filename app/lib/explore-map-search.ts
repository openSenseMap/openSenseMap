const CHART_SEARCH_PARAMS = ['aggregation', 'date_from', 'date_to']

export function searchWithoutChartParams(search: string) {
	const params = new URLSearchParams(search)
	for (const key of CHART_SEARCH_PARAMS) params.delete(key)
	return params.toString()
}

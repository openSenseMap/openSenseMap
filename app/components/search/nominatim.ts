import { type LocationSearchResult } from './search-types'

type NominatimPlace = {
	place_id: number | string
	osm_type?: string
	osm_id?: number | string
	display_name: string
	lat: string
	lon: string
	boundingbox?: [string, string, string, string] // [south, north, west, east]
	class?: string
	type?: string
	addresstype?: string
}

export function nominatimToSearchResult(
	place: NominatimPlace,
): LocationSearchResult {
	const lat = Number(place.lat)
	const lng = Number(place.lon)

	const bbox = place.boundingbox
		? ([
				[Number(place.boundingbox[2]), Number(place.boundingbox[0])],
				[Number(place.boundingbox[3]), Number(place.boundingbox[1])],
			] satisfies LocationSearchResult['bbox'])
		: undefined

	return {
		type: 'location',
		id: String(place.place_id ?? `${place.osm_type}-${place.osm_id}`),
		displayName: place.display_name,
		center: [lng, lat],
		bbox,
		locationKind: place.addresstype ?? place.type ?? place.class,
	}
}

export async function searchNominatimLocations({
	query,
	locale,
	signal,
}: {
	query: string
	locale: string
	signal?: AbortSignal
}): Promise<LocationSearchResult[]> {
	const url = new URL(ENV.NOMINATIM_SEARCH_API)

	url.search = new URLSearchParams({
		q: query,
		format: 'jsonv2',
		limit: '4',
		addressdetails: '1',
		'accept-language': locale,
	}).toString()

	const response = await fetch(url, {
		method: 'GET',
		signal,
	})

	if (!response.ok) {
		throw new Error(`Nominatim search failed with ${response.status}`)
	}

	const data = (await response.json()) as NominatimPlace[]

	return data.map(nominatimToSearchResult)
}

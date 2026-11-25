import MaplibreGeocoder, {
	type CarmenGeojsonFeature,
	type MaplibreGeocoderApi,
	type MaplibreGeocoderApiConfig,
	type MaplibreGeocoderFeatureResults,
	type MaplibreGeocoderOptions,
} from '@maplibre/maplibre-gl-geocoder'
import * as React from 'react'
import { useMemo, useState } from 'react'
import {
	useControl,
	Marker,
	type MarkerProps,
	type ControlPosition,
} from 'react-map-gl/maplibre'

type GeocoderEvent = Record<string, unknown>

type GeocoderControlProps = Omit<
	MaplibreGeocoderOptions,
	'maplibregl' | 'marker'
> & {
	marker?: boolean | Omit<MarkerProps, 'longitude' | 'latitude'>
	position?: ControlPosition
	onLoading?: (e: GeocoderEvent) => void
	onResults?: (e: GeocoderEvent) => void
	onResult?: (e: GeocoderEvent) => void
	onError?: (e: GeocoderEvent) => void
}

type NominatimPlace = {
	place_id?: number | string
	osm_type?: 'node' | 'way' | 'relation' | string
	osm_id?: number | string
	lat?: string
	lon?: string
	display_name?: string
	type?: string
	category?: string
	class?: string
	boundingbox?: [string, string, string, string] | string[]
	address?: Record<string, string>
	name?: string
}

function toFeature(place: NominatimPlace): CarmenGeojsonFeature | null {
	const lon = Number(place.lon)
	const lat = Number(place.lat)

	if (!Number.isFinite(lon) || !Number.isFinite(lat)) {
		return null
	}

	const south = Number(place.boundingbox?.[0])
	const north = Number(place.boundingbox?.[1])
	const west = Number(place.boundingbox?.[2])
	const east = Number(place.boundingbox?.[3])

	const hasBBox = [south, north, west, east].every(Number.isFinite)

	const osmPrefix =
		place.osm_type === 'node'
			? 'N'
			: place.osm_type === 'way'
				? 'W'
				: place.osm_type === 'relation'
					? 'R'
					: ''

	return {
		id:
			osmPrefix && place.osm_id
				? `${osmPrefix}${place.osm_id}`
				: String(place.place_id ?? ''),
		type: 'Feature',
		geometry: {
			type: 'Point',
			coordinates: [lon, lat],
		},
		place_name: place.display_name ?? '',
		text: place.name ?? place.display_name ?? '',
		place_type: [place.type ?? 'place'],
		center: [lon, lat],
		properties: {
			osm_type: place.osm_type,
			osm_id: place.osm_id,
			category: place.category ?? place.class,
			type: place.type,
			address: place.address,
		},
		bbox: hasBBox ? [west, south, east, north] : undefined,
	}
}

function isFeature(
	feature: CarmenGeojsonFeature | null,
): feature is CarmenGeojsonFeature {
	return feature !== null
}

function buildSearchUrl(query: string) {
	const url = new URL('https://nominatim.openstreetmap.org/search')
	url.searchParams.set('q', query)
	url.searchParams.set('format', 'jsonv2')
	url.searchParams.set('addressdetails', '1')
	url.searchParams.set('limit', '5')
	return url.toString()
}

function buildReverseUrl(lon: number, lat: number) {
	const url = new URL('https://nominatim.openstreetmap.org/reverse')
	url.searchParams.set('lon', String(lon))
	url.searchParams.set('lat', String(lat))
	url.searchParams.set('format', 'jsonv2')
	url.searchParams.set('addressdetails', '1')
	return url.toString()
}

const noop = () => {}

export default function GeocoderControl({
	marker = true,
	position = 'top-left',
	onLoading = noop,
	onResults = noop,
	onResult = noop,
	onError = noop,
	...options
}: GeocoderControlProps) {
	const [markerNode, setMarkerNode] = useState<React.ReactNode>(null)

	const geoApi = useMemo<MaplibreGeocoderApi>(
		() => ({
			forwardGeocode: async (
				config: MaplibreGeocoderApiConfig,
			): Promise<MaplibreGeocoderFeatureResults> => {
				if (typeof config.query !== 'string' || !config.query.trim()) {
					return { type: 'FeatureCollection', features: [] }
				}

				const response = await fetch(buildSearchUrl(config.query), {
					headers: {
						Accept: 'application/json',
					},
				})

				if (!response.ok) {
					throw new Error(`Nominatim search failed: ${response.status}`)
				}

				const places = (await response.json()) as NominatimPlace[]
				const features = places.map(toFeature).filter(isFeature)

				return { type: 'FeatureCollection', features }
			},

			reverseGeocode: async (
				config: MaplibreGeocoderApiConfig,
			): Promise<MaplibreGeocoderFeatureResults> => {
				if (
					!Array.isArray(config.query) ||
					config.query.length < 2 ||
					typeof config.query[0] !== 'number' ||
					typeof config.query[1] !== 'number'
				) {
					return { type: 'FeatureCollection', features: [] }
				}

				const [lon, lat] = config.query

				const response = await fetch(buildReverseUrl(lon, lat), {
					headers: {
						Accept: 'application/json',
					},
				})

				if (!response.ok) {
					throw new Error(
						`Nominatim reverse geocoding failed: ${response.status}`,
					)
				}

				const place = (await response.json()) as NominatimPlace
				const feature = toFeature(place)

				return { type: 'FeatureCollection', features: feature ? [feature] : [] }
			},
		}),
		[],
	)

	useControl<MaplibreGeocoder>(
		() => {
			const ctrl = new MaplibreGeocoder(geoApi, {
				...options,
				marker: false,
			})

			ctrl.on('loading', onLoading)
			ctrl.on('results', onResults)
			ctrl.on('result', (evt: any) => {
				onResult(evt)

				const result = evt?.result
				const location =
					result &&
					(result.center ||
						(result.geometry?.type === 'Point' && result.geometry.coordinates))

				if (location && marker) {
					const extraMarkerProps = typeof marker === 'object' ? marker : {}

					setMarkerNode(
						<Marker
							longitude={location[0]}
							latitude={location[1]}
							{...extraMarkerProps}
						/>,
					)
				} else {
					setMarkerNode(null)
				}
			})
			ctrl.on('error', onError)

			return ctrl
		},
		{ position },
	)

	return <>{markerNode}</>
}

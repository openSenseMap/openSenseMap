import { type LngLatLike, type MapRef } from 'react-map-gl/maplibre'
import {
	type SearchResult,
	type SearchBBox,
} from '~/components/search/search-types'

export const goToLocation = (map: MapRef | undefined, center: LngLatLike) => {
	map?.flyTo({
		center,
		animate: true,
		speed: 1.6,
		zoom: 20,
		essential: true,
	})
}

export const zoomOut = (map: MapRef | undefined) => {
	map?.flyTo({
		center: [0, 0],
		animate: true,
		speed: 1.6,
		zoom: 1,
		essential: true,
	})
}

export const goToLocationBBox = (map: MapRef | undefined, bbox: SearchBBox) => {
	map?.fitBounds(bbox, {
		animate: true,
		speed: 1.6,
		padding: 48,
	})
}

export const goToDevice = (
	map: MapRef | undefined,
	lng: number,
	lat: number,
) => {
	map?.flyTo({
		center: [lng, lat],
		animate: true,
		speed: 1.6,
		zoom: 15,
		essential: true,
	})
}

export const goTo = (map: MapRef | undefined, item: SearchResult) => {
	if (item.type === 'device') {
		goToDevice(map, item.lng, item.lat)
		return
	}

	if (item.bbox) {
		goToLocationBBox(map, item.bbox)
		return
	}

	goToLocation(map, item.center)
}

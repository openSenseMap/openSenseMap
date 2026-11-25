import { type FeatureCollection, type Point } from 'geojson'
import { type Device } from '~/db/schema'

export type SearchBBox = [[number, number], [number, number]]

export type DeviceSearchResult = {
	type: 'device'
	id: string
	displayName: string
	deviceId: string
	lng: number
	lat: number
}

export type LocationSearchResult = {
	type: 'location'
	id: string
	displayName: string
	center: [number, number]
	bbox?: SearchBBox
	locationKind?: string
}

export type SearchResult = DeviceSearchResult | LocationSearchResult

export type DeviceFeatureCollection = FeatureCollection<Point, Device>

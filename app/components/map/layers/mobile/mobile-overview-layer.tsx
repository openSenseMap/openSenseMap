import { featureCollection, lineString, point } from '@turf/helpers'
import { type FeatureCollection, type LineString, type Point } from 'geojson'
import { CalendarClock } from 'lucide-react'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Source, Layer, useMap, Popup } from 'react-map-gl/maplibre'
import MapLegend from './mobile-overview-legend'
import { type LocationPoint, type Trip } from '~/lib/mobile-box-helper'
import { getLngLatBounds, validLngLat } from '~/lib/location'

const FIT_PADDING = 100
// extra space on desktop for device-detail-box and legend
const DEVICE_PANEL_FIT_PADDING = 500
const LEGEND_FIT_PADDING = 320
const DESKTOP_LAYOUT_MIN_WIDTH = 1024
const TRIP_FIT_MAX_ZOOM = 16
const TRIP_FIT_DURATION = 900

function* getTripCoordinates(trips: Trip[]) {
	for (const trip of trips) {
		for (const { geometry } of trip.points) {
			yield [geometry.x, geometry.y] as const
		}
	}
}

// Clustering configuration
const CLUSTER_DISTANCE_METERS = 8 // Distance threshold for clustering
const MIN_CLUSTER_SIZE = 15 // Minimum points to form a cluster

// Function to calculate distance between two points in meters
function calculateDistance(
	point1: LocationPoint,
	point2: LocationPoint,
): number {
	const R = 6371000 // Earth's radius in meters
	const lat1Rad = (point1.geometry.y * Math.PI) / 180
	const lat2Rad = (point2.geometry.y * Math.PI) / 180
	const deltaLatRad = ((point2.geometry.y - point1.geometry.y) * Math.PI) / 180
	const deltaLonRad = ((point2.geometry.x - point1.geometry.x) * Math.PI) / 180

	const a =
		Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
		Math.cos(lat1Rad) *
			Math.cos(lat2Rad) *
			Math.sin(deltaLonRad / 2) *
			Math.sin(deltaLonRad / 2)
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

	return R * c
}

// Cluster points within a single trip
function clusterTripPoints(
	points: LocationPoint[],
	distanceThreshold: number,
	minClusterSize: number,
) {
	const clusters: LocationPoint[][] = []
	const visited = new Set<number>()

	for (let i = 0; i < points.length; i++) {
		if (visited.has(i)) continue

		const cluster: LocationPoint[] = [points[i]]
		visited.add(i)

		// Find all points within distance threshold
		for (let j = i + 1; j < points.length; j++) {
			if (visited.has(j)) continue

			const distance = calculateDistance(points[i], points[j])
			if (distance <= distanceThreshold) {
				cluster.push(points[j])
				visited.add(j)
			}
		}

		// Only create cluster if it meets minimum size requirement
		if (cluster.length >= minClusterSize) {
			clusters.push(cluster)
		} else {
			// Add individual points that don't form clusters
			cluster.forEach((point) => clusters.push([point]))
		}
	}

	return clusters
}

// Calculate cluster center and metadata
function calculateClusterCenter(cluster: LocationPoint[], clusterId: string) {
	const centerX =
		cluster.reduce((sum, point) => sum + point.geometry.x, 0) / cluster.length
	const centerY =
		cluster.reduce((sum, point) => sum + point.geometry.y, 0) / cluster.length

	// Sort by timestamp to get earliest and latest
	const sortedByTime = [...cluster].sort(
		(a, b) => new Date(a.time).getTime() - new Date(b.time).getTime(),
	)

	return {
		coordinates: [centerX, centerY],
		pointCount: cluster.length,
		startTime: sortedByTime[0].time,
		endTime: sortedByTime[sortedByTime.length - 1].time,
		isCluster: cluster.length > 1,
		clusterId: clusterId,
		originalPoints: cluster, // Keep reference to original points
	}
}

// Function to generate or select unique colors
function generateColors(count: number): string[] {
	const colors = [
		'#66c2a5',
		'#fc8d62',
		'#8da0cb',
		'#e78ac3',
		'#a6d854',
		'#ffd92f',
	]
	while (colors.length < count) {
		const hue = Math.round((colors.length * 137.508) % 360)
		colors.push(`hsl(${hue}, 58%, 52%)`)
	}
	return colors.slice(0, count)
}

type OverviewProperties = {
	color: string
	tripNumber: number
	timestamp: string
	pointCount?: number
	isCluster?: boolean
	startTime: string
	endTime: string
	clusterId?: string
}

export default function MobileOverviewLayer({
	trips,
	muted = false,
}: {
	trips: Trip[]
	muted?: boolean
}) {
	const { t, i18n } = useTranslation('mobile-map')
	const tripDateTimeFormatter = useMemo(
		() =>
			new Intl.DateTimeFormat(i18n.language, {
				dateStyle: 'medium',
				timeStyle: 'short',
			}),
		[i18n.language],
	)
	// Cluster points within each trip
	const clusteredTrips = useMemo(() => {
		if (!trips || trips.length === 0) return []

		return trips.map((trip, tripIndex) => {
			const clusters = clusterTripPoints(
				trip.points,
				CLUSTER_DISTANCE_METERS,
				MIN_CLUSTER_SIZE,
			)

			return {
				...trip,
				clusters: clusters.map((cluster, clusterIndex) =>
					calculateClusterCenter(
						cluster,
						`trip-${tripIndex}-cluster-${clusterIndex}`,
					),
				),
			}
		})
	}, [trips])

	const { osem: mapRef } = useMap()

	// Hover is temporary; selection persists until another legend click.
	const [hoveredTrip, setHoveredTrip] = useState<number | null>(null)
	const [selectedTripSelection, setSelectedTripSelection] = useState<{
		trip: Trip
		tripNumber: number
	} | null>(null)
	const selectedTrip =
		selectedTripSelection &&
		trips[selectedTripSelection.tripNumber - 1] === selectedTripSelection.trip
			? selectedTripSelection.tripNumber
			: null

	// State to track the hovered cluster
	const [hoveredCluster, setHoveredCluster] = useState<string | null>(null)

	// State to track the popup information
	const [popupInfo, setPopupInfo] = useState<{
		longitude: number
		latitude: number
		startTime: string
		endTime: string
		pointCount?: number
		isCluster?: boolean
	} | null>(null)
	const [interactionSourceData, setInteractionSourceData] =
		useState<FeatureCollection<Point | LineString, OverviewProperties> | null>(
			null,
		)

	const [showOriginalColors, setShowOriginalColors] = useState(true)
	const showTripColors = showOriginalColors && !muted

	const { sourceData, expandedSourceData, legendItems } = useMemo(() => {
		if (clusteredTrips.length === 0) {
			return {
				sourceData: null,
				expandedSourceData: null,
				legendItems: [],
			}
		}

		const colors = generateColors(clusteredTrips.length)
		const lines = clusteredTrips.flatMap((trip, index) => {
			const routeCoordinates = trip.points
				.filter(
					(routePoint) =>
						Number.isFinite(new Date(routePoint.time).getTime()) &&
						validLngLat(routePoint.geometry.x, routePoint.geometry.y),
				)
				.map(
					(routePoint) =>
						[routePoint.geometry.x, routePoint.geometry.y] as [number, number],
				)

			if (routeCoordinates.length < 2) return []

			return [
				lineString(routeCoordinates, {
					color: colors[index],
					tripNumber: index + 1,
					timestamp: trip.startTime,
					startTime: trip.startTime,
					endTime: trip.endTime,
				}),
			]
		})

		// Convert clustered trips into GeoJSON Points
		const points = clusteredTrips.flatMap((trip, index) =>
			trip.clusters.map((cluster) =>
				point(cluster.coordinates, {
					color: colors[index],
					tripNumber: index + 1,
					timestamp: cluster.startTime,
					pointCount: cluster.pointCount,
					isCluster: cluster.isCluster,
					startTime: cluster.startTime,
					endTime: cluster.endTime,
					clusterId: cluster.clusterId,
				}),
			),
		)

		// Create expanded points data for cluster hover
		const expandedPoints = clusteredTrips.flatMap((trip, tripIndex) =>
			trip.clusters.flatMap((cluster) => {
				if (!cluster.isCluster || !cluster.originalPoints) return []

				return cluster.originalPoints.map((originalPoint) =>
					point([originalPoint.geometry.x, originalPoint.geometry.y], {
						color: colors[tripIndex],
						tripNumber: tripIndex + 1,
						timestamp: originalPoint.time,
						clusterId: cluster.clusterId,
					}),
				)
			}),
		)

		// Set legend items for the trips
		const legend = clusteredTrips.map((trip, index) => ({
			label: formatTripTimeRange(
				trip.startTime,
				trip.endTime,
				tripDateTimeFormatter,
			),
			color: colors[index],
			isLatest: index === clusteredTrips.length - 1,
			tripNumber: index + 1,
		}))

		return {
			sourceData: featureCollection<Point | LineString, OverviewProperties>([
				...lines,
				...points,
			]),
			expandedSourceData: featureCollection(expandedPoints),
			legendItems: legend,
		}
	}, [clusteredTrips, tripDateTimeFormatter])
	const interactionIsCurrent = interactionSourceData === sourceData
	const activeHoveredTrip = interactionIsCurrent ? hoveredTrip : null
	const activeHighlightedTrip = activeHoveredTrip ?? selectedTrip
	const activeHoveredCluster = interactionIsCurrent ? hoveredCluster : null
	const activePopupInfo = interactionIsCurrent ? popupInfo : null
	const clearHoverInteraction = useCallback(() => {
		setInteractionSourceData(null)
		setHoveredTrip(null)
		setHoveredCluster(null)
		setPopupInfo(null)
	}, [])

	const fitTrips = useCallback(
		(tripsToFit: Trip[], animate: boolean) => {
			if (!mapRef) return

			const bounds = getLngLatBounds(getTripCoordinates(tripsToFit))
			if (!bounds) return

			const useDesktopPadding =
				mapRef.getCanvas().clientWidth >= DESKTOP_LAYOUT_MIN_WIDTH
			mapRef.fitBounds(bounds, {
				padding: {
					top: FIT_PADDING,
					bottom: FIT_PADDING,
					left: useDesktopPadding ? DEVICE_PANEL_FIT_PADDING : FIT_PADDING,
					right: useDesktopPadding ? LEGEND_FIT_PADDING : FIT_PADDING,
				},
				maxZoom: TRIP_FIT_MAX_ZOOM,
				duration: animate ? TRIP_FIT_DURATION : 0,
				essential: true,
			})
		},
		[mapRef],
	)

	useEffect(() => {
		if (!sourceData) return
		fitTrips(trips, false)
	}, [fitTrips, sourceData, trips])

	const handleHover = useCallback(
		(event: any) => {
			if (!showTripColors) {
				clearHoverInteraction()
				return
			}

			if (event.features && event.features.length > 0) {
				setInteractionSourceData(sourceData)
				const feature = event.features[0]
				const {
					tripNumber,
					startTime,
					endTime,
					pointCount,
					isCluster,
					clusterId,
				} = feature.properties
				setHoveredTrip(tripNumber)

				// Set hovered cluster if it's a cluster
				if (isCluster && clusterId) {
					setHoveredCluster(clusterId)
				} else {
					setHoveredCluster(null)
				}

				const [longitude, latitude] =
					feature.geometry.type === 'Point'
						? feature.geometry.coordinates
						: [event.lngLat.lng, event.lngLat.lat]
				setPopupInfo({
					longitude,
					latitude,
					startTime,
					endTime,
					pointCount,
					isCluster,
				})
			} else {
				clearHoverInteraction()
			}
		},
		[clearHoverInteraction, showTripColors, sourceData],
	)

	useEffect(() => {
		if (!mapRef) return

		if (!showTripColors) return

		const interactiveLayers = ['box-overview-route-layer', 'box-overview-layer']
		const onMouseMove = (event: any) => {
			if (!showTripColors) {
				mapRef.getCanvas().style.cursor = ''
				return
			}

			mapRef.getCanvas().style.cursor = event.features?.length ? 'pointer' : ''
			handleHover(event)
		}

		const onMouseLeave = () => {
			if (!showTripColors) return
			mapRef.getCanvas().style.cursor = ''
			clearHoverInteraction()
		}

		interactiveLayers.forEach((layerId) => {
			mapRef.on('mousemove', layerId, onMouseMove)
			mapRef.on('mouseleave', layerId, onMouseLeave)
		})

		return () => {
			interactiveLayers.forEach((layerId) => {
				mapRef.off('mousemove', layerId, onMouseMove)
				mapRef.off('mouseleave', layerId, onMouseLeave)
			})
			mapRef.getCanvas().style.cursor = ''
		}
	}, [clearHoverInteraction, mapRef, handleHover, showTripColors])

	const handleLegendItemSelect = useCallback(
		(tripNumber: number) => {
			const trip = trips[tripNumber - 1]
			if (!trip) return

			clearHoverInteraction()
			if (selectedTrip === tripNumber) {
				setSelectedTripSelection(null)
				fitTrips(trips, true)
				return
			}

			setSelectedTripSelection({ trip, tripNumber })
			fitTrips([trip], true)
		},
		[clearHoverInteraction, fitTrips, selectedTrip, trips],
	)

	if (!sourceData) return null

	return (
		<>
			<Source id="box-overview-source" type="geojson" data={sourceData}>
				<Layer
					id="box-overview-route-layer"
					type="line"
					source="box-overview-source"
					filter={['==', '$type', 'LineString']}
					layout={{
						'line-cap': 'round',
						'line-join': 'round',
					}}
					paint={{
						'line-color': muted
							? '#6b7280'
							: showOriginalColors
								? ['get', 'color']
								: '#888',
						'line-width': muted
							? 4
							: [
									'case',
									['==', ['get', 'tripNumber'], activeHighlightedTrip],
									5,
									3,
								],
						'line-opacity': muted
							? 0.65
							: showOriginalColors
								? [
										'case',
										['==', ['get', 'tripNumber'], activeHighlightedTrip],
										1,
										0.65,
									]
								: 0.7,
					}}
				/>
				<Layer
					id="box-overview-selected-route"
					type="line"
					source="box-overview-source"
					filter={[
						'all',
						['==', '$type', 'LineString'],
						['==', ['get', 'tripNumber'], selectedTrip ?? -1],
					]}
					layout={{
						'line-cap': 'round',
						'line-join': 'round',
					}}
					paint={{
						'line-color': ['get', 'color'],
						'line-width': 6,
						'line-opacity': 1,
					}}
				/>
				{!muted && (
					<>
						<Layer
							id="box-overview-layer"
							type="circle"
							source="box-overview-source"
							filter={['==', '$type', 'Point']}
							paint={{
								'circle-color': showTripColors ? ['get', 'color'] : '#888',
								'circle-radius': [
									'case',
									['==', ['get', 'tripNumber'], selectedTrip ?? -1],
									['get', 'isCluster'],
									[
										'interpolate',
										['linear'],
										['get', 'pointCount'],
										1,
										5, // Single point: radius 5
										10,
										8, // 10 points: radius 8
										50,
										12, // 50 points: radius 12
										100,
										16, // 100+ points: radius 16
									],
									3, // Non-cluster points: radius 3
								],
								'circle-opacity': showOriginalColors
									? [
											'case',
											['==', ['get', 'tripNumber'], activeHighlightedTrip],
											1,
											0.5,
										]
									: 1,
								'circle-stroke-width': [
									'case',
									['==', ['get', 'tripNumber'], selectedTrip ?? -1],
									3,
									['get', 'isCluster'],
									2, // Clusters have stroke
									0, // Individual points don't
								],
								'circle-stroke-color': [
									'case',
									['==', ['get', 'tripNumber'], selectedTrip ?? -1],
									'#fff',
									'#222',
								],
								'circle-stroke-opacity': showOriginalColors
									? [
											'case',
											['==', ['get', 'tripNumber'], activeHighlightedTrip],
											1,
											0.3,
										]
									: 1,
							}}
						/>
					</>
				)}

				{/* Text layer for cluster point counts */}
				{!muted && (
					<Layer
						id="box-overview-cluster-text"
						type="symbol"
						source="box-overview-source"
						filter={['get', 'isCluster']}
						layout={{
							'text-field': ['get', 'pointCount'],
							'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
							'text-size': 11,
							'text-allow-overlap': true,
						}}
						paint={{
							'text-color': '#211',
							'text-opacity': showOriginalColors
								? [
										'case',
										['==', ['get', 'tripNumber'], activeHighlightedTrip],
										1,
										0.7,
									]
								: 1,
						}}
					/>
				)}
			</Source>

			{/* Expanded cluster points - shown on hover */}
			{showTripColors && activeHoveredCluster && expandedSourceData && (
				<Source
					id="box-overview-expanded-source"
					type="geojson"
					data={expandedSourceData}
				>
					<Layer
						id="box-overview-expanded-layer"
						type="circle"
						source="box-overview-expanded-source"
						filter={['==', ['get', 'clusterId'], activeHoveredCluster]}
						paint={{
							'circle-color': ['get', 'color'],
							'circle-radius': 4,
							'circle-opacity': 0.9,
							'circle-stroke-width': 2,
							'circle-stroke-color': '#222',
							'circle-stroke-opacity': 1,
						}}
					/>
				</Source>
			)}

			{showTripColors && activeHighlightedTrip && activePopupInfo && (
				<Popup
					longitude={activePopupInfo.longitude}
					latitude={activePopupInfo.latitude}
					closeButton={false}
					closeOnClick={false}
					anchor="top"
				>
					<div className="mb-2 flex items-center justify-center">
						<CalendarClock className="text-primary h-4 w-4" />
					</div>
					<div className="space-y-1 text-center">
						{activePopupInfo.isCluster && (
							<div className="mb-2">
								<p className="text-muted-foreground text-xs font-medium">
									{t('clusterPoints', {
										count: activePopupInfo.pointCount,
									})}
								</p>
							</div>
						)}
						<div>
							<p className="text-primary text-sm font-bold">
								{tripDateTimeFormatter.format(
									new Date(activePopupInfo.startTime),
								)}
							</p>
						</div>
						{activePopupInfo.startTime !== activePopupInfo.endTime && (
							<div>
								<span className="text-muted-foreground text-xs font-medium">
									{t('to')}
								</span>
								<p className="text-primary text-sm font-bold">
									{tripDateTimeFormatter.format(
										new Date(activePopupInfo.endTime),
									)}
								</p>
							</div>
						)}
					</div>
				</Popup>
			)}

			{!muted && (
				<MapLegend
					items={legendItems}
					position="top-right"
					onColorByTripChange={(enabled) => {
						clearHoverInteraction()
						setSelectedTripSelection(null)
						setShowOriginalColors(enabled)
					}}
					showOriginalColors={showOriginalColors}
					selectedTripNumber={selectedTrip}
					onLegendItemHover={(tripNumber) => {
						if (tripNumber === null) {
							clearHoverInteraction()
							return
						}

						setInteractionSourceData(sourceData)
						setHoveredCluster(null)
						setPopupInfo(null)
						setHoveredTrip(tripNumber)
					}}
					onLegendItemSelect={handleLegendItemSelect}
				/>
			)}
		</>
	)
}

function formatTripTimeRange(
	startTime: string,
	endTime: string,
	dateTimeFormatter: Intl.DateTimeFormat,
) {
	return dateTimeFormatter.formatRange(new Date(startTime), new Date(endTime))
}

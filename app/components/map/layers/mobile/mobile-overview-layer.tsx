import bbox from '@turf/bbox'
import { point, featureCollection } from '@turf/helpers'
import { type FeatureCollection, type Point } from 'geojson'
import { CalendarClock } from 'lucide-react'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { Source, Layer, useMap, Popup } from 'react-map-gl/maplibre'
import MapLegend from './mobile-overview-legend'
import {
	type LocationPoint,
	categorizeIntoTrips,
} from '~/lib/mobile-box-helper'
import { useTranslation } from 'react-i18next'

const FIT_PADDING = 100

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
	const sortedByTime = cluster.sort(
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
		colors.push(...colors)
	}
	return colors.slice(0, count)
}

export default function MobileOverviewLayer({
	locations,
}: {
	locations: LocationPoint[]
}) {
	const { i18n } = useTranslation()
	const dateTimeFormat = new Intl.DateTimeFormat(i18n.language, {
		dateStyle: 'short',
		timeStyle: 'short',
	})

	// Generate trips and assign colors once
	const trips = useMemo(() => categorizeIntoTrips(locations, 50), [locations])

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

	const [sourceData, setSourceData] = useState<FeatureCollection<
		Point,
		{
			color: string
			tripNumber: number
			timestamp: string
			pointCount?: number
			isCluster?: boolean
			startTime?: string
			endTime?: string
			clusterId?: string
		}
	> | null>(null)

	const [expandedSourceData, setExpandedSourceData] =
		useState<FeatureCollection<
			Point,
			{
				color: string
				tripNumber: number
				timestamp: string
				clusterId: string
			}
		> | null>(null)

	const { osem: mapRef } = useMap()

	// Legend items state
	const [legendItems, setLegendItems] = useState<
		{ label: string; color: string }[]
	>([])

	// State to track the highlighted trip number
	const [highlightedTrip, setHighlightedTrip] = useState<number | null>(null)

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

	const [showOriginalColors, setShowOriginalColors] = useState(true)

	useEffect(() => {
		if (!clusteredTrips || clusteredTrips.length === 0) return

		const colors = generateColors(clusteredTrips.length)

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
		const legend = clusteredTrips.map((_, index) => ({
			label: `Trip ${index + 1}`,
			color: colors[index],
		}))

		setSourceData(featureCollection(points))
		setExpandedSourceData(featureCollection(expandedPoints))
		setLegendItems(legend)
	}, [clusteredTrips])

	useEffect(() => {
		if (!mapRef || !sourceData) return

		const bounds = bbox(sourceData).slice(0, 4) as [
			number,
			number,
			number,
			number,
		]
		mapRef.fitBounds(bounds, {
			padding: {
				top: FIT_PADDING,
				bottom: FIT_PADDING,
				left: 500,
				right: FIT_PADDING,
			},
		})
	}, [mapRef, sourceData])

	const handleHover = useCallback(
		(event: any) => {
			if (!showOriginalColors) {
				setHighlightedTrip(null)
				setPopupInfo(null)
				setHoveredCluster(null)
				return
			}

			if (event.features && event.features.length > 0) {
				const feature = event.features[0]
				const {
					tripNumber,
					startTime,
					endTime,
					pointCount,
					isCluster,
					clusterId,
				} = feature.properties
				setHighlightedTrip(tripNumber)

				// Set hovered cluster if it's a cluster
				if (isCluster && clusterId) {
					setHoveredCluster(clusterId)
				} else {
					setHoveredCluster(null)
				}

				const [longitude, latitude] = feature.geometry.coordinates
				setPopupInfo({
					longitude,
					latitude,
					startTime,
					endTime,
					pointCount,
					isCluster,
				})
			} else {
				setHighlightedTrip(null)
				setPopupInfo(null)
				setHoveredCluster(null)
			}
		},
		[showOriginalColors],
	)

	useEffect(() => {
		if (!mapRef) return

		const onMouseMove = (event: any) => {
			if (!showOriginalColors) {
				mapRef.getCanvas().style.cursor = ''
				return
			}

			mapRef.getCanvas().style.cursor = event.features?.length ? 'pointer' : ''
			handleHover(event)
		}

		const onMouseLeave = () => {
			if (!showOriginalColors) return
			mapRef.getCanvas().style.cursor = ''
			setHighlightedTrip(null)
			setPopupInfo(null)
			setHoveredCluster(null)
		}

		mapRef.on('mousemove', 'box-overview-layer', onMouseMove)
		mapRef.on('mouseleave', 'box-overview-layer', onMouseLeave)

		return () => {
			mapRef.off('mousemove', 'box-overview-layer', onMouseMove)
			mapRef.off('mouseleave', 'box-overview-layer', onMouseLeave)
		}
	}, [mapRef, handleHover, showOriginalColors])

	if (!sourceData) return null

	return (
		<>
			<Source id="box-overview-source" type="geojson" data={sourceData}>
				<Layer
					id="box-overview-layer"
					type="circle"
					source="box-overview-source"
					paint={{
						'circle-color': showOriginalColors ? ['get', 'color'] : '#888',
						'circle-radius': [
							'case',
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
							? ['case', ['==', ['get', 'tripNumber'], highlightedTrip], 1, 0.5]
							: 1,
						'circle-stroke-width': [
							'case',
							['get', 'isCluster'],
							2, // Clusters have stroke
							0, // Individual points don't
						],
						'circle-stroke-color': '#222',
						'circle-stroke-opacity': showOriginalColors
							? ['case', ['==', ['get', 'tripNumber'], highlightedTrip], 1, 0.3]
							: 1,
					}}
				/>

				{/* Text layer for cluster point counts */}
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
							? ['case', ['==', ['get', 'tripNumber'], highlightedTrip], 1, 0.7]
							: 1,
					}}
				/>
			</Source>

			{/* Expanded cluster points - shown on hover */}
			{hoveredCluster && expandedSourceData && (
				<Source
					id="box-overview-expanded-source"
					type="geojson"
					data={expandedSourceData}
				>
					<Layer
						id="box-overview-expanded-layer"
						type="circle"
						source="box-overview-expanded-source"
						filter={['==', ['get', 'clusterId'], hoveredCluster]}
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

			{highlightedTrip && popupInfo && (
				<Popup
					longitude={popupInfo.longitude}
					latitude={popupInfo.latitude}
					closeButton={false}
					closeOnClick={false}
					anchor="top"
				>
					<div className="mb-2 flex items-center justify-center">
						<CalendarClock className="text-primary h-4 w-4" />
					</div>
					<div className="space-y-1 text-center">
						{popupInfo.isCluster && (
							<div className="mb-2">
								<p className="text-muted-foreground text-xs font-medium">
									Cluster of {popupInfo.pointCount} points
								</p>
							</div>
						)}
						<div>
							<p className="text-primary text-sm font-bold">
								{dateTimeFormat.format(new Date(popupInfo.startTime))}
							</p>
						</div>
						{popupInfo.isCluster &&
							popupInfo.startTime !== popupInfo.endTime && (
								<div>
									<span className="text-muted-foreground text-xs font-medium">
										To
									</span>
									<p className="text-primary text-sm font-bold">
										{dateTimeFormat.format(new Date(popupInfo.endTime))}
									</p>
								</div>
							)}
					</div>
				</Popup>
			)}

			<MapLegend
				items={legendItems}
				position="top-right"
				toggleTrips={() => setShowOriginalColors(!showOriginalColors)}
				showOriginalColors={showOriginalColors}
				onLegendItemHover={(color) => {
					setHighlightedTrip(
						color
							? legendItems.findIndex((item) => item.color === color) + 1
							: null,
					)
				}}
			/>
		</>
	)
}

import { createContext, useContext, useEffect, useMemo } from 'react'
import { Layer, Popup, Source, useMap } from 'react-map-gl/maplibre'
import { HIGH_COLOR, LOW_COLOR } from './color-palette'
import {
	buildSensorTrajectoryData,
	type SensorTrajectoryMeasurement,
	type SensorTrajectoryProperties,
} from './mobile-sensor-trajectory'
import { type Sensor } from '~/db/schema'
import { type Trip } from '~/lib/mobile-box-helper'

export type HoveredMeasurement = {
	locationId: number
	time: string
}

export const HoveredPointContext = createContext<{
	hoveredPoint: HoveredMeasurement | null
	setHoveredPoint: (point: HoveredMeasurement | null) => void
}>({
	hoveredPoint: null,
	setHoveredPoint: () => {},
})

export default function MobileBoxLayer({
	sensor,
	trips,
	minColor = LOW_COLOR,
	maxColor = HIGH_COLOR,
}: {
	sensor: Sensor
	trips: Trip[]
	minColor?: string
	maxColor?: string
}) {
	const { hoveredPoint, setHoveredPoint } = useContext(HoveredPointContext)
	const { osem: mapRef } = useMap()

	const { sensorData } = useMemo(
		() =>
			buildSensorTrajectoryData({
				measurements: (Array.isArray(sensor.data)
					? sensor.data
					: []) as SensorTrajectoryMeasurement[],
				trips,
				minColor,
				maxColor,
			}),
		[maxColor, minColor, sensor.data, trips],
	)

	const hoveredFeature = useMemo(() => {
		if (hoveredPoint === null) return null

		return (
			sensorData.features.find(
				(feat) =>
					feat.geometry.type === 'Point' &&
					(feat.properties as SensorTrajectoryProperties | undefined)
						?.locationId === hoveredPoint.locationId &&
					(feat.properties as SensorTrajectoryProperties | undefined)?.time ===
						hoveredPoint.time,
			) ?? null
		)
	}, [hoveredPoint, sensorData.features])

	useEffect(() => {
		if (!mapRef) return

		const map = mapRef.getMap()

		if (sensorData.features.length === 0) return

		const interactiveLayers = ['box-layer-segment', 'box-layer-point']
		const handleMouseMove = (event: any) => {
			if (!event.features || event.features.length === 0) return

			const feature = event.features[0]
			const { locationId, time } =
				feature.properties as SensorTrajectoryProperties
			map.getCanvas().style.cursor = 'pointer'
			setHoveredPoint({ locationId, time })
		}

		const handleMouseLeave = () => {
			map.getCanvas().style.cursor = ''
			setHoveredPoint(null)
		}

		interactiveLayers.forEach((layerId) => {
			map.on('mousemove', layerId, handleMouseMove)
			map.on('mouseleave', layerId, handleMouseLeave)
		})

		return () => {
			interactiveLayers.forEach((layerId) => {
				map.off('mousemove', layerId, handleMouseMove)
				map.off('mouseleave', layerId, handleMouseLeave)
			})
			map.getCanvas().style.cursor = ''
		}
	}, [mapRef, sensorData.features.length, setHoveredPoint])

	if (sensorData.features.length === 0) return null

	const popupCoordinates =
		hoveredFeature?.geometry.type === 'Point'
			? (hoveredFeature.geometry.coordinates as [number, number])
			: null

	const popupProps = hoveredFeature?.properties as
		| SensorTrajectoryProperties
		| undefined

	return (
		<>
			{sensorData.features.length > 0 && (
				<Source id="box-source" type="geojson" data={sensorData}>
					<Layer
						id="box-layer-segment"
						source="box-source"
						filter={['==', '$type', 'LineString']}
						type="line"
						paint={{
							'line-color': ['get', 'color'],
							'line-width': 6,
							'line-opacity': 0.9,
						}}
						layout={{
							'line-cap': 'round',
							'line-join': 'round',
						}}
					/>
					<Layer
						id="box-layer-point"
						source="box-source"
						filter={['==', '$type', 'Point']}
						type="circle"
						paint={{
							'circle-color': ['get', 'color'],
							'circle-radius': 5,
							'circle-stroke-color': '#fff',
							'circle-stroke-width': 1,
						}}
					/>
					<Layer
						id="highlighted-layer"
						source="box-source"
						filter={
							hoveredPoint
								? [
										'all',
										['==', ['get', 'locationId'], hoveredPoint.locationId],
										['==', ['get', 'time'], hoveredPoint.time],
									]
								: ['==', ['get', 'locationId'], -1]
						}
						type="circle"
						paint={{
							'circle-color': ['get', 'color'],
							'circle-radius': 8,
							'circle-opacity': 1,
							'circle-stroke-color': '#fff',
							'circle-stroke-width': 2,
						}}
					/>
				</Source>
			)}

			{popupCoordinates && popupProps ? (
				<Popup
					longitude={popupCoordinates[0]}
					latitude={popupCoordinates[1]}
					closeButton={false}
					closeOnClick={false}
					className="highlight-popup"
					anchor="bottom"
				>
					<div className="flex flex-col items-center justify-center">
						<strong>{sensor.title}</strong>
						<strong>
							{popupProps.value}
							{sensor.unit}
						</strong>
					</div>
				</Popup>
			) : null}
		</>
	)
}

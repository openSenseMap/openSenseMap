import { featureCollection, lineString, point } from '@turf/helpers'
import { type FeatureCollection, type LineString, type Point } from 'geojson'
import { createPalette } from './color-palette'
import {
	MOBILE_TRIP_GAP_SECONDS,
	type LocationPoint,
	type Trip,
} from '~/lib/mobile-box-helper'
import { validLngLat } from '~/lib/location'

export type SensorTrajectoryMeasurement = {
	value?: unknown
	location?: { x: number; y: number; id: number } | null
	time?: Date | string | null
}

export type SensorTrajectoryProperties = {
	kind: 'measurement' | 'segment'
	tripNumber: number
	locationId: number
	value: number
	time: string
	color: string
}

type NormalizedMeasurement = {
	tripIndex: number
	coordinates: [number, number]
	locationId: number
	timestamp: number
	time: string
	value: number | null
}

export type SensorTrajectoryData = {
	sensorData: FeatureCollection<Point | LineString, SensorTrajectoryProperties>
	minValue: number | null
	maxValue: number | null
}

/**
 * Project sensor values onto canonical route segments. A segment is colored
 * only when a nearby measurement belongs to its starting route point. The
 * parent overview layer keeps every uncolored part of the route visible.
 */
export function buildSensorTrajectoryData({
	measurements,
	trips,
	minColor,
	maxColor,
}: {
	measurements: SensorTrajectoryMeasurement[]
	trips: Trip[]
	minColor: string
	maxColor: string
}): SensorTrajectoryData {
	const normalizedTrips = normalizeTrips(trips)
	const normalizedMeasurements = normalizeMeasurements(
		measurements,
		trips,
		normalizedTrips,
	)
	const values = normalizedMeasurements.flatMap((measurement) =>
		measurement.value === null ? [] : [measurement.value],
	)
	const minValue = values.length > 0 ? Math.min(...values) : null
	const maxValue = values.length > 0 ? Math.max(...values) : null
	const palette =
		minValue === null || maxValue === null
			? null
			: createPalette(minValue, maxValue, minColor, maxColor)

	const measurementPoints = normalizedMeasurements.flatMap((measurement) => {
		if (measurement.value === null || palette === null) return []

		return [
			point(measurement.coordinates, {
				kind: 'measurement' as const,
				tripNumber: measurement.tripIndex + 1,
				locationId: measurement.locationId,
				value: measurement.value,
				time: measurement.time,
				color: palette(measurement.value).hex(),
			}),
		]
	})
	const measurementsByTrip = normalizedMeasurements.reduce(
		(groupedMeasurements, measurement) => {
			const tripMeasurements =
				groupedMeasurements.get(measurement.tripIndex) ?? []
			tripMeasurements.push(measurement)
			groupedMeasurements.set(measurement.tripIndex, tripMeasurements)
			return groupedMeasurements
		},
		new Map<number, NormalizedMeasurement[]>(),
	)
	const segments = normalizedTrips.flatMap((trip) => {
		const tripMeasurements = measurementsByTrip.get(trip.tripIndex) ?? []

		return trip.points.slice(0, -1).flatMap((routePoint, index) => {
			const nextRoutePoint = trip.points[index + 1]
			const gapSeconds =
				(nextRoutePoint.timestamp - routePoint.timestamp) / 1000
			const measurement = findMeasurementForRoutePoint(
				routePoint,
				tripMeasurements,
			)

			if (
				measurement?.value == null ||
				palette === null ||
				gapSeconds < 0 ||
				gapSeconds > MOBILE_TRIP_GAP_SECONDS
			) {
				return []
			}

			return [
				lineString([routePoint.coordinates, nextRoutePoint.coordinates], {
					kind: 'segment' as const,
					tripNumber: measurement.tripIndex + 1,
					locationId: measurement.locationId,
					value: measurement.value,
					time: measurement.time,
					color: palette(measurement.value).hex(),
				}),
			]
		})
	})

	return {
		sensorData: featureCollection<
			Point | LineString,
			SensorTrajectoryProperties
		>([...segments, ...measurementPoints]),
		minValue,
		maxValue,
	}
}

export function getSensorTrajectoryValueRange(
	measurements: SensorTrajectoryMeasurement[],
	trips: Trip[],
): { minValue: number | null; maxValue: number | null } {
	const normalizedTrips = normalizeTrips(trips)
	const values = normalizeMeasurements(
		measurements,
		trips,
		normalizedTrips,
	).flatMap((measurement) =>
		measurement.value === null ? [] : [measurement.value],
	)

	return {
		minValue: values.length > 0 ? Math.min(...values) : null,
		maxValue: values.length > 0 ? Math.max(...values) : null,
	}
}

function normalizeTrips(trips: Trip[]) {
	return trips.flatMap((trip, tripIndex) => {
		const points = trip.points
			.flatMap((routePoint) => {
				const timestamp = getTimestamp(routePoint.time)
				if (
					timestamp === null ||
					!validLngLat(routePoint.geometry.x, routePoint.geometry.y)
				) {
					return []
				}

				return [
					{
						coordinates: [routePoint.geometry.x, routePoint.geometry.y] as [
							number,
							number,
						],
						timestamp,
						time: new Date(timestamp).toISOString(),
					},
				]
			})
			.sort((a, b) => a.timestamp - b.timestamp)

		return points.length === 0 ? [] : [{ tripIndex, points }]
	})
}

function normalizeMeasurements(
	measurements: SensorTrajectoryMeasurement[],
	trips: Trip<LocationPoint>[],
	normalizedTrips: ReturnType<typeof normalizeTrips>,
): NormalizedMeasurement[] {
	return measurements
		.flatMap((measurement) => {
			const timestamp = getTimestamp(measurement.time)
			const location = measurement.location
			const locationId = Number(location?.id)

			if (
				timestamp === null ||
				!location ||
				!Number.isFinite(locationId) ||
				!validLngLat(location.x, location.y)
			) {
				return []
			}

			const tripIndex = findTripIndexForMeasurement(
				[location.x, location.y],
				timestamp,
				normalizedTrips,
			)
			if (tripIndex === null) return []

			const numericValue =
				measurement.value == null ? null : Number(measurement.value)

			return [
				{
					tripIndex,
					coordinates: [location.x, location.y] as [number, number],
					locationId,
					timestamp,
					time: new Date(timestamp).toISOString(),
					value:
						numericValue !== null && Number.isFinite(numericValue)
							? numericValue
							: null,
				},
			]
		})
		.sort((a, b) => a.timestamp - b.timestamp)
}

function findTripIndexForMeasurement(
	coordinates: [number, number],
	timestamp: number,
	trips: ReturnType<typeof normalizeTrips>,
): number | null {
	let closestTripIndex: number | null = null
	let closestTimeDifference = Number.POSITIVE_INFINITY

	trips.forEach((trip) => {
		const earliestTime = timestamp - MOBILE_TRIP_GAP_SECONDS * 1000
		const latestTime = timestamp + MOBILE_TRIP_GAP_SECONDS * 1000
		const startIndex = findFirstTimestampAtOrAfter(trip.points, earliestTime)

		for (let index = startIndex; index < trip.points.length; index++) {
			const routePoint = trip.points[index]
			if (routePoint.timestamp > latestTime) break

			const timeDifference = Math.abs(routePoint.timestamp - timestamp)
			if (
				!coordinatesMatch(routePoint.coordinates, coordinates) ||
				timeDifference >= closestTimeDifference
			) {
				continue
			}

			closestTripIndex = trip.tripIndex
			closestTimeDifference = timeDifference
		}
	})

	return closestTripIndex
}

function findMeasurementForRoutePoint(
	routePoint: { coordinates: [number, number]; timestamp: number },
	measurements: NormalizedMeasurement[],
): NormalizedMeasurement | null {
	let closest: NormalizedMeasurement | null = null
	let closestTimeDifference = Number.POSITIVE_INFINITY
	const earliestTime = routePoint.timestamp - MOBILE_TRIP_GAP_SECONDS * 1000
	const latestTime = routePoint.timestamp + MOBILE_TRIP_GAP_SECONDS * 1000
	const startIndex = findFirstTimestampAtOrAfter(measurements, earliestTime)

	for (let index = startIndex; index < measurements.length; index++) {
		const measurement = measurements[index]
		if (measurement.timestamp > latestTime) break

		const timeDifference = Math.abs(
			measurement.timestamp - routePoint.timestamp,
		)
		if (
			!coordinatesMatch(measurement.coordinates, routePoint.coordinates) ||
			timeDifference >= closestTimeDifference
		) {
			continue
		}

		closest = measurement
		closestTimeDifference = timeDifference
	}

	return closest
}

function findFirstTimestampAtOrAfter<T extends { timestamp: number }>(
	items: T[],
	timestamp: number,
): number {
	let lower = 0
	let upper = items.length

	while (lower < upper) {
		const middle = Math.floor((lower + upper) / 2)
		if (items[middle].timestamp < timestamp) {
			lower = middle + 1
		} else {
			upper = middle
		}
	}

	return lower
}

function coordinatesMatch(
	first: [number, number],
	second: [number, number],
): boolean {
	const coordinateTolerance = 0.000001
	return (
		Math.abs(first[0] - second[0]) <= coordinateTolerance &&
		Math.abs(first[1] - second[1]) <= coordinateTolerance
	)
}

function getTimestamp(value: Date | string | null | undefined): number | null {
	if (value == null) return null

	const timestamp = new Date(value).getTime()
	return Number.isFinite(timestamp) ? timestamp : null
}

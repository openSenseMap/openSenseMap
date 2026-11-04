import { describe, expect, it } from 'vitest'
import {
	buildSensorTrajectoryData,
	getSensorTrajectoryValueRange,
	type SensorTrajectoryMeasurement,
} from '~/components/map/layers/mobile/mobile-sensor-trajectory'
import {
	categorizeIntoTrips,
	type LocationPoint,
} from '~/lib/mobile-box-helper'

const BASE_TIME = Date.parse('2026-01-01T12:00:00.000Z')

function routePoint(seconds: number, x: number, y: number): LocationPoint {
	return {
		geometry: { x, y },
		time: new Date(BASE_TIME + seconds * 1000).toISOString(),
	}
}

function measurement(
	seconds: number,
	x: number,
	y: number,
	value: unknown,
	id = seconds + 1,
): SensorTrajectoryMeasurement {
	return {
		time: new Date(BASE_TIME + seconds * 1000).toISOString(),
		value,
		location: { id, x, y },
	}
}

const colors = { minColor: '#0000ff', maxColor: '#ff0000' }

describe('mobile sensor trajectory', () => {
	it('colors canonical route segments without connecting separate trips', () => {
		const routePoints = [
			routePoint(0, 10, 53),
			routePoint(30, 10.001, 53.001),
			routePoint(60, 10.002, 53.002),
			routePoint(300, 11, 54),
			routePoint(330, 11.001, 54.001),
		]
		const trips = categorizeIntoTrips(routePoints)
		const result = buildSensorTrajectoryData({
			measurements: [
				measurement(0, 10, 53, 10),
				measurement(30, 10.001, 53.001, 20),
				measurement(300, 11, 54, 30),
			],
			trips,
			...colors,
		})
		const segments = result.sensorData.features.filter(
			(feature) => feature.geometry.type === 'LineString',
		)

		expect(segments).toHaveLength(3)
		expect(segments.map((segment) => segment.geometry.coordinates)).toEqual([
			[
				[10, 53],
				[10.001, 53.001],
			],
			[
				[10.001, 53.001],
				[10.002, 53.002],
			],
			[
				[11, 54],
				[11.001, 54.001],
			],
		])
		expect(segments.map((segment) => segment.properties.tripNumber)).toEqual([
			1, 1, 2,
		])
	})

	it('does not draw a chord between sparse measurements', () => {
		const trips = categorizeIntoTrips([
			routePoint(0, 10, 53),
			routePoint(30, 10.001, 53.002),
			routePoint(60, 10.002, 53),
		])
		const result = buildSensorTrajectoryData({
			measurements: [
				measurement(0, 10, 53, 10),
				measurement(60, 10.002, 53, 20),
			],
			trips,
			...colors,
		})
		const segments = result.sensorData.features.filter(
			(feature) => feature.geometry.type === 'LineString',
		)

		expect(segments).toHaveLength(1)
		expect(segments[0].geometry.coordinates).toEqual([
			[10, 53],
			[10.001, 53.002],
		])
	})

	it('keeps missing values neutral and calculates bounds from rendered values', () => {
		const trips = categorizeIntoTrips([
			routePoint(0, 10, 53),
			routePoint(30, 10.001, 53.001),
			routePoint(60, 10.002, 53.002),
		])
		const measurements = [
			measurement(0, 10, 53, null),
			measurement(30, 10.001, 53.001, 42),
		]
		const result = buildSensorTrajectoryData({
			measurements,
			trips,
			...colors,
		})

		expect(
			result.sensorData.features.filter(
				(feature) => feature.geometry.type === 'LineString',
			),
		).toHaveLength(1)
		expect(result.minValue).toBe(42)
		expect(result.maxValue).toBe(42)
		expect(getSensorTrajectoryValueRange(measurements, trips)).toEqual({
			minValue: 42,
			maxValue: 42,
		})
	})

	it('rejects invalid, unrelated, and temporally distant measurements', () => {
		const trips = categorizeIntoTrips([
			routePoint(0, 10, 53),
			routePoint(30, 10.001, 53.001),
		])
		const result = buildSensorTrajectoryData({
			measurements: [
				measurement(0, Number.NaN, 53, 1),
				measurement(0, 100, 20, 2),
				measurement(120, 10, 53, 3),
				{ time: 'invalid', value: 4, location: { id: 4, x: 10, y: 53 } },
				measurement(0, 10, 53, Number.POSITIVE_INFINITY),
			],
			trips,
			...colors,
		})

		expect(result.sensorData.features).toEqual([])
		expect(result.minValue).toBeNull()
		expect(result.maxValue).toBeNull()
	})

	it('renders a valid sensor point for a single-point trip without a line', () => {
		const trips = categorizeIntoTrips([routePoint(0, 10, 53)])
		const result = buildSensorTrajectoryData({
			measurements: [measurement(0, 10, 53, 12, 99)],
			trips,
			...colors,
		})

		expect(result.sensorData.features).toHaveLength(1)
		expect(result.sensorData.features[0].geometry.type).toBe('Point')
		expect(result.sensorData.features[0].properties).toMatchObject({
			kind: 'measurement',
			locationId: 99,
			value: 12,
		})
	})
})

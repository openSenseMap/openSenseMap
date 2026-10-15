import { describe, expect, it } from 'vitest'
import {
	MOBILE_TRIP_LIMIT,
	categorizeIntoTrips,
	getLatestTrips,
	getTripIndexForTime,
	getTripsForDisplay,
	isTimeWithinTrips,
	type LocationPoint,
} from '~/lib/mobile-box-helper'

const BASE_TIME = Date.parse('2026-01-01T12:00:00.000Z')

function locationPoint(seconds: number, x = seconds): LocationPoint {
	return {
		geometry: { x, y: 53 },
		time: new Date(BASE_TIME + seconds * 1000).toISOString(),
	}
}

describe('mobile trip helpers', () => {
	it('returns no trips for empty input or a non-positive limit', () => {
		expect(categorizeIntoTrips([])).toEqual([])
		expect(getLatestTrips([locationPoint(0)], 0)).toEqual([])
	})

	it('sorts points without mutating them and starts a trip only after the gap', () => {
		const points = [locationPoint(121), locationPoint(60), locationPoint(0)]
		const originalOrder = points.map((point) => point.time)

		const trips = categorizeIntoTrips(points)

		expect(points.map((point) => point.time)).toEqual(originalOrder)
		expect(trips).toHaveLength(2)
		expect(trips[0].points.map((point) => point.time)).toEqual([
			locationPoint(0).time,
			locationPoint(60).time,
		])
		expect(trips[1].points).toEqual([locationPoint(121)])
	})

	it('drops invalid timestamps instead of creating invalid trips', () => {
		const invalidPoint = {
			geometry: { x: 7, y: 53 },
			time: 'not-a-date',
		}

		expect(categorizeIntoTrips([locationPoint(0), invalidPoint])).toEqual([
			{
				points: [locationPoint(0)],
				startTime: locationPoint(0).time,
				endTime: locationPoint(0).time,
			},
		])
	})

	it('keeps the newest five trips by default but honors an explicit range', () => {
		const points = Array.from({ length: 7 }, (_, index) =>
			locationPoint(index * 120),
		)

		expect(getLatestTrips(points)).toHaveLength(MOBILE_TRIP_LIMIT)
		expect(getLatestTrips(points)[0].startTime).toBe(locationPoint(240).time)

		const rangedTrips = getTripsForDisplay(
			points,
			new Date(locationPoint(0).time),
			new Date(locationPoint(720).time),
		)

		expect(rangedTrips).toHaveLength(7)
	})

	it('associates a timestamp with the closest tolerated trip', () => {
		const trips = categorizeIntoTrips([
			locationPoint(0),
			locationPoint(30),
			locationPoint(100),
			locationPoint(130),
		])

		expect(getTripIndexForTime(locationPoint(110).time, trips)).toBe(1)
		expect(getTripIndexForTime(locationPoint(80).time, trips, 60)).toBe(1)
		expect(getTripIndexForTime(locationPoint(80).time, trips)).toBeNull()
		expect(isTimeWithinTrips(locationPoint(30).time, trips)).toBe(true)
	})

	it('treats a non-finite tolerance as zero', () => {
		const trips = categorizeIntoTrips([locationPoint(0), locationPoint(30)])

		expect(
			getTripIndexForTime(locationPoint(45).time, trips, Number.NaN),
		).toBeNull()
	})
})

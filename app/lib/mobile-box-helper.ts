export const MOBILE_TRIP_GAP_SECONDS = 60
export const MOBILE_TRIP_LIMIT = 5

export interface LocationPoint {
	geometry: {
		x: number
		y: number
	}
	time: string
}

export interface Trip<TPoint extends LocationPoint = LocationPoint> {
	points: TPoint[]
	startTime: string
	endTime: string
}

/**
 * Split location points into chronological trips. A gap greater than the
 * threshold starts a new trip.
 */
export function categorizeIntoTrips<TPoint extends LocationPoint>(
	dataPoints: TPoint[],
	timeThreshold = MOBILE_TRIP_GAP_SECONDS,
): Trip<TPoint>[] {
	const sortedPoints = dataPoints
		.filter((point) => Number.isFinite(new Date(point.time).getTime()))
		.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())
	if (sortedPoints.length === 0) return []

	const trips: Trip<TPoint>[] = []
	let currentTrip: TPoint[] = [sortedPoints[0]]

	for (let i = 1; i < sortedPoints.length; i++) {
		const previousPoint = sortedPoints[i - 1]
		const currentPoint = sortedPoints[i]
		const timeDifference =
			(new Date(currentPoint.time).getTime() -
				new Date(previousPoint.time).getTime()) /
			1000

		if (timeDifference > timeThreshold) {
			trips.push(toTrip(currentTrip))
			currentTrip = [currentPoint]
		} else {
			currentTrip.push(currentPoint)
		}
	}

	trips.push(toTrip(currentTrip))
	return trips
}

/** Return the newest trips while preserving chronological display order. */
export function getLatestTrips<TPoint extends LocationPoint>(
	dataPoints: TPoint[],
	limit = MOBILE_TRIP_LIMIT,
	timeThreshold = MOBILE_TRIP_GAP_SECONDS,
): Trip<TPoint>[] {
	if (limit <= 0) return []
	return categorizeIntoTrips(dataPoints, timeThreshold).slice(-limit)
}

export function getLatestTripPoints<TPoint extends LocationPoint>(
	dataPoints: TPoint[],
	limit = MOBILE_TRIP_LIMIT,
	timeThreshold = MOBILE_TRIP_GAP_SECONDS,
): TPoint[] {
	return getLatestTrips(dataPoints, limit, timeThreshold).flatMap(
		(trip) => trip.points,
	)
}

/**
 * Select the trips shown by the explore map. The default view is deliberately
 * limited to the newest trips. An explicit date range is an opt-in request for
 * the trips in that range and is therefore not truncated to the default limit.
 */
export function getTripsForDisplay<TPoint extends LocationPoint>(
	dataPoints: TPoint[],
	startTime?: Date,
	endTime?: Date,
): Trip<TPoint>[] {
	const start = startTime?.getTime()
	const end = endTime?.getTime()

	if (
		start === undefined ||
		end === undefined ||
		!Number.isFinite(start) ||
		!Number.isFinite(end) ||
		start > end
	) {
		return getLatestTrips(dataPoints)
	}

	return categorizeIntoTrips(
		dataPoints.filter((point) => {
			const time = new Date(point.time).getTime()
			return Number.isFinite(time) && time >= start && time <= end
		}),
	)
}

/**
 * Find the canonical trip containing a timestamp. A small tolerance is useful
 * for measurements recorded just before the first or after the last location
 * of a trip. If tolerance windows overlap, the nearest trip wins.
 */
export function getTripIndexForTime<TPoint extends LocationPoint>(
	time: Date | string | null | undefined,
	trips: Trip<TPoint>[],
	toleranceSeconds = 0,
): number | null {
	const timestamp = time == null ? Number.NaN : new Date(time).getTime()
	if (!Number.isFinite(timestamp)) return null

	const tolerance =
		(Number.isFinite(toleranceSeconds) ? Math.max(0, toleranceSeconds) : 0) *
		1000
	let closestTrip: { index: number; distance: number } | null = null

	for (let index = 0; index < trips.length; index++) {
		const trip = trips[index]
		const start = new Date(trip.startTime).getTime()
		const end = new Date(trip.endTime).getTime()
		if (!Number.isFinite(start) || !Number.isFinite(end)) continue

		const lowerBound = Math.min(start, end)
		const upperBound = Math.max(start, end)
		if (
			timestamp < lowerBound - tolerance ||
			timestamp > upperBound + tolerance
		) {
			continue
		}

		const distance =
			timestamp < lowerBound
				? lowerBound - timestamp
				: timestamp > upperBound
					? timestamp - upperBound
					: 0

		if (closestTrip === null || distance < closestTrip.distance) {
			closestTrip = { index, distance }
		}
	}

	return closestTrip?.index ?? null
}

export function isTimeWithinTrips<TPoint extends LocationPoint>(
	time: Date | string | null | undefined,
	trips: Trip<TPoint>[],
	toleranceSeconds = 0,
): boolean {
	return getTripIndexForTime(time, trips, toleranceSeconds) !== null
}

function toTrip<TPoint extends LocationPoint>(points: TPoint[]): Trip<TPoint> {
	return {
		points,
		startTime: points[0].time,
		endTime: points[points.length - 1].time,
	}
}

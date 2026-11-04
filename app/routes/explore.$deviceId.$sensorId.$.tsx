import { addDays } from 'date-fns'
import { redirect, useLoaderData } from 'react-router'
import { type Route } from './+types/explore.$deviceId.$sensorId.$'
import Graph from '~/components/device-detail/graph'
import MobileBoxView from '~/components/map/layers/mobile/mobile-box-view'
import { getDevice } from '~/db/models/device.server'
import { getMeasurement } from '~/db/models/measurement.query.server'
import { getSensor } from '~/db/models/sensor.server'
import { type SensorWithMeasurementData } from '~/db/schema'
import {
	categorizeIntoTrips,
	type LocationPoint,
} from '~/lib/mobile-box-helper'

interface SensorWithColor extends SensorWithMeasurementData {
	color: string
}

export async function loader({ params, request }: Route.LoaderArgs) {
	const { deviceId, sensorId } = params
	const sensorId2 = params['*']

	if (!deviceId) {
		return redirect('/explore')
	}

	const device = await getDevice({ id: deviceId })

	if (!device) {
		return redirect('/explore')
	}

	const url = new URL(request.url)
	const aggregation = url.searchParams.get('aggregation') || 'raw'
	const startDate = url.searchParams.get('date_from')
	const endDate = url.searchParams.get('date_to')

	if (!sensorId) {
		throw new Response('Sensor 1 not found', { status: 404 })
	}

	const sensor1 = (await getSensor(sensorId)) as SensorWithColor
	const sensor1Data = await getMeasurement(
		sensorId,
		aggregation,
		startDate ? new Date(startDate) : undefined,
		endDate ? addDays(new Date(endDate), 1) : undefined,
	)

	const normalizedSensor1Data = (
		sensor1Data as {
			sensorId: string
			locationId: bigint | null
			time: Date
			value: number | null
			location: {
				id: bigint
				x: number
				y: number
			}
		}[]
	).map((d) => ({
		...d,
		locationId: Number(d.locationId),
		location: d.location
			? {
					...d.location,
					id: Number(d.location.id),
				}
			: null,
	}))

	// If device exposure is 'mobile', process trips
	if (device.exposure === 'mobile' && !startDate) {
		// Categorize data into trips
		const dataPoints: LocationPoint[] = normalizedSensor1Data
			.filter((d) => d.location !== null)
			.map((d) => ({
				// null locations cannot be shown on the map and have been filtered above
				// hence the ! operator is fine here
				geometry: { x: d.location!.x, y: d.location!.y },
				time: d.time.toISOString(), // Ensure the time is in ISO format
			}))

		const trips = categorizeIntoTrips(dataPoints, 600) // 600 seconds (10 minutes) as the time threshold

		// Get the latest 5 trips
		const latestTrips = trips.slice(0, 1)

		// Calculate the time range of the latest 5 trips
		const latestTripTimeRange = {
			startTime: latestTrips[0].startTime,
			endTime: latestTrips[latestTrips.length - 1].endTime,
		}

		// Filter sensor data to include only the points within the time range of the latest 5 trips
		const filteredData = normalizedSensor1Data.filter((point) => {
			const pointTime = point.time.getTime()
			const tripStartTime = new Date(latestTripTimeRange.startTime).getTime()
			const tripEndTime = new Date(latestTripTimeRange.endTime).getTime()

			// Keep only the points within the time range of the latest trips
			return pointTime >= tripStartTime && pointTime <= tripEndTime
		})

		// Update sensor1 data with the filtered data
		sensor1.data = filteredData.map((d) => ({
			...d,
			sensorId: sensorId, // Set the sensorId to match
			locationId: d.locationId ?? null, // Retain the locationId if available
			location: d.location,
			time: d.time, // Keep the timestamp
			value: d.value ?? 0, // Set value to the actual value or default it to 0
		}))

		sensor1.color = sensor1.color || '#8da0cb'
	} else {
		sensor1.data = normalizedSensor1Data
		sensor1.color = sensor1.color || '#8da0cb'
	}

	let sensor2: SensorWithColor | null = null

	if (sensorId2) {
		sensor2 = (await getSensor(sensorId2)) as SensorWithColor
		const sensor2Data = await getMeasurement(
			sensorId2,
			aggregation,
			startDate ? new Date(startDate) : undefined,
			endDate ? addDays(new Date(endDate), 1) : undefined,
		)

		const normalizedSensor2Data = (
			sensor2Data as {
				sensorId: string
				locationId: bigint | null
				time: Date
				value: number | null
				location: {
					id: bigint
					x: number
					y: number
				}
			}[]
		).map((d) => ({
			...d,
			locationId: Number(d.locationId),
			location: d.location
				? {
						...d.location,
						id: Number(d.location.id),
					}
				: null,
		}))

		if (device.exposure === 'mobile') {
			// Categorize data into trips
			const dataPoints: LocationPoint[] = normalizedSensor2Data
				.filter((d) => d.location !== null)
				.map((d) => ({
					// null locations cannot be shown on the map and have been filtered above
					// hence the ! operator is fine here
					geometry: { x: d.location!.x, y: d.location!.y },
					time: d.time.toISOString(), // Ensure the time is in ISO format
				}))

			const trips = categorizeIntoTrips(dataPoints, 600) // 600 seconds (10 minutes) as the time threshold

			// Get the latest trip --- slice to get more trips if needed
			const latestTrips = trips.slice(0, 1)

			// Calculate the time range of the latest 5 trips
			const latestTripTimeRange = {
				startTime: latestTrips[0].startTime,
				endTime: latestTrips[latestTrips.length - 1].endTime,
			}

			// Filter sensor data to include only the points within the time range of the latest 5 trips
			const filteredData = normalizedSensor2Data.filter((point) => {
				const pointTime = point.time.getTime()
				const tripStartTime = new Date(latestTripTimeRange.startTime).getTime()
				const tripEndTime = new Date(latestTripTimeRange.endTime).getTime()

				// Keep only the points within the time range of the latest trips
				return pointTime >= tripStartTime && pointTime <= tripEndTime
			})

			// Update sensor2 data with the filtered data
			sensor2.data = filteredData.map((d) => ({
				...d,
				sensorId: sensorId2, // Set the sensorId to match
				locationId: d.locationId ?? null, // Retain the locationId if available
				location: d.location,
				time: d.time, // Keep the timestamp
				value: d.value ?? 0, // Set value to the actual value or default it to 0
			}))
			sensor2.color = sensor2.color || '#fc8d62'
		} else {
			sensor2.data = normalizedSensor2Data
			sensor2.color = sensor2.color || '#fc8d62'
		}
	}

	return {
		device,
		sensors: sensor2 ? [sensor1, sensor2] : [sensor1],
		startDate,
		endDate,
		aggregation,
	}
}

export default function SensorView() {
	const loaderData = useLoaderData<typeof loader>()

	return (
		<>
			<Graph
				aggregation={loaderData.aggregation}
				sensors={loaderData.sensors}
				startDate={loaderData.startDate ?? undefined}
				endDate={loaderData.endDate ?? undefined}
			/>
			{loaderData.device?.exposure === 'mobile' && (
				<MobileBoxView sensors={loaderData.sensors} />
			)}
		</>
	)
}

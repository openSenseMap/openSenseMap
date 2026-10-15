import { useState } from 'react'
import { Outlet, useLoaderData, useMatches } from 'react-router'
import { type Route } from './+types/explore.$deviceId'
import DeviceDetailBox from '~/components/device-detail/device-detail-box'
import {
	HoveredPointContext,
	type HoveredMeasurement,
} from '~/components/map/layers/mobile/mobile-box-layer'
import MobileOverviewLayer from '~/components/map/layers/mobile/mobile-overview-layer'
import { getDevice } from '~/db/models/device.server'
import { getSensorsWithLastMeasurement } from '~/db/models/sensor.server'
import { getTripsForDisplay, type Trip } from '~/lib/mobile-box-helper'
import { validLngLat } from '~/lib/location'
import { getDeviceImageUrl } from '~/lib/s3.server'
import { getLocale } from '~/middleware/i18next'

export async function loader({ context, params, request }: Route.LoaderArgs) {
	const locale = getLocale(context)
	// Extracting the selected sensors from the URL query parameters using the stringToArray function
	const url = new URL(request.url)
	const aggregation = url.searchParams.get('aggregation') || 'raw'
	const startDate = url.searchParams.get('date_from') || undefined
	const endDate = url.searchParams.get('date_to') || undefined

	if (!params.deviceId) {
		throw new Response('Device not found', { status: 502 })
	}

	const device = await getDevice({ id: params.deviceId })
	const sensorsWithLastestMeasurement = await getSensorsWithLastMeasurement(
		params.deviceId,
	)

	let mobileTrips: Trip[] = []

	// The device locations are the canonical source for trip boundaries. The
	// default view shows the latest trips; an explicit range shows every trip in
	// that range so the device, sensor map, and graph all use the same selection.
	if (device?.exposure === 'mobile' && device?.locations) {
		const formattedLocations = device.locations.flatMap((location) => {
			const timestamp = new Date(location.time).getTime()
			if (
				!Number.isFinite(timestamp) ||
				!validLngLat(location.geometry.x, location.geometry.y)
			) {
				return []
			}

			return [
				{
					time: new Date(timestamp).toISOString(),
					geometry: location.geometry,
				},
			]
		})
		mobileTrips = getTripsForDisplay(
			formattedLocations,
			startDate ? new Date(startDate) : undefined,
			endDate ? new Date(endDate) : undefined,
		)
		const visiblePointTimes = new Set(
			mobileTrips.flatMap((trip) => trip.points.map((point) => point.time)),
		)

		device.locations = device.locations.filter((location) => {
			const timestamp = new Date(location.time).getTime()
			return (
				Number.isFinite(timestamp) &&
				validLngLat(location.geometry.x, location.geometry.y) &&
				visiblePointTimes.has(new Date(timestamp).toISOString())
			)
		})
	}

	// Find all sensors from the device response that have the same id as one of the sensor array value
	let deviceImageUrl: string | null = null

	if (device?.image) {
		try {
			deviceImageUrl = await getDeviceImageUrl(device.image)
		} catch (error) {
			console.error('Failed to create signed device image URL:', error)
		}
	}

	// Combine the device data with the selected sensors and return the result as JSON + add env variable
	const data = {
		device,
		mobileTrips,
		deviceImageUrl,
		sensors: sensorsWithLastestMeasurement,
		aggregation,
		fromDate: startDate,
		toDate: endDate,
		OSEM_API_URL: process.env.OSEM_API_URL,
		locale,
	}

	return data
}

// Defining the component that will render the page
export default function DeviceId() {
	// Retrieving the data returned by the loader using the useLoaderData hook
	const data = useLoaderData<typeof loader>()
	const matches = useMatches()
	const [hoveredPoint, setHoveredPoint] = useState<HoveredMeasurement | null>(
		null,
	)
	const isSensorView = matches.some(
		(match) => match.params.deviceId && match.params.sensorId,
	)

	if (!data?.device && !data.sensors) {
		return null
	}

	return (
		<>
			<HoveredPointContext.Provider value={{ hoveredPoint, setHoveredPoint }}>
				{/* Keep the canonical device trips visible while sensors are selected. */}
				{data.device?.exposure === 'mobile' && data.mobileTrips.length > 0 && (
					<MobileOverviewLayer
						key={isSensorView ? 'sensor-view' : 'device-view'}
						trips={data.mobileTrips}
						muted={Boolean(isSensorView)}
					/>
				)}
				<DeviceDetailBox />
				<Outlet />
			</HoveredPointContext.Provider>
		</>
	)
}

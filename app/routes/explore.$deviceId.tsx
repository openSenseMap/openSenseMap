import { useState } from 'react'
import { Outlet, useLoaderData, useMatches } from 'react-router'
import { type Route } from './+types/explore.$deviceId'
import DeviceDetailBox from '~/components/device-detail/device-detail-box'
import { HoveredPointContext } from '~/components/map/layers/mobile/mobile-box-layer'
import MobileOverviewLayer from '~/components/map/layers/mobile/mobile-overview-layer'
import { getDevice } from '~/db/models/device.server'
import { getSensorsWithLastMeasurement } from '~/db/models/sensor.server'
import { categorizeIntoTrips } from '~/lib/mobile-box-helper'
import { getDeviceImageUrl } from '~/lib/s3.server'
import { getLocale } from '~/middleware/i18next'

export async function loader({ context, params, request }: Route.LoaderArgs) {
	const locale = getLocale(context)
	// Extracting the selected sensors from the URL query parameters using the stringToArray function
	const url = new URL(request.url)

	if (!params.deviceId) {
		throw new Response('Device not found', { status: 502 })
	}

	const device = await getDevice({ id: params.deviceId })
	const sensorsWithLastestMeasurement = await getSensorsWithLastMeasurement(
		params.deviceId,
	)

	// get only locations from the last 5 trips
	if (device?.exposure === 'mobile' && device?.locations) {
		// Convert each location's time to ISO string format (explicitly cast time to string)
		const formattedLocations = device.locations.map((location) => ({
			time: String(location.time), // Force it to be a string
			geometry: location.geometry,
		}))

		// Now you can safely pass the formattedLocations to categorizeIntoTrips
		const filteredLocations = categorizeIntoTrips(formattedLocations, 60) // 60 seconds as time threshold

		// get the last time of the 5th trip
		const lastTime =
			filteredLocations[4]?.points[filteredLocations[4].points.length - 1]?.time
		// cut all locations from the device to the last time of the 5th trip
		const cutLocations = device.locations.filter((location) => {
			const locationTime = String(location.time) // Ensure time is treated as a string
			return locationTime <= lastTime
		})
		// set the locations to the device
		device.locations = cutLocations
	}

	// Find all sensors from the device response that have the same id as one of the sensor array value
	const aggregation = url.searchParams.get('aggregation') || 'raw'
	const startDate = url.searchParams.get('date_from') || undefined
	const endDate = url.searchParams.get('date_to') || undefined

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
	const isSensorView = matches[matches.length - 1].params.sensorId
		? true
		: false
	const [hoveredPoint, setHoveredPoint] = useState<number | null>(null)

	if (!data?.device && !data.sensors) {
		return null
	}

	return (
		<>
			<HoveredPointContext.Provider value={{ hoveredPoint, setHoveredPoint }}>
				{/* If the box is mobile, iterate over selected sensors and show trajectory */}
				{data.device?.exposure === 'mobile' &&
					!isSensorView &&
					Array.isArray(data.device?.locations) &&
					data.device.locations.length > 0 && (
						<MobileOverviewLayer
							locations={data.device.locations.map((location) => ({
								time: String(location.time),
								geometry: location.geometry,
							}))}
						/>
					)}
				<DeviceDetailBox />
				<Outlet />
			</HoveredPointContext.Provider>
		</>
	)
}

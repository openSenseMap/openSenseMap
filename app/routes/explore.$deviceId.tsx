import { useState } from 'react'
import {
	Outlet,
	useMatches,
	type ShouldRevalidateFunctionArgs,
} from 'react-router'
import { type Route } from './+types/explore.$deviceId'
import DeviceDetailBox from '~/components/device-detail/device-detail-box'
import { HoveredPointContext } from '~/components/map/layers/mobile/mobile-box-layer'
import MobileOverviewLayer from '~/components/map/layers/mobile/mobile-overview-layer'
import { getDevice } from '~/db/models/device.server'
import { getSensorsWithLastMeasurement } from '~/db/models/sensor.server'
import { categorizeIntoTrips } from '~/lib/mobile-box-helper'
import { getDeviceImageUrl } from '~/lib/s3.server'
import { shouldRevalidateExceptRootPreferences } from '~/lib/root-preference-revalidation'

export function shouldRevalidate(args: ShouldRevalidateFunctionArgs) {
	// The device summary is independent of map filters and chart controls.
	if (
		args.currentParams.deviceId === args.nextParams.deviceId &&
		args.currentUrl.search !== args.nextUrl.search &&
		(!args.formMethod || args.formMethod.toUpperCase() === 'GET')
	) {
		return false
	}

	return shouldRevalidateExceptRootPreferences(args)
}

export async function loader({ params }: Route.LoaderArgs) {
	if (!params.deviceId) {
		throw new Response('Device not found', { status: 502 })
	}

	const [device, sensorsWithLastestMeasurement] = await Promise.all([
		getDevice({ id: params.deviceId, locationLimit: 1000 }),
		getSensorsWithLastMeasurement(params.deviceId),
	])

	// get only locations from the last 5 trips
	if (device?.exposure === 'mobile' && device?.locations) {
		// Convert each location's time to ISO string format (explicitly cast time to string)
		const formattedLocations = device.locations.map((location) => ({
			time: String(location.time), // Force it to be a string
			geometry: location.geometry,
		}))

		// Now you can safely pass the formattedLocations to categorizeIntoTrips
		const filteredLocations = categorizeIntoTrips(formattedLocations, 60) // 60 seconds as time threshold

		// Keep the latest five trips from the bounded location history.
		const firstRecentTripTime = filteredLocations.at(-5)?.points[0]?.time
		if (firstRecentTripTime) {
			const cutoff = new Date(firstRecentTripTime).getTime()
			device.locations = device.locations.filter(
				(location) => new Date(location.time).getTime() >= cutoff,
			)
		}
	}

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
		OSEM_API_URL: process.env.OSEM_API_URL,
	}

	return data
}

// Defining the component that will render the page
export default function DeviceId({ loaderData: data }: Route.ComponentProps) {
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

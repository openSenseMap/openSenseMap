import { useState } from 'react'
import {
	Outlet,
	useMatches,
	type ShouldRevalidateFunctionArgs,
} from 'react-router'
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
import { shouldRevalidateExceptRootPreferences } from '~/lib/root-preference-revalidation'

export function shouldRevalidate(args: ShouldRevalidateFunctionArgs) {
	if (
		args.currentParams.deviceId === args.nextParams.deviceId &&
		args.currentUrl.search !== args.nextUrl.search &&
		(!args.formMethod || args.formMethod.toUpperCase() === 'GET')
	) {
		return (
			args.currentUrl.searchParams.get('date_from') !==
				args.nextUrl.searchParams.get('date_from') ||
			args.currentUrl.searchParams.get('date_to') !==
				args.nextUrl.searchParams.get('date_to')
		)
	}

	return shouldRevalidateExceptRootPreferences(args)
}

export async function loader({ params, request }: Route.LoaderArgs) {
	if (!params.deviceId) {
		throw new Response('Device not found', { status: 502 })
	}

	const { searchParams } = new URL(request.url)
	const dateFrom = searchParams.get('date_from')
	const dateTo = searchParams.get('date_to')
	const start = dateFrom ? new Date(dateFrom) : undefined
	const end = dateTo ? new Date(dateTo) : undefined
	const locationRange =
		start && end && start <= end ? { start, end } : undefined

	const [device, sensorsWithLastestMeasurement] = await Promise.all([
		getDevice({ id: params.deviceId, locationLimit: 1000, locationRange }),
		getSensorsWithLastMeasurement(params.deviceId),
	])

	let mobileTrips: Trip[] = []

	// Both map views use the device's bounded location history for trip boundaries.
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
			locationRange?.start,
			locationRange?.end,
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
		OSEM_API_URL: process.env.OSEM_API_URL,
	}

	return data
}

// Defining the component that will render the page
export default function DeviceId({ loaderData: data }: Route.ComponentProps) {
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

import { useMemo } from 'react'
import { redirect, useRouteLoaderData } from 'react-router'
import { type Route } from './+types/explore.$deviceId.$sensorId.$'
import { type loader as deviceLoader } from './explore.$deviceId'
import Graph from '~/components/device-detail/graph'
import MobileBoxView from '~/components/map/layers/mobile/mobile-box-view'
import { getDeviceExposure } from '~/db/models/device.server'
import {
	getChartMeasurement,
	MAX_CHART_MEASUREMENTS_PER_SENSOR,
} from '~/db/models/measurement.query.server'
import { getSensor } from '~/db/models/sensor.server'
import { type SensorWithMeasurementData } from '~/db/schema'
import { isTimeWithinTrips, type Trip } from '~/lib/mobile-box-helper'
import { shouldRevalidateExceptRootPreferences } from '~/lib/root-preference-revalidation'

export { shouldRevalidateExceptRootPreferences as shouldRevalidate }

const EMPTY_TRIPS: Trip[] = []

interface SensorWithColor extends SensorWithMeasurementData {
	color: string
}

type RawMeasurement = {
	locationId?: bigint | null
	time: Date | null
	value: number | null
	location?: {
		id: bigint
		x: number
		y: number
	} | null
}

function prepareSensorData(
	measurements: RawMeasurement[],
	sensorId: string,
): SensorWithMeasurementData['data'] {
	return measurements
		.slice(0, MAX_CHART_MEASUREMENTS_PER_SENSOR)
		.map((measurement) => ({
			...measurement,
			sensorId,
			locationId:
				measurement.locationId == null ? null : Number(measurement.locationId),
			location: measurement.location
				? {
						...measurement.location,
						id: Number(measurement.location.id),
					}
				: null,
		}))
}

export async function loader({ params, request }: Route.LoaderArgs) {
	const { deviceId, sensorId } = params
	const sensorId2 = params['*']

	if (!deviceId) {
		return redirect('/explore')
	}

	const device = await getDeviceExposure({ id: deviceId })

	if (!device) {
		return redirect('/explore')
	}

	const url = new URL(request.url)
	const aggregation = url.searchParams.get('aggregation') || 'raw'
	const startDate = url.searchParams.get('date_from')
	const endDate = url.searchParams.get('date_to')
	const start = startDate ? new Date(startDate) : undefined
	const end = endDate ? new Date(endDate) : undefined

	if (!sensorId) {
		throw new Response('Sensor 1 not found', { status: 404 })
	}

	const sensor1 = (await getSensor(sensorId)) as SensorWithColor
	const sensor1Data = await getChartMeasurement(
		sensorId,
		aggregation,
		start,
		end,
	)
	let sensor2: SensorWithColor | null = null
	let sensor2Data: Awaited<ReturnType<typeof getChartMeasurement>> | null = null

	if (sensorId2) {
		sensor2 = (await getSensor(sensorId2)) as SensorWithColor
		sensor2Data = await getChartMeasurement(sensorId2, aggregation, start, end)
	}

	const limitExceeded =
		sensor1Data.length > MAX_CHART_MEASUREMENTS_PER_SENSOR ||
		(sensor2Data?.length ?? 0) > MAX_CHART_MEASUREMENTS_PER_SENSOR
	const showingLatestOnly =
		limitExceeded && aggregation === 'raw' && !startDate && !endDate

	// A selected range must never show a partial chart as though it were complete.
	const hideMeasurements = limitExceeded && !showingLatestOnly
	sensor1.data = hideMeasurements
		? []
		: prepareSensorData(sensor1Data, sensorId)
	sensor1.color = sensor1.color || '#8da0cb'

	if (sensor2 && sensorId2 && sensor2Data) {
		sensor2.data = hideMeasurements
			? []
			: prepareSensorData(sensor2Data, sensorId2)
		sensor2.color = sensor2.color || '#fc8d62'
	}

	return {
		device,
		sensors: sensor2 ? [sensor1, sensor2] : [sensor1],
		startDate,
		endDate,
		aggregation,
		limitExceeded,
		showingLatestOnly,
	}
}

export default function SensorView({ loaderData }: Route.ComponentProps) {
	const deviceData = useRouteLoaderData<typeof deviceLoader>(
		'routes/explore.$deviceId',
	)
	const trips = deviceData?.mobileTrips ?? EMPTY_TRIPS
	const { aggregation, device, startDate, endDate } = loaderData
	const isMobile = device.exposure === 'mobile'
	const hasDateRange = Boolean(startDate && endDate)
	const sensors = useMemo(() => {
		// The explicit chart range can exceed the map's location history limit.
		if (
			!isMobile ||
			aggregation !== 'raw' ||
			hasDateRange ||
			trips.length === 0
		) {
			return loaderData.sensors
		}

		return loaderData.sensors.map((sensor) => ({
			...sensor,
			data: sensor.data.filter((measurement) =>
				isTimeWithinTrips(measurement.time, trips),
			),
		}))
	}, [aggregation, hasDateRange, isMobile, loaderData.sensors, trips])

	return (
		<>
			<Graph
				aggregation={aggregation}
				sensors={sensors}
				startDate={startDate ?? undefined}
				endDate={endDate ?? undefined}
				limitExceeded={loaderData.limitExceeded}
				showingLatestOnly={loaderData.showingLatestOnly}
			/>
			{isMobile &&
				(!loaderData.limitExceeded || loaderData.showingLatestOnly) && (
					<MobileBoxView sensors={sensors} trips={trips} />
				)}
		</>
	)
}

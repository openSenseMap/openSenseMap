import moment from 'moment'
import { MapProvider, Marker } from 'react-map-gl/maplibre'
import { NavBar } from '~/components/nav-bar'
import { Badge } from '~/components/ui/badge'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '~/components/ui/card'
import { diffFromCreateDate, getMinuteFormattedString } from '~/utils'
import { BaseMap } from '~/components/base-map'

let deviceData = {
	_id: '5b411d0e5dc1ec001b4f11c8',
	createdAt: '2022-03-30T11:25:43.557Z',
	updatedAt: '2023-10-26T06:28:23.033Z',
	name: 'Bahnhofstraße',
	currentLocation: {
		timestamp: '2018-07-07T20:05:34.723Z',
		coordinates: [7.478471, 52.083515, 3.65],
		type: 'Point',
	},
	exposure: 'outdoor',
	sensors: [
		{
			title: 'PM10',
			unit: 'µg/m³',
			sensorType: 'SDS 011',
			icon: 'osem-cloud',
			_id: '5b411d0e5dc1ec001b4f11cc',
			lastMeasurement: {
				value: '23.73',
				createdAt: '2023-10-13T06:28:23.027Z',
			},
		},
		{
			title: 'PM2.5',
			unit: 'µg/m³',
			sensorType: 'SDS 011',
			icon: 'osem-cloud',
			_id: '5b411d0e5dc1ec001b4f11cb',
			lastMeasurement: {
				value: '20.43',
				createdAt: '2023-10-13T06:28:23.027Z',
			},
		},
		{
			title: 'Temperatur',
			unit: '°C',
			sensorType: 'DHT22',
			icon: 'osem-thermometer',
			_id: '5b411d0e5dc1ec001b4f11ca',
			lastMeasurement: {
				value: '20.80',
				createdAt: '2022-07-12T07:02:41.061Z',
			},
		},
		{
			title: 'rel. Luftfeuchte',
			unit: '%',
			sensorType: 'DHT22',
			icon: 'osem-humidity',
			_id: '5b411d0e5dc1ec001b4f11c9',
			lastMeasurement: {
				value: '99.90',
				createdAt: '2022-07-12T07:02:41.061Z',
			},
		},
	],
	model: 'luftdaten.info',
	description:
		'Mounted at the street side of my house. Traffic: approx. 8.000 vehicles/d',
	image: '5b411d0e5dc1ec001b4f11c8_pblauf.jpg',
	lastMeasurementAt: '2023-10-13T06:28:23.027Z',
	grouptag: [''],
	loc: [
		{
			geometry: {
				timestamp: '2018-07-07T20:05:34.723Z',
				coordinates: [7.478471, 52.083515, 3.65],
				type: 'Point',
			},
			type: 'Feature',
		},
	],
}

//**********************************
export default function DeviceDashboard() {
	//* map marker
	const marker = {
		longitude: deviceData.currentLocation.coordinates[0],
		latitude: deviceData.currentLocation.coordinates[1],
	}

	return (
		<div className="space-y-6 px-4 pb-16 tracking-wide sm:px-6 lg:px-10">
			<NavBar />

			{/* Left side - device info */}
			<div className="grid grid-cols-1 gap-4 lg:h-[85vh] lg:grid-cols-4">
				<Card className="min-w-0 lg:col-span-1 lg:overflow-y-auto dark:border-[#ffffff] dark:bg-black">
					<CardHeader className="space-y-0 p-4 pb-0">
						<CardTitle className="truncate text-[18px]" title={deviceData.name}>
							{deviceData.name}
						</CardTitle>
						<CardDescription className="break-all">
							{deviceData._id}
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4 p-4">
						{/* properties */}
						<div className="flex flex-wrap gap-x-3 gap-y-2 text-[11px] font-semibold tracking-wider">
							<Badge variant="outline" className="rounded-sm">
								{deviceData.exposure.toUpperCase()}
							</Badge>

							<Badge
								variant="outline"
								className="rounded-sm"
							>{`${deviceData.sensors.length} SENSOR(S)`}</Badge>

							<Badge variant="outline" className="rounded-sm">
								{/* Created {deviceData.createdAt.slice(0, 10)} */}
								{diffFromCreateDate(deviceData.createdAt)}
							</Badge>

							{moment().diff(moment(deviceData.updatedAt), 'days') > 3 ? (
								<Badge
									variant="outline"
									className="rounded-sm bg-red-500 text-white"
								>
									INACTIVE
								</Badge>
							) : (
								<Badge
									variant="outline"
									className={
										'rounded-sm border-[#4eaf47] bg-[#4eaf47] text-white'
									}
								>
									ACTIVE
								</Badge>
							)}
						</div>

						{/* image */}
						<div className="rounded-md border p-1">
							<div className="overflow-hidden rounded">
								<img
									src={
										'https://opensensemap.org/userimages/5b411d0e5dc1ec001b4f11c8_pblauf.jpg'
									}
									alt={'name'}
									width={250}
									height={330}
									className="h-auto w-full object-cover transition-all hover:scale-105"
								/>
							</div>
							<p className="pt-1 text-xs">
								Mounted at the street side of my house. Traffic: approx. 8.000
								vehicles/d
							</p>
						</div>

						{/* Map view */}
						<div className="block">
							<MapProvider>
								<BaseMap
									initialViewState={{
										latitude: marker.latitude,
										longitude: marker.longitude,
										zoom: 14,
									}}
									style={{
										width: '100%',
										height: '200px',
										borderRadius: '6px',
									}}
								>
									<Marker
										longitude={marker.longitude}
										latitude={marker.latitude}
									></Marker>
								</BaseMap>
							</MapProvider>
						</div>
					</CardContent>
				</Card>

				{/* Right side - measurements */}
				<Card className="min-w-0 lg:col-span-3 lg:overflow-y-auto dark:border-[#ffffff] dark:bg-black">
					<CardContent>
						<div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
							{deviceData.sensors.map((sensor: any) => (
								<Card
									key={sensor._id}
									className="rounded-3xl dark:border-[#ffffff] dark:bg-black"
								>
									<CardHeader>
										<CardTitle className="mb-2">
											<sensor.icon className="mr-2 inline h-5.5 w-5.5 align-bottom" />
											{sensor.lastMeasurement.value} {sensor.unit}
										</CardTitle>
										<CardDescription>
											<span className="align-bottom text-[18px]">
												{sensor.title}{' '}
											</span>
											<span className="rounded border px-[2px] py-px text-xs">
												{sensor.sensorType}
											</span>
										</CardDescription>
									</CardHeader>
									<CardContent className="m-0 p-0">
										<hr className="h-px w-full border-0 bg-[#dcdada] dark:border-[#ffffff] dark:bg-gray-700" />
										{/* <p className="py-2 px-6 text-[#fa5252] text-xs">5 minutes ago</p> */}
										{sensor.lastMeasurement?.createdAt === undefined ||
										moment().diff(
											moment(sensor.lastMeasurement.createdAt),
											'hours',
										) > 25 ? (
											<p className="px-6 py-2 text-xs text-[#fa5252]">
												INACTIVE
											</p>
										) : (
											<p className="px-6 py-2 text-xs text-[#fa5252]">
												{getMinuteFormattedString(
													sensor.lastMeasurement.createdAt,
												)}
											</p>
										)}
									</CardContent>
								</Card>
							))}
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	)
}

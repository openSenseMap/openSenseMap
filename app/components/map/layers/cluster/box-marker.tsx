import { AnimatePresence, motion } from 'framer-motion'
import { Box, Rocket } from 'lucide-react'
import { useState } from 'react'
import { type MarkerProps, Marker, useMap } from 'react-map-gl/maplibre'
import { useMatches, useNavigate, useSearchParams } from 'react-router'
import { useGlobalCompareMode } from '~/components/device-detail/useGlobalCompareMode'
import { type Device } from '~/db/schema'
import { validLngLat } from '~/lib/location'
import { cn } from '~/lib/utils'

interface BoxMarkerProps extends MarkerProps {
	device: Device
}

const getStatusColor = (device: Device) => {
	if (device.status === 'active') {
		if (device.exposure === 'mobile') {
			return 'bg-blue-100'
		}
		return 'bg-green-300'
	} else if (device.status === 'inactive') {
		return 'bg-gray-100'
	} else {
		return 'bg-gray-100 opacity-50'
	}
}

export default function BoxMarker({ device, ...props }: BoxMarkerProps) {
	const navigate = useNavigate()
	const matches = useMatches()
	const { osem } = useMap()
	const [compareMode, setCompareMode] = useGlobalCompareMode()

	const isFullZoom = osem && osem?.getZoom() >= 14

	const [isHovered, setIsHovered] = useState(false)
	const [searchParams] = useSearchParams()

	// calculate zIndex based on device status and hover
	const getZIndex = () => {
		if (isHovered) {
			return 30
		}
		// priority to active devices
		if (device.status === 'active') {
			return 20
		}
		if (device.status === 'inactive') {
			return 10
		}

		return 0
	}

	if (!validLngLat(props.longitude, props.latitude)) return null

	return (
		<Marker
			{...props}
			style={{
				zIndex: getZIndex(),
			}}
		>
			<AnimatePresence mode="popLayout">
				<motion.div
					className={cn(
						'group absolute flex w-fit cursor-pointer items-center rounded-full bg-white p-1 text-sm shadow-sm hover:z-10 hover:shadow-lg',
						isFullZoom ? '-top-5 -left-5' : '-top-3.75 -left-3.75',
					)}
					onClick={() => {
						if (searchParams.has('sensor')) {
							searchParams.delete('sensor')
						}
						if (compareMode) {
							void navigate(
								`/explore/${matches[2].params.deviceId}/compare/${device.id}`,
							)
							setCompareMode(false)
							return
						}
						void navigate({
							pathname: `${device.id}`,
							search: searchParams.toString(),
						})
					}}
					onHoverStart={() => setIsHovered(true)}
					onHoverEnd={() => setIsHovered(false)}
				>
					<span
						className={cn(
							'relative rounded-full transition-colors',
							`${getStatusColor(device)} p-1`,
						)}
					>
						{device.exposure === 'mobile' ? (
							<Rocket className="h-4 w-4 text-black" />
						) : (
							<Box className="h-4 w-4 text-black" />
						)}
						{device.status === 'active' ? (
							<div
								className={cn(
									'absolute top-0 left-0 h-full w-full animate-ping rounded-full opacity-50',
									getStatusColor(device),
								)}
							/>
						) : null}
					</span>
					{isFullZoom ? (
						<motion.span
							layoutId={device.id}
							className="max-w-[100px] overflow-hidden px-1 text-ellipsis whitespace-nowrap text-black group-hover:max-w-fit group-hover:overflow-auto"
							initial={{ opacity: 0, translateX: -20 }}
							animate={{ opacity: 1, translateX: 0 }}
							exit={{ opacity: 0, translateX: -20 }}
						>
							{device.name}
						</motion.span>
					) : null}
				</motion.div>
			</AnimatePresence>
		</Marker>
	)
}

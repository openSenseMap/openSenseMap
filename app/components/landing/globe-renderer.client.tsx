'use client'

import { type ComponentRef, useEffect, useMemo, useRef } from 'react'
import Globe from 'react-globe.gl'
import { type LandingGlobeDevice } from './globe'

interface InteractiveGlobeProps {
	isActive: boolean
	latestDevices: LandingGlobeDevice[]
}

const colorInterpolator = (t: number) =>
	`rgba(${50 + Math.floor(t * 50)}, ${100 + Math.floor(t * 100)}, 255, ${Math.sqrt(1 - t)})`

export default function InteractiveGlobe({
	isActive,
	latestDevices,
}: InteractiveGlobeProps) {
	const globeEl = useRef<ComponentRef<typeof Globe>>(undefined)
	const sensorData = useMemo(
		() =>
			latestDevices.map((device) => ({
				lat: device.latitude,
				lng: device.longitude,
				maxR: 10,
				propagationSpeed: 5,
				repeatPeriod: 1000,
			})),
		[latestDevices],
	)

	useEffect(() => {
		const globe = globeEl.current
		if (!globe) return

		const controls = globe.controls()
		controls.autoRotate = isActive
		controls.autoRotateSpeed = 1
		controls.enableZoom = false

		if (isActive) {
			globe.resumeAnimation()
		} else {
			globe.pauseAnimation()
		}

		return () => {
			globe.pauseAnimation()
		}
	}, [isActive])

	return (
		<Globe
			ref={globeEl}
			backgroundColor="rgba(0, 0, 0, 0)"
			bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
			globeImageUrl="//unpkg.com/three-globe/example/img/earth-day.jpg"
			height={500}
			ringColor={() => colorInterpolator}
			ringMaxRadius="maxR"
			ringPropagationSpeed="propagationSpeed"
			ringRepeatPeriod="repeatPeriod"
			ringsData={sensorData}
			width={500}
		/>
	)
}

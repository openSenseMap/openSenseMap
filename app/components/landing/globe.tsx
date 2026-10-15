import {
	Component,
	lazy,
	Suspense,
	type ReactNode,
	useEffect,
	useRef,
	useState,
} from 'react'

const InteractiveGlobe = lazy(() => import('./globe-renderer.client'))

export interface LandingGlobeDevice {
	id: string
	name: string
	latitude: number
	longitude: number
}

interface GlobeComponentProps {
	latestDevices: LandingGlobeDevice[]
}

interface NetworkConnection extends EventTarget {
	saveData?: boolean
}

const supportsWebGl = () => {
	try {
		const canvas = document.createElement('canvas')
		const context = canvas.getContext('webgl2') ?? canvas.getContext('webgl')
		context?.getExtension('WEBGL_lose_context')?.loseContext()
		return Boolean(context)
	} catch {
		return false
	}
}

const getNetworkConnection = () =>
	(
		navigator as Navigator & {
			connection?: NetworkConnection
		}
	).connection

const StaticGlobe = ({ latestDevices }: GlobeComponentProps) => {
	const visibleDevices = latestDevices
		.filter(({ latitude, longitude }) => {
			return (
				Number.isFinite(latitude) &&
				Number.isFinite(longitude) &&
				Math.abs(latitude) <= 90 &&
				Math.abs(longitude) <= 90
			)
		})
		.slice(0, 12)

	return (
		<svg
			aria-hidden="true"
			className="h-auto w-full max-w-125"
			viewBox="0 0 500 500"
		>
			<defs>
				<radialGradient id="landing-globe-ocean" cx="35%" cy="28%">
					<stop offset="0%" stopColor="#78c7f0" />
					<stop offset="72%" stopColor="#2278b5" />
					<stop offset="100%" stopColor="#16466f" />
				</radialGradient>
				<clipPath id="landing-globe-clip">
					<circle cx="250" cy="250" r="205" />
				</clipPath>
			</defs>
			<circle
				cx="250"
				cy="250"
				fill="url(#landing-globe-ocean)"
				r="205"
				stroke="#94d2f4"
				strokeWidth="2"
			/>
			<g
				clipPath="url(#landing-globe-clip)"
				fill="none"
				opacity="0.22"
				stroke="#d8f1ff"
				strokeWidth="2"
			>
				<ellipse cx="250" cy="250" rx="110" ry="205" />
				<ellipse cx="250" cy="250" rx="178" ry="205" />
				<ellipse cx="250" cy="250" rx="205" ry="72" />
				<ellipse cx="250" cy="250" rx="205" ry="145" />
			</g>
			<g clipPath="url(#landing-globe-clip)" fill="#7fc87a" opacity="0.92">
				<path d="M105 151l37-38 48-16 31 20 24-7 31 23-11 34-34 8-18 31-35 5-18-24-42-8z" />
				<path d="M194 230l45-10 34 20 17 36-21 39-9 58-25 31-17-41 8-40-26-34z" />
				<path d="M286 112l58 10 50 35 29 48-33 21-39-13-20 27-45-14-25-40 15-28z" />
				<path d="M351 273l44 7 24 25-14 34-39 11-27-27z" />
			</g>
			<g clipPath="url(#landing-globe-clip)">
				{visibleDevices.map((device) => {
					const latitude = (device.latitude * Math.PI) / 180
					const longitude = (device.longitude * Math.PI) / 180
					const x = 250 + Math.sin(longitude) * Math.cos(latitude) * 190
					const y = 250 - Math.sin(latitude) * 190

					return (
						<g key={device.id}>
							<circle
								cx={x}
								cy={y}
								fill="none"
								r="10"
								stroke="#f2ff64"
								strokeWidth="2"
							/>
							<circle cx={x} cy={y} fill="#f2ff64" r="4" />
						</g>
					)
				})}
			</g>
		</svg>
	)
}

class GlobeErrorBoundary extends Component<
	{ children: ReactNode; fallback: ReactNode },
	{ hasError: boolean }
> {
	state = { hasError: false }

	static getDerivedStateFromError() {
		return { hasError: true }
	}

	render() {
		return this.state.hasError ? this.props.fallback : this.props.children
	}
}

export const GlobeComponent = ({ latestDevices }: GlobeComponentProps) => {
	const containerRef = useRef<HTMLElement>(null)
	const canRenderInteractiveRef = useRef(false)
	const hasBeenNearViewportRef = useRef(false)
	const [canRenderInteractive, setCanRenderInteractive] = useState(false)
	const [isNearViewport, setIsNearViewport] = useState(false)
	const [isPageVisible, setIsPageVisible] = useState(true)
	const [hasRequestedInteractive, setHasRequestedInteractive] = useState(false)

	useEffect(() => {
		const desktop = window.matchMedia('(min-width: 1120px)')
		const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
		const reducedData = window.matchMedia('(prefers-reduced-data: reduce)')
		const connection = getNetworkConnection()
		let webGlSupported: boolean | undefined

		const updateCapability = () => {
			const preferencesAllowInteractive =
				desktop.matches &&
				!reducedMotion.matches &&
				!reducedData.matches &&
				connection?.saveData !== true

			if (preferencesAllowInteractive && webGlSupported === undefined) {
				webGlSupported = supportsWebGl()
			}

			const canRender = preferencesAllowInteractive && webGlSupported === true

			canRenderInteractiveRef.current = canRender
			setCanRenderInteractive(canRender)

			if (!canRender) {
				setHasRequestedInteractive(false)
			}
		}

		updateCapability()
		desktop.addEventListener('change', updateCapability)
		reducedMotion.addEventListener('change', updateCapability)
		reducedData.addEventListener('change', updateCapability)
		connection?.addEventListener('change', updateCapability)

		return () => {
			desktop.removeEventListener('change', updateCapability)
			reducedMotion.removeEventListener('change', updateCapability)
			reducedData.removeEventListener('change', updateCapability)
			connection?.removeEventListener('change', updateCapability)
		}
	}, [])

	useEffect(() => {
		const updateVisibility = () => {
			const isVisible = !document.hidden
			setIsPageVisible(isVisible)

			if (
				isVisible &&
				canRenderInteractiveRef.current &&
				hasBeenNearViewportRef.current
			) {
				setHasRequestedInteractive(true)
			}
		}

		updateVisibility()
		document.addEventListener('visibilitychange', updateVisibility)

		return () =>
			document.removeEventListener('visibilitychange', updateVisibility)
	}, [])

	useEffect(() => {
		if (!canRenderInteractive || !containerRef.current) return

		if (!('IntersectionObserver' in window)) return

		const observer = new IntersectionObserver(
			([entry]) => {
				const isNear = entry?.isIntersecting === true
				setIsNearViewport(isNear)

				if (isNear) {
					hasBeenNearViewportRef.current = true
					if (!document.hidden) setHasRequestedInteractive(true)
				}
			},
			{ rootMargin: '250px 0px' },
		)

		observer.observe(containerRef.current)
		return () => observer.disconnect()
	}, [canRenderInteractive])

	const fallback = <StaticGlobe latestDevices={latestDevices} />
	const deviceCount = latestDevices.length

	return (
		<figure
			ref={containerRef}
			aria-label={`Globe showing ${deviceCount} recently added sensor ${deviceCount === 1 ? 'station' : 'stations'}`}
			className="relative flex size-125 max-w-full items-center justify-center"
			role="img"
		>
			{canRenderInteractive && hasRequestedInteractive ? (
				<GlobeErrorBoundary fallback={fallback}>
					<Suspense fallback={fallback}>
						<div aria-hidden="true">
							<InteractiveGlobe
								isActive={isNearViewport && isPageVisible}
								latestDevices={latestDevices}
							/>
						</div>
					</Suspense>
				</GlobeErrorBoundary>
			) : (
				fallback
			)}
		</figure>
	)
}

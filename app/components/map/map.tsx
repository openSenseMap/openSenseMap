import { forwardRef } from 'react'
import {
	GeolocateControl,
	NavigationControl,
	type MapProps,
	type MapRef,
} from 'react-map-gl/maplibre'
import { BaseMap } from '@/components/base-map'

const Map = forwardRef<MapRef, MapProps>(
	({ children, initialViewState, ...props }, ref) => {
		return (
			<div className="map-space-shell">
				<BaseMap
					id="osem"
					ref={ref}
					initialViewState={
						initialViewState ?? {
							longitude: 7.628202,
							latitude: 51.961563,
							zoom: 2,
						}
					}
					hash={true}
					style={{
						width: '100%',
						height: '100%',
						position: 'fixed',
						top: 0,
						left: 0,
						background: 'transparent',
					}}
					{...props}
				>
					{children}
					<NavigationControl position="bottom-right" showCompass={false} />
					<GeolocateControl
						position="bottom-right"
						positionOptions={{
							enableHighAccuracy: true,
							timeout: 10_000,
						}}
						fitBoundsOptions={{
							maxZoom: 14,
						}}
					/>
				</BaseMap>
			</div>
		)
	},
)

Map.displayName = 'Map'

export default Map

import { forwardRef, useEffect, useCallback, type ForwardedRef } from 'react'
import {
	Map,
	type LayerSpecification,
	type MapInstance,
	type MapProps,
	type MapRef,
	type SkySpecification,
} from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useTranslation } from 'react-i18next'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import { setWorkerUrl } from 'maplibre-gl'

setWorkerUrl(workerUrl)

export const BaseMap = forwardRef<MapRef, MapProps>(
	({ onLoad, ...props }: MapProps, ref: ForwardedRef<MapRef>) => {
		const { i18n } = useTranslation()
		const theme = 'dark'

		const updateMapLanguage = useCallback(
			(map: MapInstance, locale: string) => {
				const skipLayerIds = [
					'shield',
					'road-number',
					'exit',
					'ref',
					'cluster-count-layer',
				]
				const style = map.getStyle()
				if (!style?.layers) return

				const shortLocale = locale.split('-')[0]
				style.layers.forEach((layer: LayerSpecification) => {
					if (!('layout' in layer) || !layer.layout) return

					const layout = layer.layout as Record<string, unknown>
					const textField = layout['text-field']
					if (!textField) return
					if (skipLayerIds.some((id) => layer.id.includes(id))) return

					try {
						map.setLayoutProperty(layer.id, 'text-field', [
							'coalesce',
							['get', `name_${shortLocale}`],
							['get', 'name_en'],
							['get', 'name'],
						])
					} catch {
						// Some layers don't support replacing text-field cleanly.
					}
				})
			},
			[],
		)

		const handleMapLoad = useCallback(
			(event: { target: MapInstance }) => {
				const map = event.target
				updateMapLanguage(map, i18n.language)
				onLoad?.(event as any)
			},
			[i18n.language, onLoad, updateMapLanguage],
		)

		useEffect(() => {
			if (!ref || typeof ref === 'function' || !ref.current) return

			const map = ref.current.getMap()
			if (!map.isStyleLoaded()) return

			updateMapLanguage(map, i18n.language)
		}, [i18n.language, ref, updateMapLanguage])

		return (
			<Map
				ref={ref}
				mapStyle={theme === 'dark' ? DEFAULT_DARK_STYLE : DEFAULT_LIGHT_STYLE}
				minZoom={1.5}
				projection={{ type: 'globe' }}
				dragRotate={false}
				pitchWithRotate={false}
				touchZoomRotate={{ around: 'center' }}
				sky={SKY_DEFINITION}
				onLoad={handleMapLoad}
				{...props}
			/>
		)
	},
)

const DEFAULT_LIGHT_STYLE = 'https://tiles.openfreemap.org/styles/liberty'

const DEFAULT_DARK_STYLE = 'https://tiles.openfreemap.org/styles/liberty'

const SKY_DEFINITION: SkySpecification = {
	'sky-color': '#0b1220',
	'horizon-color': '#7aa2ff',
	'fog-color': '#dfefff',
	'sky-horizon-blend': 0.12,
	'horizon-fog-blend': 0.08,
	'fog-ground-blend': 0.06,
	'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 5, 1, 7, 0],
}

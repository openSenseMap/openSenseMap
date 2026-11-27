import { type LayerProps } from 'react-map-gl/maplibre'
import { type ExpressionSpecification } from 'maplibre-gl'

const expression = <T extends ExpressionSpecification>(value: T) => value

const valueExpression = expression([
	'get',
	'value',
	['object', ['get', 'lastMeasurement', ['object', ['get', 'sensor']]]],
])

const radius = (base: number, low: number, high: number) =>
	expression(['interpolate', ['exponential', base], ['zoom'], 1, low, 22, high])

const phenomenonLayer = (
	circleRadius: ExpressionSpecification,
	stops: Array<[number, string]>,
) =>
	({
		id: 'phenomenon-layer',
		type: 'circle',
		source: 'boxes',
		paint: {
			'circle-opacity': 0.7,
			'circle-radius': circleRadius,
			'circle-color': expression([
				'interpolate',
				['linear'],
				valueExpression,
				...stops.flat(),
			]),
			'circle-stroke-width': 1,
			'circle-stroke-color': 'black',
		},
	}) satisfies LayerProps

export const phenomenonLayers: Record<string, LayerProps> = {
	temperature: phenomenonLayer(radius(2.75, 5, 200), [
		[-10, '#9900cc'],
		[0, '#0000ff'],
		[10, '#0099ff'],
		[20, '#ffff00'],
		[30, '#ff0000'],
	]),

	relative_humidity: phenomenonLayer(radius(1.75, 4, 200), [
		[0, '#9900cc'],
		[25, '#0000ff'],
		[50, '#0099ff'],
		[75, '#ffff00'],
		[100, '#ff0000'],
	]),

	barometric_pressure: phenomenonLayer(radius(1.75, 4, 200), [
		[0, '#9900cc'],
		[25, '#0000ff'],
		[50, '#0099ff'],
		[75, '#ffff00'],
		[100, '#ff0000'],
	]),

	ambient_light: phenomenonLayer(radius(1.75, 4, 200), [
		[0, '#9900cc'],
		[1000, '#0000ff'],
		[2000, '#0099ff'],
		[3000, '#ffff00'],
		[4000, '#ff0000'],
	]),

	ultraviolet_a_light: phenomenonLayer(radius(1.75, 4, 200), [
		[0, '#9900cc'],
		[100, '#0000ff'],
		[200, '#0099ff'],
		[300, '#ffff00'],
		[400, '#ff0000'],
	]),

	pm10_concentration: phenomenonLayer(radius(1.75, 4, 200), [
		[0, '#9900cc'],
		[15, '#0000ff'],
		[30, '#0099ff'],
		[45, '#ffff00'],
		[60, '#ff0000'],
	]),

	pm25: phenomenonLayer(radius(1.75, 4, 200), [
		[0, '#9900cc'],
		[10, '#0000ff'],
		[20, '#0099ff'],
		[30, '#ffff00'],
		[40, '#ff0000'],
	]),
} satisfies Record<string, LayerProps>

export const defaultLayer = phenomenonLayer(radius(1.75, 4, 200), [
	[0, '#9900cc'],
	[25, '#0000ff'],
	[50, '#0099ff'],
	[75, '#ffff00'],
	[100, '#ff0000'],
])

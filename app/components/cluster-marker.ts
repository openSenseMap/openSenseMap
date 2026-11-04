import { type Feature, type Point } from 'geojson'
import { Marker } from 'maplibre-gl'

/** Aggregate properties produced by the clustered GeoJSON source. */
export type ClusterProperties = {
	cluster: true
	cluster_id: number
	point_count: number
	active: number
	inactive: number
	old: number
}

export type ClusterFeature = Feature<Point, ClusterProperties>

const statusColors = {
	active: { color: '#4EAF47', opacity: 1 },
	inactive: { color: '#575757', opacity: 0.85 },
	old: { color: '#9CA3AF', opacity: 0.8 },
} as const

type DonutSegment = {
	count: number
	color: string
	opacity: number
	offset: number
}

/**
 * Builds one annular SVG segment from cumulative counts. The quarter-turn
 * offset starts the donut at 12 o'clock instead of SVG's 3 o'clock origin.
 */
function getDonutPath(
	segment: DonutSegment,
	total: number,
	radius: number,
	innerRadius: number,
) {
	const start = segment.offset / total
	let end = (segment.offset + segment.count) / total

	// SVG arcs cannot draw a complete circle from coincident start/end points.
	if (end - start === 1) end -= 0.00001

	const startAngle = 2 * Math.PI * (start - 0.25)
	const endAngle = 2 * Math.PI * (end - 0.25)
	const startX = Math.cos(startAngle)
	const startY = Math.sin(startAngle)
	const endX = Math.cos(endAngle)
	const endY = Math.sin(endAngle)
	const largeArc = end - start > 0.5 ? 1 : 0

	return [
		`M ${radius + innerRadius * startX} ${radius + innerRadius * startY}`,
		`L ${radius + radius * startX} ${radius + radius * startY}`,
		`A ${radius} ${radius} 0 ${largeArc} 1 ${radius + radius * endX} ${radius + radius * endY}`,
		`L ${radius + innerRadius * endX} ${radius + innerRadius * endY}`,
		`A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${radius + innerRadius * startX} ${radius + innerRadius * startY}`,
	].join(' ')
}

/**
 * Creates an imperative MapLibre marker whose SVG donut shows the active,
 * inactive, and old device distribution for one cluster. MapLibre owns the marker element and repositions it outside React.
 */
export function createClusterMarker({
	clusterFeature,
	ariaLabel,
	onActivate,
}: {
	clusterFeature: ClusterFeature
	ariaLabel: string
	onActivate: () => void
}) {
	const [longitude, latitude] = clusterFeature.geometry.coordinates
	const {
		point_count: pointCount,
		active,
		inactive,
		old,
	} = clusterFeature.properties
	const radius = pointCount >= 1000 ? 36 : pointCount >= 100 ? 20 : 18
	const fontSize = pointCount >= 1000 ? 14 : pointCount >= 100 ? 12 : 10
	const innerRadius = Math.round(radius * 0.7)
	const width = radius * 2
	const segments: DonutSegment[] = [
		{ count: active, ...statusColors.active, offset: 0 },
		{ count: inactive, ...statusColors.inactive, offset: 0 },
		{ count: old, ...statusColors.old, offset: 0 },
	]
	let total = 0

	for (const segment of segments) {
		segment.offset = total
		total += segment.count
	}

	const element = document.createElement('button')
	element.type = 'button'
	element.className = 'osem-cluster-marker'
	element.setAttribute('aria-label', ariaLabel)
	element.innerHTML = `<svg
		width="${width}"
		height="${width}"
		viewBox="0 0 ${width} ${width}"
		text-anchor="middle"
		aria-hidden="true"
		focusable="false"
		style="font: bold ${fontSize}px sans-serif; display: block;"
	>
		${segments
			.filter((segment) => segment.count > 0 && total > 0)
			.map(
				(segment) => `<path
					d="${getDonutPath(segment, total, radius, innerRadius)}"
					fill="${segment.color}"
					fill-opacity="${segment.opacity}"
				/>`,
			)
			.join('')}
		<circle
			cx="${radius}"
			cy="${radius}"
			r="${innerRadius}"
			fill="var(--osem-cluster-background, #091413)"
			stroke="var(--osem-cluster-border, #2a403b)"
			stroke-width="1"
		/>
		<text
			dominant-baseline="central"
			fill="var(--osem-cluster-foreground, #d2d1d0)"
			transform="translate(${radius}, ${radius})"
		>
			${pointCount}
		</text>
	</svg>`

	element.addEventListener('click', (event) => {
		event.stopPropagation()
		onActivate()
	})

	return new Marker({ element, opacityWhenCovered: 0 }).setLngLat([
		longitude,
		latitude,
	])
}

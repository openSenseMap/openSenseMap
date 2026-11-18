import { createMeasurementChartData } from '~/lib/measurement-chart'

const sensor = {
	title: 'Temperature',
	color: '#ff0000',
	data: [
		{
			time: '2025-01-02T10:00:00Z',
			value: '21.456789',
			min_value: 20.004,
			max_value: '22.996',
		},
	],
}

test('aggregated values are rounded to two decimals', () => {
	const { datasets } = createMeasurementChartData([sensor], true)

	expect(datasets.map((dataset) => dataset.data[0].y)).toEqual([
		23, // max: 22.996
		21.46, // avg: 21.456789
		20, // min: 20.004
	])
})

test('raw values are not rounded', () => {
	const { datasets } = createMeasurementChartData([sensor], false)

	expect(datasets[0].data[0].y).toBe(21.456789)
})

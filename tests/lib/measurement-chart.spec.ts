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

test('aggregated midpoint values round up', () => {
	const { datasets } = createMeasurementChartData(
		[
			{
				...sensor,
				data: [
					{
						time: '2025-01-02T10:00:00Z',
						value: '1.005',
						min_value: 0.995,
						max_value: '1.015',
					},
				],
			},
		],
		true,
	)

	expect(datasets.map((dataset) => dataset.data[0].y)).toEqual([
		1.02, // max: 1.015
		1.01, // avg: 1.005
		1, // min: 0.995
	])
})

test('raw values are not rounded', () => {
	const { datasets } = createMeasurementChartData([sensor], false)

	expect(datasets[0].data[0].y).toBe(21.456789)
})

import { decodeMeasurements } from '~/services/decoding-service.server'

const payload = {
	sensordatavalues: [
		{ value_type: 'SPS30_N1', value: '1.0' },
		{ value_type: 'SPS30_N10', value: '2.0' },
	],
}

const nc1 = { id: 'nc1-id', title: 'NC1.0', sensorType: 'SPS30' }
const nc10 = { id: 'nc10-id', title: 'NC10', sensorType: 'SPS30' }

describe('Luftdaten decoding', () => {
	it.each([
		[nc10, nc1],
		[nc1, nc10],
	])(
		'prefers exact aliases independently of sensor order',
		async (...sensors) => {
			const measurements = await decodeMeasurements(payload, {
				contentType: 'luftdaten',
				sensors,
			})

			expect(
				measurements.map(({ sensor_id, value }) => ({ sensor_id, value })),
			).toEqual([
				{ sensor_id: nc1.id, value: 1 },
				{ sensor_id: nc10.id, value: 2 },
			])
		},
	)

	it('uses one timestamp for the complete batch', async () => {
		const measurements = await decodeMeasurements(payload, {
			contentType: 'luftdaten',
			sensors: [nc10, nc1],
		})

		expect(measurements[0].createdAt).toBe(measurements[1].createdAt)
	})

	it('uses substring matching as a legacy fallback', async () => {
		const measurements = await decodeMeasurements(
			{ sensordatavalues: [{ value_type: 'SPS30_N1', value: '1.0' }] },
			{
				contentType: 'luftdaten',
				sensors: [
					{
						id: 'decorated-nc1-id',
						title: 'Particles (NC1.0)',
						sensorType: 'SPS30',
					},
				],
			},
		)

		expect(measurements[0].sensor_id).toBe('decorated-nc1-id')
	})

	it('routes catalog sensors by definition ID after their titles are renamed', async () => {
		const measurements = await decodeMeasurements(payload, {
			contentType: 'luftdaten',
			sensors: [
				{
					id: nc10.id,
					title: 'Large particles outside',
					sensorType: 'SPS30',
					data: { sensorDefinitionId: 'sps30_nc10' },
				},
				{
					id: nc1.id,
					title: 'Small particles outside',
					sensorType: 'SPS30',
					data: { sensorDefinitionId: 'sps30_nc1' },
				},
			],
		})

		expect(measurements.map(({ sensor_id }) => sensor_id)).toEqual([
			nc1.id,
			nc10.id,
		])
	})

	it('does not title-match a catalog sensor with a different definition', async () => {
		await expect(
			decodeMeasurements(
				{ sensordatavalues: [{ value_type: 'SPS30_N1', value: '1.0' }] },
				{
					contentType: 'luftdaten',
					sensors: [
						{
							id: nc10.id,
							title: 'NC1.0',
							sensorType: 'SPS30',
							data: { sensorDefinitionId: 'sps30_nc10' },
						},
					],
				},
			),
		).rejects.toThrow('No applicable values found')
	})

	it.each([
		['bme280_pressure_pa', 101517.36],
		['bme280_pressure_hpa', 1015.1736],
	])(
		'applies the catalog multiplier for %s',
		async (sensorDefinitionId, expectedValue) => {
			const measurements = await decodeMeasurements(
				{
					sensordatavalues: [
						{ value_type: 'BME280_pressure', value: '101517.36' },
					],
				},
				{
					contentType: 'luftdaten',
					sensors: [
						{
							id: 'pressure-id',
							title: 'Pressure outside',
							sensorType: 'BME280',
							data: { sensorDefinitionId },
						},
					],
				},
			)

			expect(measurements[0].value).toBeCloseTo(expectedValue)
		},
	)

	it('keeps the first value when multiple values resolve to one sensor', async () => {
		const measurements = await decodeMeasurements(
			{
				sensordatavalues: [
					{ value_type: 'SPS30_N1', value: '1.0' },
					{ value_type: 'SPS30_N1', value: '2.0' },
				],
			},
			{ contentType: 'luftdaten', sensors: [nc1] },
		)

		expect(measurements).toHaveLength(1)
		expect(measurements[0]).toMatchObject({ sensor_id: nc1.id, value: 1 })
	})

	it('skips ambiguous legacy mappings but preserves other values', async () => {
		const measurements = await decodeMeasurements(payload, {
			contentType: 'luftdaten',
			sensors: [nc1, { ...nc1, id: 'other-nc1-id' }, nc10],
		})

		expect(measurements).toHaveLength(1)
		expect(measurements[0]).toMatchObject({ sensor_id: nc10.id, value: 2 })
	})

	it('rejects when every mapping is ambiguous', async () => {
		await expect(
			decodeMeasurements(
				{ sensordatavalues: [{ value_type: 'SPS30_N1', value: '1.0' }] },
				{
					contentType: 'luftdaten',
					sensors: [nc1, { ...nc1, id: 'other-nc1-id' }],
				},
			),
		).rejects.toThrow('No applicable values found')
	})

	it('skips ambiguous definition mappings but preserves other values', async () => {
		const measurements = await decodeMeasurements(payload, {
			contentType: 'luftdaten',
			sensors: [
				{
					...nc1,
					data: { sensorDefinitionId: 'sps30_nc1' },
				},
				{
					...nc1,
					id: 'other-nc1-id',
					data: { sensorDefinitionId: 'sps30_nc1' },
				},
				{
					...nc10,
					data: { sensorDefinitionId: 'sps30_nc10' },
				},
			],
		})

		expect(measurements).toHaveLength(1)
		expect(measurements[0]).toMatchObject({ sensor_id: nc10.id, value: 2 })
	})
})

import { decodeMeasurements } from '~/services/decoding-service.server'

const payload = { reading: { pm10: '10.1' } }
const pm10 = { id: 'pm10-id', title: 'PM10' }
const overlappingTitle = { id: 'pm1-id', title: 'Outdoor PM1 sensor' }

describe('hackAIR decoding', () => {
	it.each([
		[overlappingTitle, pm10],
		[pm10, overlappingTitle],
	])(
		'prefers exact aliases independently of sensor order',
		async (...sensors) => {
			const measurements = await decodeMeasurements(payload, {
				contentType: 'hackair',
				sensors,
			})

			expect(measurements).toHaveLength(1)
			expect(measurements[0]).toMatchObject({
				sensor_id: pm10.id,
				value: 10.1,
			})
		},
	)

	it('skips ambiguous mappings but preserves other readings', async () => {
		const measurements = await decodeMeasurements(
			{ reading: { pm10: '10.1', temperature: '21.5' } },
			{
				contentType: 'hackair',
				sensors: [
					pm10,
					{ ...pm10, id: 'other-pm10-id' },
					{ id: 'temperature-id', title: 'Temperatur' },
				],
			},
		)

		expect(measurements).toHaveLength(1)
		expect(measurements[0]).toMatchObject({
			sensor_id: 'temperature-id',
			value: 21.5,
		})
	})

	it('rejects when every mapping is ambiguous', async () => {
		await expect(
			decodeMeasurements(payload, {
				contentType: 'hackair',
				sensors: [pm10, { ...pm10, id: 'other-pm10-id' }],
			}),
		).rejects.toThrow('No applicable values found')
	})

	it('uses a unique substring match as a legacy fallback', async () => {
		const measurements = await decodeMeasurements(payload, {
			contentType: 'hackair',
			sensors: [{ id: 'decorated-pm10-id', title: 'Outdoor PM10 sensor' }],
		})

		expect(measurements[0].sensor_id).toBe('decorated-pm10-id')
	})
})

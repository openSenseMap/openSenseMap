import {
	deviceLocationInputSchema,
	parseDeviceLocationInputFormData,
	validateDeviceLocationInputFieldErrors,
} from '~/lib/location'

function locationFormData(height?: string) {
	const formData = new FormData()
	formData.set('latitude', '51.969')
	formData.set('longitude', '7.596')

	if (height !== undefined) formData.set('heightAboveGround', height)

	return formData
}

describe('device location height validation', () => {
	it.each([undefined, ''])(
		'accepts an optional blank height (%s)',
		(height) => {
			const result = parseDeviceLocationInputFormData(locationFormData(height))

			expect(result.success).toBe(true)
			if (!result.success) return

			expect(result.data).toEqual({
				latitude: 51.969,
				longitude: 7.596,
				heightAboveGround: undefined,
			})
		},
	)

	it.each([
		['zero', '0', 0],
		['negative', '-12.5', -12.5],
		['positive', '123.75', 123.75],
	] as const)('parses a %s height', (_label, input, expected) => {
		const result = parseDeviceLocationInputFormData(locationFormData(input))

		expect(result.success).toBe(true)
		if (!result.success) return

		expect(result.data.heightAboveGround).toBe(expected)
	})

	it.each(['not-a-number', 'Infinity', '-Infinity'])(
		'rejects invalid height %s',
		(height) => {
			const result = parseDeviceLocationInputFormData(locationFormData(height))

			expect(result.success).toBe(false)
			if (result.success) return

			expect(result.errors.heightAboveGround).toBeDefined()
		},
	)

	it('reports height errors through client-side field validation', () => {
		expect(
			validateDeviceLocationInputFieldErrors({
				latitude: 51.969,
				longitude: 7.596,
				heightAboveGround: Number.NaN,
			}),
		).toHaveProperty('heightAboveGround')
	})

	it('normalizes a null height to undefined in the shared form schema', () => {
		expect(
			deviceLocationInputSchema.parse({
				latitude: 51.969,
				longitude: 7.596,
				heightAboveGround: null,
			}),
		).toEqual({
			latitude: 51.969,
			longitude: 7.596,
			heightAboveGround: undefined,
		})
	})
})

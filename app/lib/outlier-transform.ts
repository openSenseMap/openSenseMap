import { mean, median } from 'simple-statistics'
import { type Measurement } from '~/db/schema'

export type TransformedMeasurement<
	TMeasurement extends Measurement = Measurement,
> = TMeasurement & { isOutlier: boolean }

export function transformOutliers<TMeasurement extends Measurement>(
	measurements: TMeasurement[],
	window: number,
	replaceOutlier: boolean,
): TransformedMeasurement<TMeasurement>[] {
	const res: TransformedMeasurement<TMeasurement>[] = []
	const values: number[] = []

	for (let i = 0; i < measurements.length; i++) {
		let current = measurements[i] as TransformedMeasurement<TMeasurement>
		if (current.value === null) continue
		current.isOutlier = false

		if (values.length === window) {
			// We only add non-null values, so all previous measurement values must be non-null
			current.isOutlier = isOutlier(current.value, values)
			if (current.isOutlier && replaceOutlier) current.value = mean(values)

			values.shift()
		}

		values.push(current.value)
		res.push(current)
	}

	return res
}

function isOutlier(measurement: number, otherMeasurements: number[]): boolean {
	const med = median(otherMeasurements)

	// compute the medianAbsoluteDeviation
	// The mad of nothing is null
	const medianAbsoluteDeviations: number[] = []

	// Make a list of absolute deviations from the median
	for (let i = 0; i < otherMeasurements.length; i++)
		medianAbsoluteDeviations.push(Math.abs(otherMeasurements[i] - med))

	// Find the median value of that list
	const mad = median(medianAbsoluteDeviations),
		max = med + 3 * mad, //3 times medianAbsoluteDeviation around median best solution to check for outliers (see bachelor thesis Joana Gockel)
		min = med - 3 * mad

	return measurement > max || measurement < min
}

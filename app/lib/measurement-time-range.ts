type ParameterSource = {
	get(name: string): FormDataEntryValue | string | null
}

export type MeasurementTimeRange = {
	from: Date
	to: Date
}

export class MeasurementTimeRangeError extends Error {
	constructor(message: string) {
		super(message)
		this.name = 'MeasurementTimeRangeError'
	}
}

function getString(source: ParameterSource, name: string) {
	const value = source.get(name)
	return typeof value === 'string' ? value : null
}

function parseUtcDate(value: string, name: string) {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
	if (!match)
		throw new MeasurementTimeRangeError(`${name} must be a valid date.`)

	const [, yearValue, monthValue, dayValue] = match
	const year = Number(yearValue)
	const month = Number(monthValue)
	const day = Number(dayValue)
	const date = new Date(Date.UTC(year, month - 1, day))

	if (
		date.getUTCFullYear() !== year ||
		date.getUTCMonth() !== month - 1 ||
		date.getUTCDate() !== day
	) {
		throw new MeasurementTimeRangeError(`${name} must be a valid date.`)
	}

	return date
}

function parseIsoDate(value: string, name: string) {
	const date = new Date(value)
	if (Number.isNaN(date.getTime())) {
		throw new MeasurementTimeRangeError(`${name} must be a valid date.`)
	}
	return date
}

function addUtcDays(date: Date, days: number) {
	const next = new Date(date)
	next.setUTCDate(next.getUTCDate() + days)
	return next
}

/**
 * Parse map date filters using UTC day boundaries.
 *
 * Map navigation is intentionally permissive because the URL can temporarily
 * contain an incomplete filter while controls are changing. Export requests set
 * `strict` so an incomplete range cannot accidentally download all history.
 */
export function getMeasurementTimeRangeFromSearchParams(
	searchParams: ParameterSource,
	{ strict = false }: { strict?: boolean } = {},
): MeasurementTimeRange | undefined {
	try {
		const normalizedFrom = getString(searchParams, 'fromDate')
		const normalizedTo = getString(searchParams, 'toDate')

		if (normalizedFrom || normalizedTo) {
			if (!normalizedFrom || !normalizedTo) {
				throw new MeasurementTimeRangeError(
					'Both fromDate and toDate are required.',
				)
			}

			const from = parseIsoDate(normalizedFrom, 'fromDate')
			const to = parseIsoDate(normalizedTo, 'toDate')
			if (from > to) {
				throw new MeasurementTimeRangeError(
					'fromDate must not be after toDate.',
				)
			}
			return { from, to }
		}

		const timeMode = getString(searchParams, 'timeMode')

		if (timeMode === 'pointintime') {
			const value = getString(searchParams, 'date')
			if (!value) {
				throw new MeasurementTimeRangeError(
					'date is required for a point-in-time export.',
				)
			}

			const from = parseUtcDate(value, 'date')
			return { from, to: addUtcDays(from, 1) }
		}

		if (timeMode === 'timeperiod') {
			const fromValue = getString(searchParams, 'from')
			const toValue = getString(searchParams, 'to')
			if (!fromValue || !toValue) {
				throw new MeasurementTimeRangeError(
					'from and to are required for a time-period export.',
				)
			}

			const from = parseUtcDate(fromValue, 'from')
			const toDay = parseUtcDate(toValue, 'to')
			if (from > toDay) {
				throw new MeasurementTimeRangeError('from must not be after to.')
			}
			return { from, to: addUtcDays(toDay, 1) }
		}

		return undefined
	} catch (error) {
		if (strict || !(error instanceof MeasurementTimeRangeError)) throw error
		return undefined
	}
}

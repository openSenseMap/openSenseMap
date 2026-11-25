import {
	endOfMonth,
	endOfWeek,
	endOfYesterday,
	startOfMonth,
	startOfToday,
	startOfWeek,
	startOfYesterday,
	sub,
	type Locale,
} from 'date-fns'

type DateTimeRangeId =
	| 'last-30-minutes'
	| 'last-1-hour'
	| 'last-6-hours'
	| 'last-12-hours'
	| 'last-24-hours'
	| 'last-7-days'
	| 'last-30-days'
	| 'yesterday'
	| 'previous-week'
	| 'previous-month'
	| 'today-so-far'
	| 'this-week-so-far'
	| 'this-month-so-far'

export type DateTimeRange = {
	id: DateTimeRangeId
	labelKey: `dateRanges.${DateTimeRangeId}`
	convert: () => { from: Date; to: Date }
}

export function getDateTimeRanges(locale?: Locale): DateTimeRange[] {
	return [
		{
			id: 'last-30-minutes',
			labelKey: 'dateRanges.last-30-minutes',
			convert: () => {
				const now = new Date()

				return {
					from: sub(now, { minutes: 30 }),
					to: now,
				}
			},
		},
		{
			id: 'last-1-hour',
			labelKey: 'dateRanges.last-1-hour',
			convert: () => {
				const now = new Date()

				return {
					from: sub(now, { hours: 1 }),
					to: now,
				}
			},
		},
		{
			id: 'last-6-hours',
			labelKey: 'dateRanges.last-6-hours',
			convert: () => {
				const now = new Date()

				return {
					from: sub(now, { hours: 6 }),
					to: now,
				}
			},
		},
		{
			id: 'last-12-hours',
			labelKey: 'dateRanges.last-12-hours',
			convert: () => {
				const now = new Date()

				return {
					from: sub(now, { hours: 12 }),
					to: now,
				}
			},
		},
		{
			id: 'last-24-hours',
			labelKey: 'dateRanges.last-24-hours',
			convert: () => {
				const now = new Date()

				return {
					from: sub(now, { hours: 24 }),
					to: now,
				}
			},
		},
		{
			id: 'last-7-days',
			labelKey: 'dateRanges.last-7-days',
			convert: () => {
				const now = new Date()

				return {
					from: sub(now, { days: 7 }),
					to: now,
				}
			},
		},
		{
			id: 'last-30-days',
			labelKey: 'dateRanges.last-30-days',
			convert: () => {
				const now = new Date()

				return {
					from: sub(now, { days: 30 }),
					to: now,
				}
			},
		},
		{
			id: 'yesterday',
			labelKey: 'dateRanges.yesterday',
			convert: () => ({
				from: startOfYesterday(),
				to: endOfYesterday(),
			}),
		},
		{
			id: 'previous-week',
			labelKey: 'dateRanges.previous-week',
			convert: () => {
				const previousWeek = sub(new Date(), { weeks: 1 })

				return {
					from: startOfWeek(previousWeek, { locale }),
					to: endOfWeek(previousWeek, { locale }),
				}
			},
		},
		{
			id: 'previous-month',
			labelKey: 'dateRanges.previous-month',
			convert: () => {
				const previousMonth = sub(new Date(), { months: 1 })

				return {
					from: startOfMonth(previousMonth),
					to: endOfMonth(previousMonth),
				}
			},
		},
		{
			id: 'today-so-far',
			labelKey: 'dateRanges.today-so-far',
			convert: () => ({
				from: startOfToday(),
				to: new Date(),
			}),
		},
		{
			id: 'this-week-so-far',
			labelKey: 'dateRanges.this-week-so-far',
			convert: () => {
				const now = new Date()

				return {
					from: startOfWeek(now, { locale }),
					to: now,
				}
			},
		},
		{
			id: 'this-month-so-far',
			labelKey: 'dateRanges.this-month-so-far',
			convert: () => {
				const now = new Date()

				return {
					from: startOfMonth(now),
					to: now,
				}
			},
		},
	]
}

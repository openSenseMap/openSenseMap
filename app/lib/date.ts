const ONE_MINUTE_IN_S = 60
const ONE_HOUR_IN_S = 60 * ONE_MINUTE_IN_S
const ONE_DAY_IN_S = 24 * ONE_HOUR_IN_S
const ONE_WEEK_IN_S = 7 * ONE_DAY_IN_S
const ONE_MONTH_IN_S = 31 * ONE_DAY_IN_S
const ONE_YEAR_IN_S = 365 * ONE_DAY_IN_S

export const dateDiffToNowInWords = (locale: string, date: Date) => {
	const r = new Intl.RelativeTimeFormat(locale)
	const now = new Date()
	const diffInSeconds = Math.round((now.getTime() - date.getTime()) / 1000)
	const absDiffInSeconds = Math.abs(diffInSeconds)

	if (absDiffInSeconds < ONE_MINUTE_IN_S)
		return r.format(-diffInSeconds, 'second')
	if (absDiffInSeconds < ONE_HOUR_IN_S)
		return r.format(-Math.round(diffInSeconds / ONE_MINUTE_IN_S), 'minute')
	if (absDiffInSeconds < ONE_DAY_IN_S)
		return r.format(-Math.round(diffInSeconds / ONE_HOUR_IN_S), 'hour')
	if (absDiffInSeconds < ONE_WEEK_IN_S)
		return r.format(-Math.round(diffInSeconds / ONE_DAY_IN_S), 'day')
	if (absDiffInSeconds < ONE_MONTH_IN_S)
		return r.format(-Math.round(diffInSeconds / ONE_WEEK_IN_S), 'week')
	if (absDiffInSeconds < ONE_YEAR_IN_S)
		return r.format(-Math.round(diffInSeconds / ONE_MONTH_IN_S), 'month')
	return r.format(-Math.round(diffInSeconds / ONE_YEAR_IN_S), 'year')
}

import { format, Locale } from 'date-fns'
import { de, enGB } from 'date-fns/locale'
import { CalendarIcon } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { type DateRange } from '@daypicker/react'
import { useLoaderData, useSearchParams } from 'react-router'

import { Badge } from './ui/badge'
import { Button } from './ui/button'
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from './ui/command'
import { Input } from './ui/input'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'
import { Separator } from './ui/separator'

import { getDateTimeRanges } from '~/lib/date-ranges'
import { type loader } from '~/routes/explore.$deviceId.$sensorId.$'
import { useTranslation } from 'react-i18next'
import { TFunction } from 'i18next'

function formatDateRange(t: TFunction, date?: DateRange) {
	if (!date?.from) return t('pick_range')

	if (date.to) {
		return `${format(date.from, 'LLL dd, y HH:mm')} - ${format(
			date.to,
			'LLL dd, y HH:mm',
		)}`
	}

	return format(date.from, 'LLL dd, y HH:mm')
}

function toDateTimeLocalValue(date?: Date) {
	if (!date) return ''

	return format(date, "yyyy-MM-dd'T'HH:mm")
}

function fromDateTimeLocalValue(value: string) {
	if (!value) return undefined

	const [datePart, timePart] = value.split('T')
	const [year, month, day] = datePart.split('-').map(Number)
	const [hours, minutes] = timePart.split(':').map(Number)

	return new Date(year, month - 1, day, hours, minutes)
}

function getInitialDateRange(
	loaderData: ReturnType<typeof useLoaderData<typeof loader>>,
) {
	if (loaderData.startDate || loaderData.endDate) {
		return {
			from: loaderData.startDate ? new Date(loaderData.startDate) : undefined,
			to: loaderData.endDate ? new Date(loaderData.endDate) : undefined,
		}
	}

	const data = loaderData.sensors?.[0]?.data ?? []

	if (data.length === 0) return undefined

	const timestamps = data
		.map((measurement) => new Date(measurement.time!).getTime())
		.filter(Number.isFinite)

	if (timestamps.length === 0) return undefined

	return {
		from: new Date(Math.min(...timestamps)),
		to: new Date(Math.max(...timestamps)),
	}
}

export function DateRangeFilter() {
	const loaderData = useLoaderData<typeof loader>()
	const [searchParams, setSearchParams] = useSearchParams()
	const { t, i18n } = useTranslation('graph')

	const dateFnsLocale: Locale = i18n.language.startsWith('de') ? de : enGB

	const dateTimeRanges = useMemo(() => {
		return getDateTimeRanges(dateFnsLocale)
	}, [dateFnsLocale])

	const [open, setOpen] = useState(false)

	const initialDateRange = useMemo(() => {
		return getInitialDateRange(loaderData)
	}, [loaderData])

	const [date, setDate] = useState<DateRange | undefined>(initialDateRange)

	useEffect(() => {
		setDate(initialDateRange)
	}, [initialDateRange])

	useEffect(() => {
		const down = (e: KeyboardEvent) => {
			if (e.key === 'd' && (e.metaKey || e.ctrlKey)) {
				e.preventDefault()
				setOpen((open) => !open)
			}
		}

		document.addEventListener('keydown', down)

		return () => {
			document.removeEventListener('keydown', down)
		}
	}, [])

	function handleFromChange(value: string) {
		setDate((previousDate) => ({
			from: fromDateTimeLocalValue(value),
			to: previousDate?.to,
		}))
	}

	function handleToChange(value: string) {
		setDate((previousDate) => ({
			from: previousDate?.from,
			to: fromDateTimeLocalValue(value),
		}))
	}

	function applyDateRange() {
		const nextSearchParams = new URLSearchParams(searchParams)

		if (date?.from) {
			nextSearchParams.set('date_from', date.from.toISOString())
		} else {
			nextSearchParams.delete('date_from')
		}

		if (date?.to) {
			nextSearchParams.set('date_to', date.to.toISOString())
		} else {
			nextSearchParams.delete('date_to')
		}

		setSearchParams(nextSearchParams)
		setOpen(false)
	}

	function clearDateRange() {
		setDate(undefined)
	}

	const isInvalidRange = Boolean(date?.from && date?.to && date.from > date.to)

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					size="sm"
					className="no-drag h-8 justify-start gap-2 px-2.5 font-normal"
				>
					<CalendarIcon className="h-4 w-4" />

					<span className="hidden sm:inline">{t('time_range')}</span>

					<Separator orientation="vertical" className="mx-1 h-4" />

					<Badge
						variant="secondary"
						className="max-w-[320px] truncate rounded-sm px-1 font-normal"
					>
						{formatDateRange(t, date)}
					</Badge>
				</Button>
			</PopoverTrigger>

			<PopoverContent
				className="no-drag z-50 w-90 max-w-[calc(100vw-2rem)] p-0"
				align="start"
				side="bottom"
			>
				<div className="flex flex-col rounded-md bg-white text-zinc-950 shadow-md ring-1 ring-zinc-200 dark:bg-zinc-900 dark:text-zinc-50 dark:ring-zinc-700">
					<div className="grid gap-3 p-3">
						<div className="grid gap-1.5">
							<label
								htmlFor="date-from"
								className="text-xs font-medium text-zinc-600 dark:text-zinc-300"
							>
								{t('from')}
							</label>

							<Input
								id="date-from"
								type="datetime-local"
								value={toDateTimeLocalValue(date?.from)}
								onChange={(event) => handleFromChange(event.target.value)}
							/>
						</div>

						<div className="grid gap-1.5">
							<label
								htmlFor="date-to"
								className="text-xs font-medium text-zinc-600 dark:text-zinc-300"
							>
								{t('to')}
							</label>

							<Input
								id="date-to"
								type="datetime-local"
								value={toDateTimeLocalValue(date?.to)}
								onChange={(event) => handleToChange(event.target.value)}
							/>
						</div>

						{isInvalidRange && (
							<p className="text-xs text-red-500">
								{t('start_before_end_error')}
							</p>
						)}
					</div>

					<Separator />

					<Command>
						<CommandInput placeholder={t('search_quick_range')} />

						<CommandList className="max-h-60 overflow-auto">
							<CommandEmpty>{t('time_range_not_found')}</CommandEmpty>

							<CommandGroup>
								{dateTimeRanges.map((dateTimeRange) => {
									const label = t(dateTimeRange.labelKey)

									return (
										<CommandItem
											key={dateTimeRange.id}
											value={label}
											keywords={[dateTimeRange.id]}
											onSelect={() => {
												const timeRange = dateTimeRange.convert()

												setDate({
													from: timeRange.from,
													to: timeRange.to,
												})
											}}
										>
											<span>{label}</span>
										</CommandItem>
									)
								})}
							</CommandGroup>
						</CommandList>
					</Command>

					<div className="flex items-center justify-end gap-2 border-t p-3 dark:border-zinc-700">
						<Button
							variant="ghost"
							size="sm"
							type="button"
							onClick={clearDateRange}
						>
							{t('clear')}
						</Button>

						<Button
							size="sm"
							type="button"
							onClick={applyDateRange}
							disabled={isInvalidRange || (!date?.from && !date?.to)}
						>
							{t('apply')}
						</Button>
					</div>
				</div>
			</PopoverContent>
		</Popover>
	)
}

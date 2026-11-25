'use client'

import * as React from 'react'
import { CalendarIcon } from 'lucide-react'
import { type DateRange } from '@daypicker/react'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Field, FieldLabel } from '@/components/ui/field'
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover'
import { useTranslation } from 'react-i18next'

export function DatePickerWithRange() {
	const { i18n } = useTranslation()
	const [date, setDate] = React.useState<DateRange | undefined>({
		from: new Date(new Date().getFullYear(), 0, 20),
		to: new Date(new Date().getFullYear(), 1, 9),
	})

	const dateTimeFormat = new Intl.DateTimeFormat(i18n.language, {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	})

	return (
		<Field className="mx-auto w-60">
			<FieldLabel htmlFor="date-picker-range">Date Picker Range</FieldLabel>
			<Popover>
				<PopoverTrigger asChild>
					<Button
						variant="outline"
						id="date-picker-range"
						className="justify-start px-2.5 font-normal"
					>
						<CalendarIcon />
						{date?.from ? (
							date.to ? (
								<>
									{dateTimeFormat.format(date.from)} -{' '}
									{dateTimeFormat.format(date.to)}
								</>
							) : (
								dateTimeFormat.format(date.from)
							)
						) : (
							<span>Pick a date</span>
						)}
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-auto p-0" align="start">
					<Calendar
						mode="range"
						defaultMonth={date?.from}
						selected={date}
						onSelect={setDate}
						numberOfMonths={2}
					/>
				</PopoverContent>
			</Popover>
		</Field>
	)
}

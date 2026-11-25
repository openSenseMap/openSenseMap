'use client'

import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from 'lucide-react'
import * as React from 'react'
import { DayPicker } from '@daypicker/react'

import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
	className,
	classNames,
	showOutsideDays = true,
	...props
}: CalendarProps) {
	return (
		<DayPicker
			showOutsideDays={showOutsideDays}
			className={cn('p-3', className)}
			classNames={{
				months: 'flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0',
				month: 'space-y-4',
				month_caption: 'flex justify-center pt-1 relative items-center',
				caption_label: 'text-sm font-medium',
				nav: 'space-x-1 flex items-center',
				button_previous: cn(
					buttonVariants({ variant: 'outline' }),
					'absolute left-1 h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100',
				),
				button_next: cn(
					buttonVariants({ variant: 'outline' }),
					'absolute right-1 h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100',
				),
				month_grid: 'w-full border-collapse space-y-1',
				weekdays: 'flex',
				weekday:
					'text-slate-500 rounded-md w-9 font-normal text-[0.8rem] dark:text-slate-400',
				week: 'flex w-full mt-2',
				day: 'h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-slate-100/50 [&:has([aria-selected])]:bg-slate-100 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20 dark:[&:has([aria-selected].day-outside)]:bg-slate-800/50 dark:[&:has([aria-selected])]:bg-slate-800',
				day_button: cn(
					buttonVariants({ variant: 'ghost' }),
					'h-9 w-9 p-0 font-normal aria-selected:opacity-100',
				),
				range_end: 'day-range-end',
				selected:
					'bg-slate-900 text-slate-50 hover:bg-slate-900 hover:text-slate-50 focus:bg-slate-900 focus:text-slate-50 dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-slate-50 dark:hover:text-slate-900 dark:focus:bg-slate-50 dark:focus:text-slate-900',
				today:
					'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-50',
				outside:
					'day-outside text-slate-500 aria-selected:bg-slate-100/50 aria-selected:text-slate-500 dark:text-slate-400 dark:aria-selected:bg-slate-800/50 dark:aria-selected:text-slate-400',
				disabled: 'text-slate-500 opacity-50 dark:text-slate-400',
				range_middle:
					'aria-selected:bg-slate-100 aria-selected:text-slate-900 dark:aria-selected:bg-slate-800 dark:aria-selected:text-slate-50',
				hidden: 'invisible',
				...classNames,
			}}
			components={{
				Chevron: ({ className, orientation, size, disabled, style }) => {
					const Icon =
						orientation === 'left'
							? ChevronLeft
							: orientation === 'up'
								? ChevronUp
								: orientation === 'down'
									? ChevronDown
									: ChevronRight

					return (
						<Icon
							className={cn('h-4 w-4', disabled && 'opacity-50', className)}
							size={size}
							style={style}
						/>
					)
				},
			}}
			{...props}
		/>
	)
}
Calendar.displayName = 'Calendar'

export { Calendar }

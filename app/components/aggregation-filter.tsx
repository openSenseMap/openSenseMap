import * as SelectPrimitive from '@radix-ui/react-select'
import { Filter } from 'lucide-react'
import { useSearchParams, useSubmit } from 'react-router'
import { Badge } from './ui/badge'

import { Select, SelectContent, SelectItem } from './ui/select'
import { Separator } from './ui/separator'

type Aggregation = {
	value: string
	label: string
}

const aggregations: Aggregation[] = [
	{
		value: 'raw',
		label: 'Raw',
	},
	{
		value: '10m',
		label: '10 Minutes',
	},
	{
		value: '1h',
		label: '1 Hour',
	},
	{
		value: '1d',
		label: '1 Day',
	},
	{
		value: '1m',
		label: '1 Month',
	},
	{
		value: '1y',
		label: '1 Year',
	},
]

export function AggregationFilter() {
	const submit = useSubmit()
	const [searchParams] = useSearchParams()

	const aggregationParam = searchParams.get('aggregation') || 'raw'
	const selectedAggregation = aggregations.find(
		(aggregation) => aggregation.value === aggregationParam,
	)

	return (
		<Select
			value={selectedAggregation?.value}
			onValueChange={(value) => {
				searchParams.set('aggregation', value)
				void submit(searchParams)
			}}
		>
			<SelectPrimitive.Trigger
				className={
					'flex h-10 items-center justify-between bg-transparent text-sm placeholder:text-slate-500 focus:outline-hidden disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:placeholder:text-slate-400'
				}
			>
				<div className="inline-flex h-8 items-center justify-center rounded-md border border-slate-200 bg-white px-2.5 text-sm font-medium whitespace-nowrap ring-offset-white transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:ring-offset-slate-950 dark:hover:bg-slate-800 dark:hover:text-slate-50 dark:focus-visible:ring-slate-300">
					<Filter className="mr-2 h-4 w-4" />
					Aggregation
					<>
						<Separator orientation="vertical" className="h4 mx-2" />
						<Badge variant="secondary" className="rounded-sm px-1 font-normal">
							{selectedAggregation?.label}
						</Badge>
					</>
				</div>
			</SelectPrimitive.Trigger>
			<SelectContent>
				{aggregations.map((aggregation) => (
					<SelectItem key={aggregation.value} value={aggregation.value}>
						{aggregation.label}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	)
}

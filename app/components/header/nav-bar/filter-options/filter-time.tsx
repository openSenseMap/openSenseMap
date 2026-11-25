import { Label } from '~/components/ui/label'
import { ToggleGroup, ToggleGroupItem } from '~/components/ui/toggle-group'
import { Input } from '~/components/ui/input'
import { type TimeFilterState } from '../filter-panel'
import { useTranslation } from 'react-i18next'

interface FilterTimeProps {
	time: TimeFilterState
	onTimeChange: (time: TimeFilterState) => void
}

export default function FilterTime({ time, onTimeChange }: FilterTimeProps) {
	const { t } = useTranslation('filter')
	return (
		<div className="grid gap-1.5 md:grid-cols-[5.5rem_1fr] md:items-start">
			<Label className="pt-2 text-sm text-gray-600 dark:text-zinc-400">
				{t('date_and_time')}
			</Label>

			<div className="space-y-2">
				<ToggleGroup
					type="single"
					variant="gray"
					value={time.mode}
					onValueChange={(mode) => {
						if (!mode) return

						if (mode === 'live') {
							onTimeChange({ mode: 'live' })
						}

						if (mode === 'pointintime') {
							onTimeChange({
								mode: 'pointintime',
								date: time.mode === 'pointintime' ? time.date : undefined,
							})
						}

						if (mode === 'timeperiod') {
							onTimeChange({
								mode: 'timeperiod',
								from: time.mode === 'timeperiod' ? time.from : undefined,
								to: time.mode === 'timeperiod' ? time.to : undefined,
							})
						}
					}}
					className="flex flex-wrap justify-start gap-1"
				>
					<ToggleGroupItem value="live" size="sm">
						Live
					</ToggleGroupItem>

					<ToggleGroupItem value="pointintime" size="sm">
						{t('date')}
					</ToggleGroupItem>

					<ToggleGroupItem value="timeperiod" size="sm">
						{t('timespan')}
					</ToggleGroupItem>
				</ToggleGroup>

				{time.mode === 'pointintime' && (
					<Input
						type="date"
						className="h-8 text-sm"
						value={time.date ?? ''}
						max={new Date().toISOString().slice(0, 10)}
						onChange={(event) => {
							onTimeChange({
								mode: 'pointintime',
								date: event.target.value || undefined,
							})
						}}
					/>
				)}

				{time.mode === 'timeperiod' && (
					<div className="grid gap-2 md:grid-cols-2">
						<Input
							type="date"
							className="h-8 text-sm"
							value={time.from ?? ''}
							max={new Date().toISOString().slice(0, 10)}
							onChange={(event) => {
								onTimeChange({
									mode: 'timeperiod',
									from: event.target.value || undefined,
									to: time.to,
								})
							}}
						/>

						<Input
							type="date"
							className="h-8 text-sm"
							value={time.to ?? ''}
							min={time.from}
							max={new Date().toISOString().slice(0, 10)}
							onChange={(event) => {
								onTimeChange({
									mode: 'timeperiod',
									from: time.from,
									to: event.target.value || undefined,
								})
							}}
						/>
					</div>
				)}
			</div>
		</div>
	)
}

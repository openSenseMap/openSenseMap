import { Label } from '~/components/ui/label'
import { ToggleGroup, ToggleGroupItem } from '~/components/ui/toggle-group'

import { useTranslation } from 'react-i18next'
import {
	type DeviceExposureType,
	type DeviceStatusType,
} from '~/lib/device-enums'

interface FilterOptionsProps {
	exposure: DeviceExposureType[]
	status: DeviceStatusType[]
	onExposureChange: (value: DeviceExposureType[]) => void
	onStatusChange: (value: DeviceStatusType[]) => void
}

function normalizeToggleValues<T extends string>(
	values: string[],
	currentValues: T[],
): T[] {
	if (values.length === 0) {
		return []
	}

	if (values.includes('all')) {
		if (currentValues.length === 0) {
			return values.filter((value) => value !== 'all') as T[]
		}

		return []
	}

	return values as T[]
}

export default function FilterOptions({
	exposure,
	status,
	onExposureChange,
	onStatusChange,
}: FilterOptionsProps) {
	const { t } = useTranslation('filter')
	return (
		<div className="flex flex-col gap-3">
			<div className="grid gap-1.5 md:grid-cols-[5.5rem_1fr] md:items-center">
				<Label className="text-sm text-gray-600 dark:text-zinc-400">
					{t('exposure')}
				</Label>

				<ToggleGroup
					className="flex flex-wrap justify-start gap-1"
					rovingFocus={false}
					type="multiple"
					variant="gray"
					value={exposure.length > 0 ? exposure : ['all']}
					onValueChange={(values) => {
						onExposureChange(
							normalizeToggleValues<DeviceExposureType>(values, exposure),
						)
					}}
				>
					<ToggleGroupItem value="all" aria-label="Toggle all" size="sm">
						{t('all')}
					</ToggleGroupItem>
					<ToggleGroupItem value="indoor" aria-label="Toggle indoor" size="sm">
						{t('indoor')}
					</ToggleGroupItem>
					<ToggleGroupItem
						value="outdoor"
						aria-label="Toggle outdoor"
						size="sm"
					>
						{t('outdoor')}
					</ToggleGroupItem>
					<ToggleGroupItem value="mobile" aria-label="Toggle mobile" size="sm">
						{t('mobile')}
					</ToggleGroupItem>
				</ToggleGroup>
			</div>

			<div className="grid gap-1.5 md:grid-cols-[5.5rem_1fr] md:items-center">
				<Label className="text-sm text-gray-600 dark:text-zinc-400">
					{t('status')}
				</Label>

				<ToggleGroup
					className="flex flex-wrap justify-start gap-1"
					rovingFocus={false}
					type="multiple"
					variant="gray"
					value={status.length > 0 ? status : ['all']}
					onValueChange={(values) => {
						onStatusChange(
							normalizeToggleValues<DeviceStatusType>(values, status),
						)
					}}
				>
					<ToggleGroupItem value="all" aria-label="Toggle all" size="sm">
						{t('all')}
					</ToggleGroupItem>
					<ToggleGroupItem value="active" aria-label="Toggle active" size="sm">
						{t('active')}
					</ToggleGroupItem>
					<ToggleGroupItem
						value="inactive"
						aria-label="Toggle inactive"
						size="sm"
					>
						{t('inactive')}
					</ToggleGroupItem>
					<ToggleGroupItem value="old" aria-label="Toggle old" size="sm">
						{t('old')}
					</ToggleGroupItem>
				</ToggleGroup>
			</div>
		</div>
	)
}

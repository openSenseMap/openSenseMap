import { X } from 'lucide-react'
import { Fragment, useEffect } from 'react'
import { useLoaderData, useNavigate, useSearchParams } from 'react-router'
import { DeviceExposureZodEnum, DeviceStatusZodEnum } from '~/lib/device-enums'
import { type loader } from '~/routes/explore'

const FILTER_KEYS = new Set(['exposure', 'status', 'tags'])

export default function FilterVisualization() {
	const data = useLoaderData<typeof loader>()
	const navigate = useNavigate()
	const [params] = useSearchParams()

	// Validate filter values using the predefined enums
	const isValidFilter = (key: string, value: string) => {
		switch (key) {
			case 'exposure':
				return DeviceExposureZodEnum.safeParse(value).success
			case 'status':
				return DeviceStatusZodEnum.safeParse(value).success
			case 'tags':
				return true // No validation for tags
			default:
				return false // Invalid key
		}
	}

	// Update the search params to remove invalid filters
	const cleanSearchParams = () => {
		let modified = false
		const newParams = new URLSearchParams(params)

		params.forEach((value, key) => {
			if (!FILTER_KEYS.has(key)) return
			const values = value.split(',') // Handle comma-separated values
			const validValues = values.filter((v) => isValidFilter(key, v))

			if (validValues.length === 0) {
				// Remove entire parameter if no valid values
				newParams.delete(key)
				modified = true
			} else if (validValues.length !== values.length) {
				// Update the parameter with only valid values
				newParams.set(key, validValues.join(','))
				modified = true
			}
		})

		if (modified) {
			// Update the URL without reloading the page
			void navigate(`?${newParams.toString()}`, { replace: true })
		}
	}

	// Clean search params when the component mounts
	useEffect(() => {
		cleanSearchParams()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	// Group valid filters by key
	const groupedFilters: { [key: string]: string[] } = {}

	params.forEach((value, key) => {
		if (!FILTER_KEYS.has(key)) return
		const values = value.split(',').filter((v) => isValidFilter(key, v))
		if (values.length > 0) {
			groupedFilters[key] = values // Group valid values under the same key
		}
	})

	// Don't render anything if there are no active valid filters
	if (Object.keys(groupedFilters).length === 0) {
		return null
	}

	const onRemoveFilter = (key: string) => {
		const newParams = new URLSearchParams(params)

		// Set the key to "all" and remove all other values
		newParams.delete(key)

		// Update the URL without reloading the page
		void navigate(`?${newParams.toString()}`, { replace: true })
	}

	return (
		<div className="flex flex-wrap items-center gap-2">
			{Object.entries(groupedFilters).map(([key, values]) => (
				<div
					key={key}
					className="flex items-center rounded-full bg-blue-100 pr-2 text-sm"
				>
					<span className="rounded-l-full bg-blue-100 px-2 py-1 font-medium text-white">
						{key}
					</span>
					<div className="ml-2 flex items-center">
						{values.map((value, index) => (
							<Fragment key={`${key}-${value}`}>
								{index > 0 && <span className="mx-1">/</span>}
								<span className="text-blue-800">{value}</span>
							</Fragment>
						))}
					</div>
					<button
						onClick={() => onRemoveFilter(key)}
						className="ml-2 text-blue-500 hover:text-blue-700 focus:outline-hidden"
						aria-label={`Remove ${key} filter`}
					>
						<X className="text-white" size={14} />
					</button>
				</div>
			))}
			<div className="bg-light-green flex items-center rounded-full pr-2 text-sm">
				<span className="bg-light-green rounded-l-full px-2 py-1 font-medium text-white">
					{'Total Devices: ' + data.filteredDeviceCount}
				</span>
			</div>
		</div>
	)
}

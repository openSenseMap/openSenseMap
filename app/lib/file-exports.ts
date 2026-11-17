import { escapeCSVValue } from '~/lib/csv'

let contentType = ''
let fileName = ''
const formatter = new Intl.DateTimeFormat('en-US', {
	dateStyle: 'full',
	timeStyle: 'short',
})

// function to return CSV data

export const getCSV = (measurements: any, includeFields: any) => {
	contentType = 'text/csv'
	fileName = 'measurements.csv'

	const columns = [
		{ header: 'SensorId', value: (measurement: any) => measurement.sensorId },
		includeFields.title
			? { header: 'Title', value: (measurement: any) => measurement.title }
			: null,
		includeFields.value
			? { header: 'Value', value: (measurement: any) => measurement.value }
			: null,
		includeFields.unit
			? { header: 'Unit', value: (measurement: any) => measurement.unit }
			: null,
		includeFields.timestamp
			? {
					header: 'Timestamp',
					value: (measurement: any) =>
						formatter.format(new Date(measurement.time)),
				}
			: null,
		includeFields.coordinates
			? {
					header: 'Latitude',
					value: (measurement: any) => measurement.location?.y ?? null,
				}
			: null,
		includeFields.coordinates
			? {
					header: 'Longitude',
					value: (measurement: any) => measurement.location?.x ?? null,
				}
			: null,
	].filter(
		(
			column,
		): column is {
			header: string
			value: (measurement: any) => unknown
		} => column !== null,
	)

	const rows = measurements.flatMap((measurementGroup: any[]) =>
		measurementGroup.map((measurement) =>
			columns
				.map((column) => escapeCSVValue(column.value(measurement), ','))
				.join(','),
		),
	)
	const headers = columns
		.map((column) => escapeCSVValue(column.header, ','))
		.join(',')
	const utf8BOM = '\uFEFF'
	const content = utf8BOM + [headers, ...rows].join('\n')

	return { content, fileName, contentType }
}

// function to return JSON data
export const getJSON = (measurements: any, includeFields: any) => {
	let content = ''
	contentType = 'application/json'
	fileName = 'measurements.json'

	// Generate JSON rows
	// Create a properly filtered JSON structure based on includeFields
	const filteredMeasurements: any = []

	measurements.forEach((measureGroup: any) => {
		const groupData: any = []

		measureGroup.forEach((m: any) => {
			// Create an object with only the requested fields
			const filteredItem: any = {}

			// Always include sensorId as it's a key identifier
			filteredItem.sensorId = m.sensorId

			// Add optional fields based on user selection
			if (includeFields.title) filteredItem.title = m.title
			if (includeFields.value) filteredItem.value = m.value
			if (includeFields.unit) filteredItem.unit = m.unit
			if (includeFields.timestamp)
				filteredItem.timestamp = formatter.format(new Date(m.time))
			if (includeFields.coordinates) {
				filteredItem.latitude = m.location?.y ?? null
				filteredItem.longitude = m.location?.x ?? null
			}

			groupData.push(filteredItem)
		})

		if (groupData.length > 0) {
			filteredMeasurements.push(groupData)
		}
	})

	// Pretty-print the JSON with 2-space indentation
	content = JSON.stringify(filteredMeasurements, null, 2)
	return { content, fileName, contentType }
}

// function to return text data

export const getTXT = (measurements: any, includeFields: any) => {
	let content = ''
	let rows = ''
	let textrows: any = []
	fileName = 'measurements.txt'
	contentType = 'text/plain'
	measurements.map((measure: any) => {
		measure.map((m: any) => {
			rows = `SensorId: ${m.sensorId}\n`
			if (includeFields.title) {
				rows += `Title: ${m.title}\n`
			}
			if (includeFields.value) {
				rows += `Value: ${m.value}\n`
			}
			if (includeFields.unit) {
				rows += `Unit: ${m.unit}\n`
			}
			if (includeFields.timestamp) {
				rows += `Timestamp: ${formatter.format(new Date(m.time))}\n`
			}
			if (includeFields.coordinates) {
				rows += `Latitude: ${m.location?.y ?? ''}\n`
				rows += `Longitude: ${m.location?.x ?? ''}\n`
			}
			rows += `\n`
			textrows.push(rows)
		})
	})
	content = textrows.join('\n')
	return { content, fileName, contentType }
}

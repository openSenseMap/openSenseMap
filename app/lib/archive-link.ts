/**
 * Replace german s (ß) with two s
 * @param {*} value string to check
 */
const doubleGermanS = function (value: string) {
	value = value.replace(/[\u00A0-\u10FFFF]/g, '__')

	return value
}

export function getArchiveLink(device: any) {
	const date = new Date()
	date.setDate(date.getDate() - 1)
	const yesterday = date
		.toLocaleDateString('en-GB') // always use en-GB to produce our required date format YYYY-MM-DD
		.split('/')
		.reverse()
		.join('-')
	const normalizedName = doubleGermanS(
		device.name.replace(/[^A-Za-z0-9._-]/g, '_'),
	)

	return `https://archive.opensensemap.org/${yesterday}/${device.id}-${normalizedName}`
}

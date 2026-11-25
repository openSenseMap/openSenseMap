import { createHash } from 'crypto'

export function slugifyDeviceSchemaName(name: string) {
	return (
		name
			.toLowerCase()
			.trim()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '') || 'device-schema'
	)
}

function sortForStableHash(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(sortForStableHash)

	if (value && typeof value === 'object') {
		return Object.fromEntries(
			Object.entries(value)
				.sort(([a], [b]) => a.localeCompare(b))
				.map(([key, val]) => [key, sortForStableHash(val)]),
		)
	}

	return value
}

export function createDeviceSchemaHash(content: unknown) {
	return createHash('sha256')
		.update(JSON.stringify(sortForStableHash(content)))
		.digest('hex')
}

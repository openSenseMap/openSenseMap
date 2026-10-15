export function parseFiniteNumber(value: unknown): number | undefined {
	if (typeof value === 'number') {
		return Number.isFinite(value) ? value : undefined
	}

	if (typeof value !== 'string' || value.trim() === '') {
		return undefined
	}

	const parsed = Number(value)
	return Number.isFinite(parsed) ? parsed : undefined
}

export function formatCount(num: number): string {
	if (num >= 1000000) {
		return `${(num / 1000000).toFixed(1).replace(/\.0$/, '')}M`
	}
	if (num >= 1000) {
		return `${(num / 1000).toFixed(1).replace(/\.0$/, '')}k`
	}
	return num.toString()
}

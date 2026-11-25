type TimingFields = Record<string, string | number | boolean | null | undefined>

export type MeasurementTiming = {
	mark: (name: string, fields?: TimingFields) => void
	finish: (fields?: TimingFields) => void
}

const enabledValues = new Set(['1', 'true', 'yes', 'on'])

export function createMeasurementTiming(
	operation: string,
	fields: TimingFields = {},
): MeasurementTiming | null {
	if (
		!enabledValues.has(
			(process.env.OSEM_MEASUREMENT_TIMING_LOGS ?? '').toLowerCase(),
		)
	) {
		return null
	}

	const thresholdMs = Number(
		process.env.OSEM_MEASUREMENT_TIMING_LOG_THRESHOLD_MS ?? 250,
	)
	const minimumDurationMs = Number.isFinite(thresholdMs) ? thresholdMs : 250
	const startedAt = performance.now()
	let lastMarkAt = startedAt
	const timings: Record<string, number> = {}
	const metadata: TimingFields = {
		operation,
		...fields,
	}

	return {
		mark(name, fields = {}) {
			const now = performance.now()
			timings[`${name}Ms`] = roundDuration(now - lastMarkAt)
			lastMarkAt = now
			Object.assign(metadata, fields)
		},

		finish(fields = {}) {
			const totalMs = roundDuration(performance.now() - startedAt)
			Object.assign(metadata, fields)

			if (totalMs < minimumDurationMs) return

			console.info(
				'[measurement-timing]',
				JSON.stringify({
					...metadata,
					totalMs,
					...timings,
				}),
			)
		},
	}
}

function roundDuration(durationMs: number): number {
	return Math.round(durationMs * 100) / 100
}

function noTimestamps(sensors: { id: string }[]) {
	return sensors.map((sensor, index) => `${sensor.id},${index}`).join('\n')
}

function withTimestamps(sensors: { id: string }[]) {
	return sensors
		.map(
			(sensor, index) =>
				`${sensor.id},${index},${new Date(Date.now() - index * 60_000).toISOString()}`,
		)
		.join('\n')
}

function withTimestampsFuture(sensors: { id: string }[]) {
	return sensors
		.map(
			(sensor, index) =>
				`${sensor.id},${index},${new Date(Date.now() + 90_000 + index * 60_000).toISOString()}`,
		)
		.join('\n')
}

function withTooMany(sensors: { id: string }[]) {
	return sensors
		.map(
			(sensor, index) =>
				`${sensor.id},${index},${new Date(Date.now() + index * 60_000).toISOString()}`,
		)
		.join('\n')
}

function tenDaysAgoMany(sensors: { id: string }[]) {
	const iterations = 5
	const base = Date.now() - 10 * 24 * 60 * 60 * 1000 // 10 days ago in ms
	let rows: string[] = []

	for (let i = 0; i < iterations; i++) {
		const chunk = sensors
			.map((sensor, index) => {
				const timestamp = new Date(base - (index + i) * 60_000).toISOString()
				return `${sensor.id},${index},${timestamp}`
			})
			.join('\n')

		rows.push(chunk)
	}

	return rows.join('\n')
}

export const csvExampleData = {
	noTimestamps,
	withTimestamps,
	withTimestampsFuture,
	withTooMany,
	tenDaysAgoMany,
}

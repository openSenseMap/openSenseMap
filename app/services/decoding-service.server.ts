type SensorLike = {
	id: string
	title?: string
	sensorType?: string
}

const luftdatenMatchings: Record<string, string[]> = {
	p0: ['pm01', 'pm0', 'p1.0', 'p0'],
	p01: ['pm0.1', 'p0.1'],
	p03: ['pm0.3', 'pm03', 'p0.3', 'p03'],
	p05: ['pm0.5', 'pm05', 'p0.5', 'p05'],
	p1: ['pm10', 'p10', 'p1'],
	p2: ['pm2.5', 'pm25', 'p2.5', 'p25', 'p2'],
	p4: ['pm4', 'p4'],
	p5: ['pm5', 'p5'],
	n1: ['nc1.0', 'nc1', 'n1.0', 'n1'],
	n01: ['nc0.1', 'n0.1', 'nc01', 'n01'],
	n03: ['nc0.3', 'n0.3', 'nc03', 'n03'],
	n05: ['nc0.5', 'n0.5', 'nc05', 'n05'],
	n4: ['nc4.0', 'n4.0', 'nc4', 'n4'],
	n5: ['nc5', 'n5'],
	n10: ['nc10', 'n10'],
	n25: ['nc2.5', 'n2.5'],
	co2: ['co2', 'carbon_dioxide', 'kohlendioxid', 'kohlenstoffdioxid'],
	co2_ppm: ['co2', 'carbon_dioxide', 'kohlendioxid', 'kohlenstoffdioxid'],
	temperature: ['temperatur'],
	humidity: ['rel. luftfeuchte', 'luftfeuchtigkeit', 'luftfeuchte'],
	pressure: ['luftdruck', 'druck'],
	signal: ['stärke', 'signal'],
	noise_laeq: ['schallpegel', 'geräuschpegel'],
}

function findLuftdatenSensorId(
	sensors: SensorLike[],
	value_type: string,
): string | undefined {
	if (!value_type) return undefined

	// split at first underscore into sensor type + phenomenon
	const lower = value_type.toLowerCase()
	const splitAtIndex = lower.indexOf('_')

	let vt_sensortype = ''
	let vt_phenomenon = ''

	if (splitAtIndex > 0) {
		vt_sensortype = lower.slice(0, splitAtIndex)
		vt_phenomenon = lower.slice(splitAtIndex + 1)
	} else {
		const parts = lower.split('_')
		vt_sensortype = parts[0] ?? ''
		vt_phenomenon = parts[1] ?? ''
	}

	// special cases
	// DHT11/DHT22: no underscore prefix for temperature/humidity
	if (
		!vt_phenomenon &&
		(vt_sensortype === 'temperature' || vt_sensortype === 'humidity')
	) {
		vt_phenomenon = vt_sensortype
		vt_sensortype = 'dht'
	} else if (!vt_phenomenon && vt_sensortype === 'signal') {
		vt_phenomenon = vt_sensortype
		vt_sensortype = 'wifi'
	}

	if (!luftdatenMatchings[vt_phenomenon]) return undefined

	for (const sensor of sensors) {
		if (!sensor?.id) continue
		if (!sensor.title) continue

		const title = sensor.title.toLowerCase()

		if (sensor.sensorType) {
			const type = sensor.sensorType.toLowerCase()
			if (!type.startsWith(vt_sensortype)) continue
		}

		const aliases = luftdatenMatchings[vt_phenomenon]
		const titleMatches =
			title === vt_phenomenon ||
			aliases.includes(title) ||
			aliases.some((alias) => title.includes(alias))

		if (titleMatches) return sensor.id
	}

	return undefined
}

const hackairMatchings: Record<string, string[]> = {
	pm10: ['pm10', 'p10', 'p1'],
	pm25: ['pm2.5', 'pm25', 'p2.5', 'p25', 'p2'],
	temperature: ['temperatur'],
	humidity: ['rel. luftfeuchte', 'luftfeuchtigkeit', 'luftfeuchte'],
}

function findHackairSensorId(
	sensors: SensorLike[],
	readingKey: string,
): string | undefined {
	if (!readingKey) return undefined

	// Old behavior: use first token before underscore, remove dots
	const [vt_sensortype] = readingKey.toLowerCase().replace('.', '').split('_')

	if (!hackairMatchings[vt_sensortype]) return undefined

	for (const sensor of sensors) {
		if (!sensor?.id) continue
		if (!sensor.title) continue

		const title = sensor.title.toLowerCase()
		const aliases = hackairMatchings[vt_sensortype]

		const titleMatches =
			title === vt_sensortype ||
			aliases.includes(title) ||
			aliases.some((alias) => title.includes(alias))

		if (titleMatches) return sensor.id
	}

	return undefined
}

function parseLocation(
	loc: any,
): { lng: number; lat: number; height?: number } | null {
	if (!loc) return null

	if (Array.isArray(loc)) {
		if (loc.length >= 2) {
			const lng = Number(loc[0])
			const lat = Number(loc[1])

			if (isNaN(lng) || isNaN(lat)) {
				console.warn('Invalid coordinates in array format:', loc)
				return null
			}

			return {
				lng,
				lat,
				height: loc[2] !== undefined ? Number(loc[2]) : undefined,
			}
		}
		return null
	}

	if (typeof loc === 'object' && loc !== null) {
		if (loc.lng !== undefined && loc.lat !== undefined) {
			const lng = Number(loc.lng)
			const lat = Number(loc.lat)

			if (isNaN(lng) || isNaN(lat)) {
				console.warn('Invalid coordinates in object format:', loc)
				return null
			}

			return {
				lng,
				lat,
				height: loc.height !== undefined ? Number(loc.height) : undefined,
			}
		}

		if (loc.longitude !== undefined && loc.latitude !== undefined) {
			const lng = Number(loc.longitude)
			const lat = Number(loc.latitude)

			if (isNaN(lng) || isNaN(lat)) {
				console.warn('Invalid coordinates in longitude/latitude format:', loc)
				return null
			}

			return {
				lng,
				lat,
				height: loc.height !== undefined ? Number(loc.height) : undefined,
			}
		}
	}

	console.warn('Unrecognized location format:', loc)
	return null
}

const decodeHandlers: {
	[key: string]: { decodeMessage: (data: any, options: any) => any[] }
} = {
	'application/json': {
		decodeMessage: (body: any, {}: { sensors: any[] }) => {
			if (Array.isArray(body)) {
				return body.map((measurement) => ({
					sensor_id: measurement.sensor_id ?? measurement.sensor,
					value: parseFloat(measurement.value),
					createdAt: measurement.createdAt
						? new Date(measurement.createdAt)
						: new Date(),
					location: parseLocation(measurement.location),
				}))
			} else {
				return Object.entries(body).map(([sensorId, value]: [string, any]) => {
					let measurementValue, createdAt, location

					if (Array.isArray(value)) {
						measurementValue = parseFloat(value[0])
						createdAt = value[1] ? new Date(value[1]) : new Date()
						location = parseLocation(value[2])
					} else {
						measurementValue = parseFloat(value)
						createdAt = new Date()
						location = null
					}

					return {
						sensor_id: sensorId,
						value: measurementValue,
						createdAt,
						location,
					}
				})
			}
		},
	},

	'text/csv': {
		decodeMessage: (body: string, {}: { sensors: any[] }) => {
			const lines = body.trim().split('\n')
			return lines.map((line) => {
				const parts = line.split(',').map((part) => part.trim())
				const sensorId = parts[0]
				const value = parseFloat(parts[1])
				const createdAt = parts[2] ? new Date(parts[2]) : new Date()

				let location = null
				if (parts[3] && parts[4]) {
					location = parseLocation({
						lng: parseFloat(parts[3]),
						lat: parseFloat(parts[4]),
						height: parts[5] ? parseFloat(parts[5]) : undefined,
					})
				}

				return {
					sensor_id: sensorId,
					value,
					createdAt,
					location,
				}
			})
		},
	},

	luftdaten: {
		decodeMessage: (body: any, { sensors }: { sensors: any[] }) => {
			if (!body)
				throw new Error('Cannot decode empty message (luftdaten decoder)')
			if (!sensors) throw new Error('luftdaten handler needs sensors')
			if (!body.sensordatavalues || !Array.isArray(body.sensordatavalues)) {
				throw new Error('Invalid luftdaten json. Missing `sensordatavalues`')
			}

			const out = body.sensordatavalues
				.map((sdv: any) => {
					const sensor_id = findLuftdatenSensorId(sensors, sdv.value_type)
					if (!sensor_id) return null

					const value = parseFloat(sdv.value)
					if (Number.isNaN(value)) return null

					return {
						sensor_id,
						value,
						createdAt: new Date(),
						location: null,
					}
				})
				.filter(Boolean) as any[]

			if (out.length === 0) {
				throw new Error('No applicable values found')
			}

			return out
		},
	},

	hackair: {
		decodeMessage: (body: any, { sensors }: { sensors: any[] }) => {
			if (!body)
				throw new Error('Cannot decode empty message (hackair decoder)')
			if (!sensors) throw new Error('hackair handler needs sensors')
			if (!body.reading || typeof body.reading !== 'object') {
				throw new Error('Invalid hackair json. Missing `reading`')
			}

			const out = Object.keys(body.reading)
				.map((key) => {
					const sensor_id = findHackairSensorId(sensors, key)
					if (!sensor_id) return null

					const value = parseFloat(body.reading[key])
					if (Number.isNaN(value)) return null

					return {
						sensor_id,
						value,
						createdAt: new Date(),
						location: null,
					}
				})
				.filter(Boolean) as any[]

			if (out.length === 0) {
				throw new Error('No applicable values found')
			}

			return out
		},
	},

	'application/sbx-bytes': {
		decodeMessage: (body: ArrayBuffer, { sensors }: { sensors: any[] }) => {
			const DATA_LENGTH_NO_TIMESTAMP = 16 // 12 bytes sensorId + 4 bytes float32
			const bytes = new Uint8Array(body)
			const measurements = []

			if (bytes.length % DATA_LENGTH_NO_TIMESTAMP !== 0) {
				throw new Error('Invalid data length for sbx-bytes format')
			}

			const measurementCount = bytes.length / DATA_LENGTH_NO_TIMESTAMP
			if (measurementCount > 2500) {
				throw new Error(
					'Too many measurements. Please submit at most 2500 measurements at once.',
				)
			}

			if (measurementCount === 0) {
				throw new Error('Cannot save empty measurements.')
			}

			for (
				let first = 0;
				first < bytes.length;
				first += DATA_LENGTH_NO_TIMESTAMP
			) {
				const measurement = extractMeasurement(bytes, first, sensors, false)
				if (measurement) {
					measurements.push(measurement)
				}
			}

			return measurements
		},
	},

	'application/sbx-bytes-ts': {
		decodeMessage: (body: ArrayBuffer, { sensors }: { sensors: any[] }) => {
			const DATA_LENGTH_WITH_TIMESTAMP = 20 // 12 bytes sensorId + 4 bytes float32 + 4 bytes timestamp
			const bytes = new Uint8Array(body)
			const measurements = []

			if (bytes.length % DATA_LENGTH_WITH_TIMESTAMP !== 0) {
				throw new Error('Invalid data length for sbx-bytes-ts format')
			}

			const measurementCount = bytes.length / DATA_LENGTH_WITH_TIMESTAMP
			if (measurementCount > 2500) {
				throw new Error(
					'Too many measurements. Please submit at most 2500 measurements at once.',
				)
			}

			if (measurementCount === 0) {
				throw new Error('Cannot save empty measurements.')
			}

			for (
				let first = 0;
				first < bytes.length;
				first += DATA_LENGTH_WITH_TIMESTAMP
			) {
				const measurement = extractMeasurement(bytes, first, sensors, true)
				if (measurement) {
					measurements.push(measurement)
				}
			}

			return measurements
		},
	},
}

export function hasDecoder(contentType: string): boolean {
	return (
		Object.prototype.hasOwnProperty.call(decodeHandlers, contentType) ||
		contentType.includes('application/json') ||
		contentType.includes('text/csv') ||
		contentType.includes('application/sbx-bytes') ||
		contentType.includes('text/plain;charset=UTF-8')
	)
}

function normalizeContentType(contentType: string): string {
	const normalized = contentType.toLowerCase().split(';')[0].trim()

	if (normalized.includes('json')) return 'application/json'

	if (normalized.includes('csv')) return 'text/csv'

	if (normalized === 'application/sbx-bytes-ts')
		return 'application/sbx-bytes-ts'

	if (normalized === 'application/sbx-bytes') return 'application/sbx-bytes'

	return normalized
}

export async function decodeMeasurements(
	measurements: any,

	options: { contentType: string; sensors: any[] },
): Promise<any[]> {
	try {
		const normalizedContentType = normalizeContentType(options.contentType)

		const handler = decodeHandlers[normalizedContentType]

		if (!handler) {
			throw new Error(
				`No decoder found for content-type: ${options.contentType}`,
			)
		}

		return handler.decodeMessage(measurements, { sensors: options.sensors })
	} catch (err: any) {
		const error = new Error(err.message)

		error.name = 'ModelError'
		;(error as any).type = 'UnprocessableEntityError'

		throw error
	}
}

function extractMeasurement(
	bytes: Uint8Array,
	offset: number,
	sensors: any[],
	withTimestamp: boolean,
): any | null {
	const view = new DataView(bytes.buffer, bytes.byteOffset + offset)

	// Extract sensor ID (first 12 bytes as hex string)
	const sensorIdBytes = bytes.slice(offset, offset + 12)
	const sensorId = Array.from(sensorIdBytes)
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('')

	const matchingSensor = sensors.find(
		(s) => s.id.toLowerCase() === sensorId.toLowerCase(),
	)

	if (!matchingSensor) {
		console.warn(`No matching sensor found for ID: ${sensorId}`)
		return null
	}

	// Extract value (4 bytes float32, little endian)
	const value = view.getFloat32(12, true)

	// Extract timestamp if present
	let createdAt = new Date()
	if (withTimestamp) {
		const timestampSeconds = view.getUint32(16, true)
		createdAt = new Date(timestampSeconds * 1000)

		const now = new Date()
		const maxFutureTime = 5 * 60 * 1000
		if (createdAt.getTime() > now.getTime() + maxFutureTime) {
			throw new Error(
				`Timestamp ${createdAt.toISOString()} is too far into the future.`,
			)
		}
	}

	return {
		sensor_id: matchingSensor.id,
		value: value,
		createdAt: createdAt,
		location: null,
	}
}

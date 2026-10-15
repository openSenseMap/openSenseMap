export type SensorWikiAliasInput = {
	title?: string | null
	unit?: string | null
	sensorType?: string | null
}

export type SensorWikiAliasMatch = {
	sensorWikiPhenomenon: string
	sensorWikiUnit?: string
	confidence: 'high' | 'medium'
	source: 'curated-alias' | 'database-alias'
	reasons: string[]
}

export type SensorWikiAliasSuggestion = SensorWikiAliasMatch & {
	title: string
	unit?: string
	aliases: string[]
}

export type SensorWikiAliasEntry = {
	sensorWikiPhenomenon: string
	sensorWikiUnit?: string
	title: string
	unit?: string
	titleAliases: string[]
	unitAliases?: string[]
	sensorTypeAliases?: string[]
}

export const sensorWikiAliasEntries: SensorWikiAliasEntry[] = [
	{
		sensorWikiPhenomenon: 'temperature',
		sensorWikiUnit: 'Cel',
		title: 'Temperature',
		unit: '°C',
		titleAliases: [
			'air temperature',
			'bodentemperatur',
			'bodentemperatur 10cm',
			'bodentemperatur 30cm',
			'bodentemperatur_1',
			'bodentemperatur_2',
			'lufttemperatur',
			'temperatur',
			'temperatur bme280',
			'temperatur dht22',
			'temperatur heca',
			'temperatur scd30',
			'temperatura',
			'temperature',
			'temperature bme280',
			'temperature dht22',
			'temperature heca',
			'temperature scd30',
			'temp',
		],
		unitAliases: ['c', 'cel', 'celsius', 'degc', 'degree celsius', '°c'],
	},
	{
		sensorWikiPhenomenon: 'relative_humidity',
		sensorWikiUnit: '%',
		title: 'Relative humidity',
		unit: '%',
		titleAliases: [
			'humidity',
			'luftfeuchte',
			'luftfeuchtigkeit',
			'rel luftfeuchte',
			'rel luftfeuchte bme280',
			'rel luftfeuchte dht22',
			'rel luftfeuchte heca',
			'rel luftfeuchte scd30',
			'rel. luftfeuchte',
			'rel. luftfeuchte bme280',
			'rel. luftfeuchte dht22',
			'rel. luftfeuchte heca',
			'rel. luftfeuchte scd30',
			'rel luftfeuchtigkeit',
			'rel. luftfeuchtigkeit',
			'relative humidity',
		],
		unitAliases: ['%', '%rh', 'percent', 'rh'],
	},
	{
		sensorWikiPhenomenon: 'barometric_pressure',
		sensorWikiUnit: 'hPa',
		title: 'Barometric pressure',
		unit: 'hPa',
		titleAliases: [
			'air pressure',
			'atm luftdruck',
			'atm. luftdruck',
			'barametric pressure',
			'barometric pressure',
			'luftdruck absolut',
			'luftdruck bme280',
			'luftdruck bmp',
			'luftdruck relativ',
			'luftdruck',
			'presion atmosferica',
			'presión atmosferica',
			'pressure',
		],
		unitAliases: ['hpa', 'inhg', 'mbar'],
	},
	{
		sensorWikiPhenomenon: 'barometric_pressure',
		sensorWikiUnit: 'Pa',
		title: 'Barometric pressure',
		unit: 'Pa',
		titleAliases: [
			'air pressure',
			'atm luftdruck',
			'atm. luftdruck',
			'barametric pressure',
			'barometric pressure',
			'luftdruck bme280',
			'luftdruck bmp',
			'luftdruck',
			'presion atmosferica',
			'presión atmosferica',
			'pressure',
		],
		unitAliases: ['pa'],
	},
	{
		sensorWikiPhenomenon: 'pm10',
		sensorWikiUnit: 'ug/m3',
		title: 'PM10',
		unit: 'µg/m³',
		titleAliases: [
			'feinstaub pm10',
			'particle 10',
			'particulate matter 10',
			'pm 10',
			'pm10',
		],
		unitAliases: ['ug/m3', 'µg/m³', 'μg/m³'],
	},
	{
		sensorWikiPhenomenon: 'pm25',
		sensorWikiUnit: 'ug/m3',
		title: 'PM2.5',
		unit: 'µg/m³',
		titleAliases: [
			'particle 2 5',
			'particle 2,5',
			'particulate matter 2 5',
			'particulate matter 2.5',
			'feinstaub pm2 5',
			'feinstaub pm2.5',
			'pm 2 5',
			'pm 2.5',
			'pm2 5',
			'pm2.5',
			'pm25',
		],
		unitAliases: ['ug/m3', 'µg/m³', 'μg/m³'],
	},
	{
		sensorWikiPhenomenon: 'ambient_light',
		sensorWikiUnit: 'lx',
		title: 'Ambient light',
		unit: 'lx',
		titleAliases: [
			'ambient light',
			'beleuchtungsstarke',
			'beleuchtungsstärke',
			'helligkeit',
			'illuminance',
			'light',
		],
		unitAliases: ['lux', 'lx'],
	},
	{
		sensorWikiPhenomenon: 'ultraviolet_a_light',
		sensorWikiUnit: 'uW/cm2',
		title: 'UV intensity',
		unit: 'µW/cm²',
		titleAliases: ['uv intensitat', 'uv intensität', 'uv intensity'],
		unitAliases: ['uw/cm2', 'uw/cm²', 'µw/cm2', 'µw/cm²', 'μw/cm2', 'μw/cm²'],
	},
	{
		sensorWikiPhenomenon: 'ultraviolet_a_light',
		sensorWikiUnit: 'W/m²',
		title: 'Ultraviolet A light',
		unit: 'W/m²',
		titleAliases: ['ultraviolet a light'],
		unitAliases: ['w/m2', 'w/m²'],
	},
	{
		sensorWikiPhenomenon: 'soil_moisture',
		sensorWikiUnit: '%',
		title: 'Soil moisture',
		unit: '%',
		titleAliases: [
			'bodenfeuchte',
			'bodenfeuchte 10cm',
			'bodenfeuchte 30cm',
			'bodenfeuchte 60cm',
			'bodenfeuchte_1',
			'bodenfeuchte_2',
			'soil moisture',
		],
		unitAliases: ['%', 'percent'],
	},
	{
		sensorWikiPhenomenon: 'co2',
		sensorWikiUnit: 'ppm',
		title: 'CO2',
		unit: 'ppm',
		titleAliases: ['carbon dioxide', 'co2'],
		unitAliases: ['parts per million', 'ppm'],
	},
	{
		sensorWikiPhenomenon: 'humidity',
		title: 'Humidity',
		titleAliases: ['humedad', 'humidity'],
	},
	{
		sensorWikiPhenomenon: 'pm10_concentration',
		sensorWikiUnit: 'ug/m3',
		title: 'PM10 concentration',
		unit: 'µg/m³',
		titleAliases: ['particulate matter 10 concentration', 'pm10 concentration'],
		unitAliases: ['ug/m3', 'µg/m³', 'μg/m³'],
	},
	{
		sensorWikiPhenomenon: 'air_temperature',
		sensorWikiUnit: '°C',
		title: 'Air temperature',
		unit: '°C',
		titleAliases: ['air temperature'],
		unitAliases: ['c', 'cel', 'celsius', 'degc', 'degree celsius', '°c'],
	},
	{
		sensorWikiPhenomenon: 'precipitation',
		sensorWikiUnit: 'mm',
		title: 'Precipitation',
		unit: 'mm',
		titleAliases: [
			'niederschlag',
			'precipitation',
			'rain rate',
			'rainfall',
			'regen stunde',
			'regen tag',
			'regenrate',
		],
		unitAliases: ['in/hr', 'millimeter', 'mm', 'mm/d', 'mm/h'],
	},
	{
		sensorWikiPhenomenon: 'volatile_organic_compound_voc',
		title: 'Volatile organic compound (VOC)',
		titleAliases: ['tvoc', 'voc', 'volatile organic compound voc'],
	},
	{
		sensorWikiPhenomenon: 'voltage',
		sensorWikiUnit: 'V',
		title: 'Voltage',
		unit: 'V',
		titleAliases: [
			'batteriespannung',
			'battery voltage',
			'betriebsspannung',
			'power supply',
			'solar voltage',
			'spannung',
			'voltage',
		],
		unitAliases: ['mv', 'millivolt', 'v', 'volt'],
	},
	{
		sensorWikiPhenomenon: 'sound_level',
		title: 'Sound level',
		titleAliases: [
			'durchschnitt umgebungslautstarke',
			'durchschnitt umgebungslautstärke',
			'lautstarke',
			'lautstärke',
			'minimum umgebungslautstarke',
			'minimum umgebungslautstärke',
			'noise',
			'sound level',
			'soundpresure dba',
			'soundpressure dba',
		],
		unitAliases: ['db', 'dba', 'dbavg', 'dbmin'],
	},
	{
		sensorWikiPhenomenon: 'water_level',
		title: 'Water level',
		titleAliases: ['pegel', 'water level'],
	},
	{
		sensorWikiPhenomenon: 'water_temperature',
		title: 'Water temperature',
		titleAliases: ['water temperature'],
	},
	{
		sensorWikiPhenomenon: 'wind_direction',
		title: 'Wind direction',
		titleAliases: ['wind direction', 'windrichtung'],
	},
	{
		sensorWikiPhenomenon: 'wind_speed',
		sensorWikiUnit: 'm/s',
		title: 'Wind speed',
		unit: 'm/s',
		titleAliases: [
			'viento',
			'wind boen',
			'wind böen',
			'wind gust speed',
			'wind speed',
			'windboen',
			'windböen',
			'windgeschwindigkeit',
			'windstarke',
			'windstärke',
		],
		unitAliases: ['m/s', 'meter per second', 'miles per hour', 'mph'],
	},
]

export function createSensorWikiAliasKey(entry: {
	sensorWikiPhenomenon: string
	sensorWikiUnit?: string | null
}) {
	return `${entry.sensorWikiPhenomenon}:${entry.sensorWikiUnit ?? ''}`
}

export function normalizeSensorWikiAliasValue(value?: string | null) {
	return (value ?? '')
		.trim()
		.toLowerCase()
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/µ/g, 'u')
		.replace(/μ/g, 'u')
		.replace(/³/g, '3')
		.replace(/²/g, '2')
		.replace(/°/g, '')
		.replace(/[^a-z0-9%/]+/g, ' ')
		.replace(/\s+/g, ' ')
		.trim()
}

export function parseSensorWikiAliasList(value: string) {
	return value
		.split(/\r?\n/)
		.map((alias) => alias.trim())
		.filter(Boolean)
}

export function matchSensorWikiAlias(
	input: SensorWikiAliasInput,
	entries: SensorWikiAliasEntry[],
): SensorWikiAliasMatch | undefined {
	const normalizedTitle = normalizeSensorWikiAliasValue(input.title)
	const normalizedUnit = normalizeSensorWikiAliasValue(input.unit)
	const normalizedSensorType = normalizeSensorWikiAliasValue(input.sensorType)
	const candidates: Array<{
		entry: SensorWikiAliasEntry
		unitMatched: boolean
		sensorTypeMatched: boolean
		exactPrimaryTitleMatched: boolean
		score: number
	}> = []

	for (const entry of entries) {
		const exactPrimaryTitleMatched =
			normalizeSensorWikiAliasValue(entry.title) === normalizedTitle
		const titleMatched =
			exactPrimaryTitleMatched ||
			entry.titleAliases.some(
				(alias) => normalizeSensorWikiAliasValue(alias) === normalizedTitle,
			)

		if (!titleMatched) continue

		const unitMatched = Boolean(
			normalizedUnit &&
			entry.unitAliases?.some(
				(alias) => normalizeSensorWikiAliasValue(alias) === normalizedUnit,
			),
		)
		const sensorTypeMatched = Boolean(
			normalizedSensorType &&
			entry.sensorTypeAliases?.some(
				(alias) =>
					normalizeSensorWikiAliasValue(alias) === normalizedSensorType,
			),
		)

		candidates.push({
			entry,
			unitMatched,
			sensorTypeMatched,
			exactPrimaryTitleMatched,
			// These weights make the ranking lexicographic: unit, sensor type,
			// then an exact match against the entry's primary display title.
			score:
				(unitMatched ? 4 : 0) +
				(sensorTypeMatched ? 2 : 0) +
				(exactPrimaryTitleMatched ? 1 : 0),
		})
	}

	if (candidates.length === 0) return undefined

	const bestScore = Math.max(...candidates.map((candidate) => candidate.score))
	const bestCandidates = candidates.filter(
		(candidate) => candidate.score === bestScore,
	)
	const bestTargets = new Set(
		bestCandidates.map(({ entry }) => createSensorWikiAliasKey(entry)),
	)

	if (bestTargets.size > 1) return undefined

	const [bestMatch] = bestCandidates
	const reasons = ['title-alias']
	if (bestMatch.unitMatched) reasons.push('unit-alias')
	if (bestMatch.sensorTypeMatched) reasons.push('sensor-type-alias')

	return {
		sensorWikiPhenomenon: bestMatch.entry.sensorWikiPhenomenon,
		sensorWikiUnit: bestMatch.unitMatched
			? bestMatch.entry.sensorWikiUnit
			: undefined,
		confidence:
			bestMatch.unitMatched || bestMatch.sensorTypeMatched ? 'high' : 'medium',
		source:
			entries === sensorWikiAliasEntries ? 'curated-alias' : 'database-alias',
		reasons,
	}
}

export function getSensorWikiAliasSuggestions(
	input: SensorWikiAliasInput,
	entries: SensorWikiAliasEntry[],
	limit = 5,
): SensorWikiAliasSuggestion[] {
	const normalizedTitle = normalizeSensorWikiAliasValue(input.title)
	const normalizedUnit = normalizeSensorWikiAliasValue(input.unit)
	const normalizedSensorType = normalizeSensorWikiAliasValue(input.sensorType)

	if (normalizedTitle.length < 2) return []

	return entries
		.map((entry) => {
			const normalizedAliases = [entry.title, ...entry.titleAliases].map(
				(alias) => normalizeSensorWikiAliasValue(alias),
			)
			const titleMatches = normalizedAliases.some((alias) =>
				alias.includes(normalizedTitle),
			)
			const titleStartsWithQuery = normalizedAliases.some((alias) =>
				alias.startsWith(normalizedTitle),
			)
			const unitMatched =
				!!normalizedUnit &&
				entry.unitAliases?.some(
					(alias) => normalizeSensorWikiAliasValue(alias) === normalizedUnit,
				)
			const sensorTypeMatched =
				!!normalizedSensorType &&
				entry.sensorTypeAliases?.some(
					(alias) =>
						normalizeSensorWikiAliasValue(alias) === normalizedSensorType,
				)

			if (!titleMatches) return null

			const reasons = ['title-alias']
			if (unitMatched) reasons.push('unit-alias')
			if (sensorTypeMatched) reasons.push('sensor-type-alias')

			return {
				suggestion: {
					title: entry.title,
					unit: entry.unit,
					sensorWikiPhenomenon: entry.sensorWikiPhenomenon,
					sensorWikiUnit: entry.sensorWikiUnit,
					confidence: unitMatched || sensorTypeMatched ? 'high' : 'medium',
					source:
						entries === sensorWikiAliasEntries
							? 'curated-alias'
							: 'database-alias',
					reasons,
					aliases: entry.titleAliases,
				} satisfies SensorWikiAliasSuggestion,
				score:
					(titleStartsWithQuery ? 2 : 1) +
					(unitMatched ? 2 : 0) +
					(sensorTypeMatched ? 1 : 0),
			}
		})
		.filter((result): result is NonNullable<typeof result> => result !== null)
		.sort((a, b) => b.score - a.score)
		.map(({ suggestion }) => suggestion)
		.slice(0, limit)
}

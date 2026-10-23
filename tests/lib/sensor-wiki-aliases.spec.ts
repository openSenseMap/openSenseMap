import { describe, expect, it } from 'vite-plus/test'
import {
	getSensorWikiAliasSuggestions,
	matchSensorWikiAlias,
	normalizeSensorWikiAliasValue,
	parseSensorWikiAliasList,
	type SensorWikiAliasEntry,
} from '~/lib/device-schemas/sensor-wiki-aliases'

const databaseAliasEntries: SensorWikiAliasEntry[] = [
	{
		sensorWikiPhenomenon: 'temperature',
		sensorWikiUnit: 'Cel',
		title: 'Temperature',
		unit: '°C',
		titleAliases: ['temp', 'temperatur', 'temperature'],
		unitAliases: ['c', 'celsius', '°c'],
	},
	{
		sensorWikiPhenomenon: 'relative_humidity',
		sensorWikiUnit: '%',
		title: 'Relative humidity',
		unit: '%',
		titleAliases: ['humidity', 'luftfeuchtigkeit', 'relative humidity'],
		unitAliases: ['%', 'percent'],
	},
	{
		sensorWikiPhenomenon: 'humidity',
		title: 'Humidity',
		titleAliases: ['humidity'],
	},
]

describe('sensor wiki aliases', () => {
	it('normalizes punctuation and unit variants', () => {
		expect(normalizeSensorWikiAliasValue(' µg/m³ ')).toBe('ug/m3')
		expect(normalizeSensorWikiAliasValue('rel. Luftfeuchte')).toBe(
			'rel luftfeuchte',
		)
	})

	it('returns a high-confidence match when title and unit match', () => {
		expect(
			matchSensorWikiAlias(
				{
					title: 'Temperatur',
					unit: '°C',
					sensorType: 'BME280',
				},
				databaseAliasEntries,
			),
		).toMatchObject({
			sensorWikiPhenomenon: 'temperature',
			sensorWikiUnit: 'Cel',
			confidence: 'high',
		})
	})

	it('returns a medium-confidence match when only the title matches', () => {
		expect(
			matchSensorWikiAlias(
				{
					title: 'Luftfeuchtigkeit',
					unit: 'unknown',
				},
				databaseAliasEntries,
			),
		).toMatchObject({
			sensorWikiPhenomenon: 'relative_humidity',
			confidence: 'medium',
		})
	})

	it('prefers a matching unit independently of entry order', () => {
		const entries: SensorWikiAliasEntry[] = [
			{
				sensorWikiPhenomenon: 'barometric_pressure',
				sensorWikiUnit: 'hPa',
				title: 'Barometric pressure',
				titleAliases: ['air pressure'],
				unitAliases: ['hPa'],
			},
			{
				sensorWikiPhenomenon: 'barometric_pressure',
				sensorWikiUnit: 'Pa',
				title: 'Barometric pressure',
				titleAliases: ['air pressure'],
				unitAliases: ['Pa'],
			},
		]

		for (const orderedEntries of [entries, [...entries].reverse()]) {
			expect(
				matchSensorWikiAlias(
					{ title: 'Barometric pressure', unit: 'Pa' },
					orderedEntries,
				),
			).toMatchObject({
				sensorWikiPhenomenon: 'barometric_pressure',
				sensorWikiUnit: 'Pa',
				confidence: 'high',
			})
		}
	})

	it('matches database aliases by evidence, not row order', () => {
		const databaseEntries = [...databaseAliasEntries].sort(
			(left, right) =>
				left.sensorWikiPhenomenon.localeCompare(right.sensorWikiPhenomenon) ||
				(left.sensorWikiUnit ?? '').localeCompare(right.sensorWikiUnit ?? ''),
		)

		expect(
			matchSensorWikiAlias({ title: 'Humidity', unit: '%' }, databaseEntries),
		).toMatchObject({
			sensorWikiPhenomenon: 'relative_humidity',
			sensorWikiUnit: '%',
			confidence: 'high',
			source: 'database-alias',
		})
	})

	it('prefers a matching sensor type over a primary-title-only match', () => {
		const entries: SensorWikiAliasEntry[] = [
			{
				sensorWikiPhenomenon: 'generic_temperature',
				title: 'Temperature',
				titleAliases: [],
			},
			{
				sensorWikiPhenomenon: 'bme_temperature',
				title: 'BME temperature',
				titleAliases: ['Temperature'],
				sensorTypeAliases: ['BME280'],
			},
		]

		for (const orderedEntries of [entries, [...entries].reverse()]) {
			expect(
				matchSensorWikiAlias(
					{ title: 'Temperature', sensorType: 'BME280' },
					orderedEntries,
				),
			).toMatchObject({
				sensorWikiPhenomenon: 'bme_temperature',
				confidence: 'high',
			})
		}
	})

	it('uses an exact primary title to break an otherwise equal match', () => {
		const entries: SensorWikiAliasEntry[] = [
			{
				sensorWikiPhenomenon: 'temperature',
				title: 'Temperature',
				titleAliases: [],
			},
			{
				sensorWikiPhenomenon: 'other_temperature',
				title: 'Other temperature',
				titleAliases: ['Temperature'],
			},
		]

		for (const orderedEntries of [entries, [...entries].reverse()]) {
			expect(
				matchSensorWikiAlias({ title: 'Temperature' }, orderedEntries),
			).toMatchObject({
				sensorWikiPhenomenon: 'temperature',
				confidence: 'medium',
			})
		}
	})

	it('rejects unresolved equal matches across different targets', () => {
		const entries: SensorWikiAliasEntry[] = [
			{
				sensorWikiPhenomenon: 'indoor_temperature',
				title: 'Indoor reading',
				titleAliases: ['Temperature'],
			},
			{
				sensorWikiPhenomenon: 'outdoor_temperature',
				title: 'Outdoor reading',
				titleAliases: ['Temperature'],
			},
		]

		expect(
			matchSensorWikiAlias({ title: 'Temperature' }, entries),
		).toBeUndefined()
		expect(
			matchSensorWikiAlias({ title: 'Temperature' }, [...entries].reverse()),
		).toBeUndefined()
	})

	it('does not invent a match for unknown labels', () => {
		expect(
			matchSensorWikiAlias(
				{ title: 'asdasd', unit: 's' },
				databaseAliasEntries,
			),
		).toBeUndefined()
	})

	it('returns autocomplete suggestions for partial aliases', () => {
		expect(
			getSensorWikiAliasSuggestions({ title: 'temp' }, databaseAliasEntries),
		).toContainEqual(
			expect.objectContaining({
				title: 'Temperature',
				sensorWikiPhenomenon: 'temperature',
				unit: '°C',
			}),
		)
	})

	it('does not suggest entries for very short queries', () => {
		expect(
			getSensorWikiAliasSuggestions({ title: 't' }, databaseAliasEntries),
		).toEqual([])
	})

	it('parses aliases by line while preserving commas', () => {
		expect(
			parseSensorWikiAliasList('particle 2,5\r\n pm2.5 \n\nparticulate matter'),
		).toEqual(['particle 2,5', 'pm2.5', 'particulate matter'])
	})

	it('does not match aliases with an empty runtime configuration', () => {
		expect(matchSensorWikiAlias({ title: 'Temperatur', unit: '°C' }, [])).toBe(
			undefined,
		)
		expect(getSensorWikiAliasSuggestions({ title: 'temp' }, [])).toEqual([])
	})
})

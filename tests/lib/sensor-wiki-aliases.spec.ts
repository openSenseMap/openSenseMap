import { describe, expect, it } from 'vite-plus/test'
import {
	getSensorWikiAliasSuggestions,
	matchSensorWikiAlias,
	normalizeSensorWikiAliasValue,
	type SensorWikiAliasEntry,
} from '~/lib/sensor-wiki/aliases'
import {
	parseSensorWikiAliasCatalog,
	sensorWikiAliasCatalog,
	sensorWikiAliasCatalogSchema,
	sensorWikiAliasEntries,
} from '~/lib/sensor-wiki/alias-catalog'

const aliasEntries: SensorWikiAliasEntry[] = [
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
				aliasEntries,
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
				aliasEntries,
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

	it('matches catalog aliases by evidence, not row order', () => {
		const catalogEntries = [...aliasEntries].sort(
			(left, right) =>
				left.sensorWikiPhenomenon.localeCompare(right.sensorWikiPhenomenon) ||
				(left.sensorWikiUnit ?? '').localeCompare(right.sensorWikiUnit ?? ''),
		)

		expect(
			matchSensorWikiAlias({ title: 'Humidity', unit: '%' }, catalogEntries),
		).toMatchObject({
			sensorWikiPhenomenon: 'relative_humidity',
			sensorWikiUnit: '%',
			confidence: 'high',
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
			matchSensorWikiAlias({ title: 'asdasd', unit: 's' }, aliasEntries),
		).toBeUndefined()
	})

	it('returns autocomplete suggestions for partial aliases', () => {
		expect(
			getSensorWikiAliasSuggestions({ title: 'temp' }, aliasEntries),
		).toContainEqual(
			expect.objectContaining({
				title: 'Temperature',
				sensorWikiPhenomenon: 'temperature',
				unit: '°C',
			}),
		)
	})

	it('does not suggest entries for very short queries', () => {
		expect(getSensorWikiAliasSuggestions({ title: 't' }, aliasEntries)).toEqual(
			[],
		)
	})

	it('loads a valid repository catalog', () => {
		expect(sensorWikiAliasCatalog.version).toBe(1)
		expect(sensorWikiAliasEntries.length).toBeGreaterThan(0)
		expect(
			sensorWikiAliasCatalogSchema.safeParse(sensorWikiAliasCatalog).success,
		).toBe(true)
	})

	it('keeps air temperature distinct from generic temperature', () => {
		expect(
			matchSensorWikiAlias(
				{ title: 'Air temperature', unit: '°C' },
				sensorWikiAliasEntries,
			),
		).toMatchObject({
			sensorWikiPhenomenon: 'air_temperature',
			sensorWikiUnit: '°C',
		})
		expect(
			matchSensorWikiAlias(
				{ title: 'Temperatur', unit: '°C' },
				sensorWikiAliasEntries,
			),
		).toMatchObject({
			sensorWikiPhenomenon: 'temperature',
			sensorWikiUnit: 'Cel',
		})
	})

	it('rejects duplicate canonical targets', () => {
		expect(() =>
			parseSensorWikiAliasCatalog({
				version: 1,
				entries: [aliasEntries[0], aliasEntries[0]],
			}),
		).toThrow('Duplicate catalog target')
	})

	it('rejects duplicate normalized aliases through the catalog schema', () => {
		expect(() =>
			parseSensorWikiAliasCatalog({
				version: 1,
				entries: [
					{
						...aliasEntries[0],
						titleAliases: ['Temperature', ' temperature '],
					},
				],
			}),
		).toThrow('Duplicate normalized titleAliases value')
	})

	it('does not match aliases with an empty runtime configuration', () => {
		expect(matchSensorWikiAlias({ title: 'Temperatur', unit: '°C' }, [])).toBe(
			undefined,
		)
		expect(getSensorWikiAliasSuggestions({ title: 'temp' }, [])).toEqual([])
	})
})

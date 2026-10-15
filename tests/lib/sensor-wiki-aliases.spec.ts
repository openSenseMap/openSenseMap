import { describe, expect, it } from 'vite-plus/test'
import {
	getSensorWikiAliasSuggestions,
	matchSensorWikiAlias,
	normalizeSensorWikiAliasValue,
	sensorWikiAliasEntries,
} from '~/lib/device-schemas/sensor-wiki-aliases'

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
				sensorWikiAliasEntries,
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
				sensorWikiAliasEntries,
			),
		).toMatchObject({
			sensorWikiPhenomenon: 'relative_humidity',
			confidence: 'medium',
		})
	})

	it('does not invent a match for unknown labels', () => {
		expect(
			matchSensorWikiAlias(
				{ title: 'asdasd', unit: 's' },
				sensorWikiAliasEntries,
			),
		).toBeUndefined()
	})

	it('returns autocomplete suggestions for partial aliases', () => {
		expect(
			getSensorWikiAliasSuggestions({ title: 'temp' }, sensorWikiAliasEntries),
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
			getSensorWikiAliasSuggestions({ title: 't' }, sensorWikiAliasEntries),
		).toEqual([])
	})

	it('does not activate bundled aliases for an empty runtime configuration', () => {
		expect(matchSensorWikiAlias({ title: 'Temperatur', unit: '°C' }, [])).toBe(
			undefined,
		)
		expect(getSensorWikiAliasSuggestions({ title: 'temp' }, [])).toEqual([])
	})
})

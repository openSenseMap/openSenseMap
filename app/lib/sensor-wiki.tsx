import i18next from 'i18next'
import { type Unit } from '~/db/models/unit.server'

export type SensorWikiTranslation = {
	item: SensorWikiLabel[]
}

export type SensorWikiLabel = {
	languageCode: string
	text: string
}

export type SensorWikiSensor = {
	id: number
	slug: string
	label: SensorWikiTranslation
	description: SensorWikiTranslation
	manufacturer: string
	lifePeriod: number
	price: number
	image: string
	datasheet: string
}

export type SensorWikiSensorElement = {
	id: number
	accuracy: number
	accuracyUnit: Unit
	sensorId: number
	phenomenonId: number
}

export function sensorWikiLabel(label: SensorWikiLabel[]) {
	//   const locale = await i18next.getLocale(request);
	if (!label) {
		return undefined
	}
	const lang = getLanguage()
	const labelFound = label.filter(
		(labelItem: any) => labelItem.languageCode == lang,
	)

	if (labelFound.length > 0) {
		return labelFound[0].text
	} else {
		return label[0].text
	}
}

export function getLanguage() {
	return i18next.language
}

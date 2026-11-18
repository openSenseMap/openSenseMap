import { getSensorsForModel } from './model-definitions'
import {
	sensorDefinitions,
	type SensorDefinitionId,
} from './sensor-definitions'

type SensorIdentity = {
	title: string | null
	unit: string | null
	sensorType: string | null
	data?: unknown
}

export const SENSOR_DEFINITION_SHAPE_EDIT_ERROR =
	'Sensor type and unit cannot be changed for a catalog-backed sensor.'

const normalize = (value: string | null | undefined) =>
	(value ?? '').trim().toLocaleLowerCase()

export function getSensorDefinitionId(
	data: unknown,
): SensorDefinitionId | undefined {
	if (!data || typeof data !== 'object' || Array.isArray(data)) return undefined

	const sensorDefinitionId = (data as Record<string, unknown>)
		.sensorDefinitionId
	return typeof sensorDefinitionId === 'string' &&
		Object.hasOwn(sensorDefinitions, sensorDefinitionId)
		? (sensorDefinitionId as SensorDefinitionId)
		: undefined
}

function inferSensorDefinitionId(
	model: string | null | undefined,
	sensor: SensorIdentity,
): SensorDefinitionId | undefined {
	if (!model) return undefined

	const matchingShape = getSensorsForModel(model).filter(
		(definition) =>
			normalize(definition.sensorType) === normalize(sensor.sensorType) &&
			normalize(definition.unit) === normalize(sensor.unit),
	)
	const matchingTitle = matchingShape.filter(
		(definition) => normalize(definition.title) === normalize(sensor.title),
	)

	if (matchingTitle.length === 1) return matchingTitle[0].id
	return undefined
}

function withSensorDefinitionId(
	data: unknown,
	sensorDefinitionId: SensorDefinitionId,
): Record<string, unknown> {
	const existingData =
		data && typeof data === 'object' && !Array.isArray(data)
			? (data as Record<string, unknown>)
			: {}

	return { ...existingData, sensorDefinitionId }
}

type SensorDefinitionEditResult =
	| { success: true; data: unknown }
	| { success: false; message: string }

/**
 * Keeps title-only edits rename-safe and prevents a persisted definition ID
 * from becoming stale when a sensor's routing semantics are changed.
 */
export function prepareSensorDefinitionEdit(
	model: string | null | undefined,
	currentSensor: SensorIdentity,
	nextSensor: Pick<SensorIdentity, 'unit' | 'sensorType'>,
): SensorDefinitionEditResult {
	const sensorDefinitionId =
		getSensorDefinitionId(currentSensor.data) ??
		inferSensorDefinitionId(model, currentSensor)
	if (!sensorDefinitionId) {
		return { success: true, data: currentSensor.data }
	}

	const definition = sensorDefinitions[sensorDefinitionId]
	if (
		normalize(nextSensor.sensorType) !== normalize(definition.sensorType) ||
		normalize(nextSensor.unit) !== normalize(definition.unit)
	) {
		return { success: false, message: SENSOR_DEFINITION_SHAPE_EDIT_ERROR }
	}

	return {
		success: true,
		data: withSensorDefinitionId(currentSensor.data, sensorDefinitionId),
	}
}

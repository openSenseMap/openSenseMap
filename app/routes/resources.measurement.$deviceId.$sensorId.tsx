import { data } from 'react-router'
import { type Route } from './+types/resources.measurement.$deviceId.$sensorId'
import { measurement, type Measurement } from '~/db/schema'
import { drizzleClient } from '~/db.server'

export const action = async ({ request }: Route.ActionArgs) => {
	if (request.method !== 'POST') {
		return data({ message: 'Method not allowed' }, 405)
	}
	const payload: Measurement[] = await request.json()
	const measurements = payload.map((data) => ({
		sensorId: data.sensorId,
		time: new Date(data.time),
		value: Number(data.value),
	}))

	await drizzleClient.insert(measurement).values(measurements)

	return null
}

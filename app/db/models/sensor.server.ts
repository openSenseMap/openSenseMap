import { eq, sql, inArray, and } from 'drizzle-orm'
import {
	type Measurement,
	sensor,
	device,
	type Sensor,
	type SensorWithLatestMeasurement,
} from '~/db/schema'
import { drizzleClient } from '~/db.server'
import { type BoxesDataQueryParams } from '~/lib/api-schemas/boxes-data-query-schema'
import { calculatedDeviceHeightAboveSeaLevel } from './device-height'
// import { point } from "@turf/helpers";
// import type { Point } from "geojson";

export function getSensors(deviceId: Sensor['deviceId']) {
	return drizzleClient.query.sensor.findMany({
		where: (sensor, { eq }) => eq(sensor.deviceId, deviceId),
	})

	// const geojson: GeoJSON.FeatureCollection<Point, any> = {
	//   type: "FeatureCollection",
	//   features: [],
	// };

	// // return streamify(devices).pipe(jsonstringify(opts));
	// for (const sensor of sensors) {
	//   const coordinates = [sensor.device.longitude, sensor.device.latitude];
	//   const feature = point(coordinates, sensor);
	//   geojson.features.push(feature);
	// }

	// return sensors;
}

// import jsonstringify from "stringify-stream";
// import streamify from "stream-array";

// export async function getSensors() {
//   // const opts = {
//   //   open: '{"type":"FeatureCollection","features":[',
//   //   close: "]}",
//   //   geoJsonStringifyReplacer,
//   // };

//   const sensors = await prisma.sensor.findMany({
//     include: {
//       device: {
//         select: {
//           latitude: true,
//           longitude: true,
//         },
//       },
//     },
//   });
//   const geojson: GeoJSON.FeatureCollection<Point, any> = {
//     type: "FeatureCollection",
//     features: [],
//   };

//   // return streamify(devices).pipe(jsonstringify(opts));
//   for (const sensor of sensors) {
//     const coordinates = [sensor.device.longitude, sensor.device.latitude];
//     const feature = point(coordinates, sensor);
//     geojson.features.push(feature);
//   }

//   return sensors;
// }

export function getSensorsFromDevice(deviceId: Sensor['deviceId']) {
	return drizzleClient.query.sensor.findMany({
		where: (sensor, { eq }) => eq(sensor.deviceId, deviceId),
		orderBy: (sensor, { asc }) => [asc(sensor.order), asc(sensor.createdAt)],
	})
}

export async function getSensorWithLastMeasurement(
	deviceId: Sensor['deviceId'],
	sensorId: Sensor['id'],
	count: number = 1,
): Promise<SensorWithLatestMeasurement> {
	const allSensors = await getSensorsWithLastMeasurement(deviceId, count)
	return allSensors.find(
		(c: any) => c.id === sensorId,
	) as SensorWithLatestMeasurement
}

export async function getSensorsWithLastMeasurement(
	deviceId: Sensor['deviceId'],
	count: number = 1,
): Promise<SensorWithLatestMeasurement[]> {
	const result = await drizzleClient.execute(
		sql`SELECT 
        s.id,
        s.title,
        s.unit,
        s.sensor_type AS "sensorType",
        s.icon,
	        CASE
	          WHEN max(measure.time) > now() - interval '7 days' THEN 'active'::status
	          WHEN max(measure.time) > now() - interval '30 days' THEN 'inactive'::status
	          ELSE 'old'::status
	        END AS status,
        s.device_id AS "deviceId",
        s."order",
        json_agg(
          json_build_object(
            'value', measure.value,
            'createdAt', measure.time
          )
        ) FILTER (
          WHERE measure.value IS NOT NULL AND measure.time IS NOT NULL
        ) AS "lastMeasurements"
      FROM sensor s
      JOIN device d ON s.device_id = d.id
      LEFT JOIN LATERAL (
        SELECT * FROM measurement m
        WHERE m.sensor_id = s.id
        ORDER BY m.time DESC
        LIMIT ${count}
      ) AS measure ON true
      WHERE s.device_id = ${deviceId}
      GROUP BY s.id
      ORDER BY s."order" ASC, s.id ASC;`,
	)

	const cast = [...result].map((r) => {
		if (r['lastMeasurements'] !== null) {
			const ret = {
				...r,
				lastMeasurement: (r as any)['lastMeasurements']?.[0] ?? null,
			} as any
			if (count === 1) delete ret['lastMeasurements']
			return ret
		} else return { ...r, lastMeasurements: [] } as any
	}) as any

	return cast as SensorWithLatestMeasurement[]
}

export async function getMeasurements(
	sensorId: Measurement['sensorId'],
	fromDate: string,
	toDate: string,
	count: number = 10000,
): Promise<Measurement[]> {
	return (await drizzleClient.execute(
		sql`SELECT *
          FROM measurement
          WHERE sensor_id = ${sensorId} AND
          time >= ${fromDate} AND
          time <= ${toDate}
          ORDER BY time DESC
          LIMIT ${count}`,
	)) as Measurement[]
}

export async function registerSensor(newSensor: Sensor) {
	const insertedSensor = await drizzleClient
		.insert(sensor)
		.values({
			id: newSensor.id,
			deviceId: newSensor.deviceId,
			title: newSensor.title,
			sensorType: newSensor.sensorType,
			unit: newSensor.unit,
			sensorWikiType: newSensor.sensorType,
			sensorWikiUnit: newSensor.unit,
			sensorWikiPhenomenon: newSensor.title,
		})
		.returning()

	return insertedSensor
}

export function addNewSensor({
	title,
	unit,
	sensorType,
	icon,
	deviceId,
	order,
}: Pick<Sensor, 'title' | 'unit' | 'sensorType' | 'deviceId' | 'order'> & {
	icon?: Sensor['icon']
}) {
	return drizzleClient.insert(sensor).values({
		title,
		unit,
		sensorType,
		icon,
		deviceId,
		order,
	})
}

export function updateSensor({
	id,
	title,
	unit,
	sensorType,
	icon,
	data,
	order,
}: Pick<Sensor, 'id' | 'title' | 'unit' | 'sensorType' | 'order'> & {
	icon?: Sensor['icon']
	data?: Sensor['data']
}) {
	const setColumns: Partial<Sensor> = {
		title,
		unit,
		sensorType,
		order,
	}

	if (icon !== undefined) {
		setColumns.icon = icon
	}

	if (data !== undefined) {
		setColumns.data = data
	}

	return drizzleClient.update(sensor).set(setColumns).where(eq(sensor.id, id))
}

// return first sensor with its device name
export function getSensor(id: Sensor['id']) {
	return drizzleClient.query.sensor.findFirst({
		where: (sensor, { eq }) => eq(sensor.id, id),
	})
}

export function deleteSensor(id: Sensor['id']) {
	return drizzleClient.delete(sensor).where(eq(sensor.id, id))
}

/**
 * Find matching devices+their sensors based on phenomenon or grouptag and device-level filters.
 * Returns sensorsMap (sensorId -> augmented sensor metadata) and sensorIds array.
 */
export async function findMatchingSensors(params: BoxesDataQueryParams) {
	const { boxid, exposure, phenomenon, grouptag } = params

	// Build device-level conditions
	const deviceConditions = []

	if (grouptag) {
		deviceConditions.push(sql`${grouptag} = ANY(${device.tags})`)
	}

	if (boxid) {
		deviceConditions.push(inArray(device.id, boxid))
	}

	if (exposure) {
		deviceConditions.push(inArray(device.exposure, exposure))
	}

	// Build sensor-level conditions
	const sensorConditions = []

	if (phenomenon) {
		sensorConditions.push(eq(sensor.title, phenomenon))
	}

	const rows = await drizzleClient
		.select({
			deviceId: device.id,
			deviceName: device.name,
			deviceExposure: device.exposure,
			deviceLat: device.latitude,
			deviceLon: device.longitude,
			deviceHeight: calculatedDeviceHeightAboveSeaLevel(),
			sensorId: sensor.id,
			sensorTitle: sensor.title,
			sensorUnit: sensor.unit,
			sensorType: sensor.sensorType,
		})
		.from(device)
		.innerJoin(sensor, eq(sensor.deviceId, device.id))
		.where(
			and(
				sensorConditions.length > 0 ? and(...sensorConditions) : undefined,
				deviceConditions.length > 0 ? and(...deviceConditions) : undefined,
			),
		)

	if (!rows || rows.length === 0) {
		throw new Response('No senseBoxes found', { status: 404 })
	}

	const sensorsMap: Record<
		string,
		{
			sensorId: string
			boxId: string
			boxName: string
			exposure: string | null
			lat: number
			lon: number
			height?: number | null
			phenomenon: string | null
			unit: string | null
			sensorType: string | null
		}
	> = {}

	for (const r of rows) {
		if (r.sensorId) {
			sensorsMap[r.sensorId] = {
				sensorId: r.sensorId,
				boxId: r.deviceId,
				boxName: r.deviceName,
				exposure: r.deviceExposure,
				lat: r.deviceLat,
				lon: r.deviceLon,
				height: r.deviceHeight,
				phenomenon: r.sensorTitle,
				unit: r.sensorUnit,
				sensorType: r.sensorType,
			}
		}
	}

	return { sensorsMap, sensorIds: Object.keys(sensorsMap) }
}

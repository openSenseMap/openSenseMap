import { sql } from 'drizzle-orm'
import { device } from '~/db/schema/device'

export function calculatedDeviceHeightAboveSeaLevel() {
	return sql<number | null>`
		CASE
			WHEN ${device.terrainElevation} IS NULL
				OR ${device.heightAboveGround} IS NULL
			THEN NULL
			ELSE ${device.terrainElevation} + ${device.heightAboveGround}
		END
	`
}

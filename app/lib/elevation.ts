export type TerrainElevationResult = {
	elevation: number
	dataset: string
	latitude: number
	longitude: number
}

export type ElevationLookupErrorCode =
	| 'invalid_location'
	| 'consent_required'
	| 'rate_limited'
	| 'timeout'
	| 'upstream_error'
	| 'invalid_response'

export type ElevationResourceResponse =
	| {
			ok: true
			result: TerrainElevationResult
	  }
	| {
			ok: false
			error: ElevationLookupErrorCode
	  }

export function calculateHeightAboveSeaLevel(
	terrainElevation: number | null | undefined,
	heightAboveGround: number | null | undefined,
) {
	if (terrainElevation == null || heightAboveGround == null) return null

	return terrainElevation + heightAboveGround
}

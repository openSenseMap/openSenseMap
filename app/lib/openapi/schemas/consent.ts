import * as z from 'zod/v4'

export const ElevationLookupConsentSchema = z.boolean().meta({
	description:
		'Whether the authenticated user consents to transmitting device coordinates to GPXZ to calculate height above sea level. `true` grants the current consent version, `false` withdraws existing consent, and omission leaves the stored consent unchanged. Without active consent, height above ground is stored but no elevation lookup is performed.',
	example: true,
})

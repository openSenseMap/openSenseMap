import { data } from 'react-router'
import { z } from 'zod'
import { type Route } from './+types/resources.elevation'
import {
	type ElevationLookupErrorCode,
	type ElevationResourceResponse,
} from '~/lib/elevation'
import { locationCoordinatesSchema } from '~/lib/location'
import {
	ElevationLookupError,
	getTerrainElevation,
} from '~/services/elevation-service.server'
import { getUserId } from '~/services/session-service.server'
import {
	grantCurrentElevationConsent,
	withdrawElevationConsent,
} from '~/db/models/elevation-consent.server'

const elevationLookupRequestSchema = locationCoordinatesSchema.extend({
	consent: z.literal(true),
})

function statusForElevationError(code: ElevationLookupErrorCode) {
	switch (code) {
		case 'invalid_location':
			return 400
		case 'consent_required':
			return 403
		case 'rate_limited':
			return 503
		case 'timeout':
			return 504
		default:
			return 502
	}
}

async function lookupElevation(latitude: number, longitude: number) {
	try {
		const result = await getTerrainElevation(latitude, longitude)

		return data<ElevationResourceResponse>(
			{ ok: true, result },
			{
				headers: {
					'Cache-Control': 'private, max-age=300',
				},
			},
		)
	} catch (error) {
		const code =
			error instanceof ElevationLookupError ? error.code : 'upstream_error'
		const status = statusForElevationError(code)

		return data<ElevationResourceResponse>(
			{ ok: false, error: code },
			{ status },
		)
	}
}

export async function action({ request }: Route.ActionArgs) {
	const userId = await getUserId(request)
	if (!userId) throw new Response('Unauthorized', { status: 401 })

	let body: unknown

	try {
		body = await request.json()
	} catch {
		return data<ElevationResourceResponse>(
			{ ok: false, error: 'invalid_location' },
			{ status: 400 },
		)
	}

	if (
		typeof body === 'object' &&
		body !== null &&
		'consent' in body &&
		body.consent === false
	) {
		await withdrawElevationConsent(userId)
		return new Response(null, { status: 204 })
	}

	const parsed = elevationLookupRequestSchema.safeParse(body)

	if (!parsed.success) {
		return data<ElevationResourceResponse>(
			{ ok: false, error: 'invalid_location' },
			{ status: 400 },
		)
	}

	await grantCurrentElevationConsent(userId)

	return lookupElevation(parsed.data.latitude, parsed.data.longitude)
}

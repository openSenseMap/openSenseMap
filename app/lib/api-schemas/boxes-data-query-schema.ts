import { z } from 'zod'
import { type DeviceExposureType } from '../device-enums'
import { StandardResponse } from '~/lib/responses'

export type BoxesDataColumn =
	| 'createdAt'
	| 'value'
	| 'lat'
	| 'lon'
	| 'height'
	| 'boxid'
	| 'boxName'
	| 'exposure'
	| 'sensorId'
	| 'phenomenon'
	| 'unit'
	| 'sensorType'

const BoxesDataQuerySchemaBase = z
	.object({
		phenomenon: z.string().optional(),

		boxid: z
			.union([
				z.string().transform((s) => s.split(',').map((x) => x.trim())),
				z
					.array(z.string())
					.transform((arr) => arr.map((s) => String(s).trim())),
			])
			.optional(),
		bbox: z
			.union([
				z.string().transform((s) => s.split(',').map((x) => Number(x.trim()))),
				z
					.array(z.union([z.string(), z.number()]))
					.transform((arr) => arr.map((x) => Number(x))),
			])
			.refine((arr) => arr.length === 4 && arr.every((n) => !isNaN(n)), {
				message: 'bbox must contain exactly 4 numeric coordinates',
			})
			.optional(),

		exposure: z
			.union([
				z
					.string()
					.transform((s) =>
						s.split(',').map((x) => x.trim() as DeviceExposureType),
					),
				z
					.array(z.string())
					.transform((arr) =>
						arr.map((s) => String(s).trim() as DeviceExposureType),
					),
			])
			.optional(),

		grouptag: z.string().optional(),

		fromDate: z
			.string()
			.transform((s) => new Date(s))
			.refine((d) => !isNaN(d.getTime()), {
				message: 'from-date is invalid',
			})
			.prefault(() =>
				new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
			),
		toDate: z
			.string()
			.transform((s) => new Date(s))
			.refine((d) => !isNaN(d.getTime()), {
				message: 'to-date is invalid',
			})
			.prefault(() => new Date().toISOString()),

		format: z
			.enum(['csv', 'json'], {
				error: () => "Format must be either 'csv' or 'json'",
			})
			.default('csv'),

		// Columns to include
		columns: z
			.union([
				z
					.string()
					.transform((s) =>
						s.split(',').map((x) => x.trim() as BoxesDataColumn),
					),
				z
					.array(z.string())
					.transform((arr) =>
						arr.map((s) => String(s).trim() as BoxesDataColumn),
					),
			])
			.default([
				'sensorId',
				'createdAt',
				'value',
				'lat',
				'lon',
			] as BoxesDataColumn[]),

		download: z
			.union([z.string(), z.boolean()])
			.transform((v) => {
				if (typeof v === 'boolean') return v
				return v !== 'false' && v !== '0'
			})
			.default(true),

		delimiter: z.enum(['comma', 'semicolon']).default('comma'),
	})
	// Validate: must have boxid or bbox, but not both
	.superRefine((data, ctx) => {
		if (!data.boxid && !data.bbox && !data.grouptag) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'please specify either boxid, bbox or grouptag',
				path: ['boxid'],
			})
		}

		if (!data.phenomenon && !data.grouptag) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message:
					'phenomenon parameter is required when grouptag is not provided',
				path: ['phenomenon'],
			})
		}
	})

export type BoxesDataQueryParams = z.infer<typeof BoxesDataQuerySchemaBase>

/**
 * Parse and validate query parameters from request.
 * Supports both GET query params and POST JSON body.
 */
export async function parseBoxesDataQuery(
	request: Request,
): Promise<BoxesDataQueryParams> {
	const url = new URL(request.url)
	let params: Record<string, any>
	if (request.method !== 'GET') {
		const contentType = request.headers.get('content-type') || ''
		if (contentType.includes('application/json')) {
			try {
				params = await request.json()
			} catch {
				params = Object.fromEntries(url.searchParams)
			}
		} else {
			params = Object.fromEntries(url.searchParams)
		}
	} else {
		params = Object.fromEntries(url.searchParams)
	}

	const parseResult = BoxesDataQuerySchemaBase.safeParse(params)

	if (!parseResult.success) {
		const firstError = parseResult.error.issues[0]
		const message = firstError.message || 'Invalid query parameters'

		if (firstError.path.includes('bbox')) {
			throw StandardResponse.unprocessableContent(message)
		}
		throw StandardResponse.badRequest(message)
	}

	return parseResult.data
}

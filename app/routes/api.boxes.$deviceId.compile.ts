import { type Route } from './+types/api.boxes.$deviceId.compile'
import { logServerError } from '~/lib/sentry.server'

const COMPILER_URL = 'https://compiler.sensebox.de/compile'

export const action = async ({
	request,
	params,
}: Route.ActionArgs): Promise<Response> => {
	const { deviceId } = params
	if (!deviceId) {
		return Response.json(
			{ code: 'Bad Request', message: 'Invalid device id specified' },
			{ status: 400 },
		)
	}

	let body: { board: string; sketch: string }
	try {
		body = await request.json()
	} catch {
		return Response.json(
			{ code: 'Bad Request', message: 'Invalid JSON body' },
			{ status: 400 },
		)
	}

	if (!body.sketch) {
		return Response.json(
			{ code: 'Bad Request', message: 'No sketch provided' },
			{ status: 400 },
		)
	}

	let upstreamResponse: Response
	try {
		upstreamResponse = await fetch(COMPILER_URL, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				board: body.board ?? 'sensebox-mcu',
				sketch: body.sketch,
			}),
		})
	} catch (err) {
		logServerError('Compiler service request failed', err, {
			'app.operation': 'device.compile',
			'upstream.service': 'sensebox-compiler',
		})
		const message = err instanceof Error ? err.message : String(err)
		return Response.json(
			{
				code: 'Bad Gateway',
				message: `Compiler service unreachable: ${message}`,
			},
			{ status: 502 },
		)
	}

	if (!upstreamResponse.ok) {
		if (upstreamResponse.status >= 500) {
			logServerError(
				'Compiler service returned an error response',
				upstreamResponse,
				{
					'app.operation': 'device.compile',
					'upstream.service': 'sensebox-compiler',
				},
			)
		}

		const errorText = await upstreamResponse.text().catch(() => '')
		return Response.json(
			{
				code: 'Compile Error',
				message: errorText || `Compiler returned ${upstreamResponse.status}`,
			},
			{ status: upstreamResponse.status },
		)
	}

	const binary = await upstreamResponse.arrayBuffer()
	return new Response(binary, {
		status: 200,
		headers: {
			'Content-Type': 'application/octet-stream',
			'Content-Disposition': `attachment; filename="sketch-${deviceId}.bin"`,
		},
	})
}

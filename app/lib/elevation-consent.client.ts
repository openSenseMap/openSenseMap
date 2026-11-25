export async function withdrawElevationConsent() {
	const response = await fetch('/resources/elevation', {
		method: 'POST',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ consent: false }),
		keepalive: true,
	})

	if (!response.ok) {
		throw new Error('Could not withdraw elevation lookup consent.')
	}
}

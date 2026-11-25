export const apiMessages = {
	deviceIdRequired: 'Device ID is required.',
	deviceNotFound: 'Device not found.',
	invalidJwt: 'Invalid JWT authorization. Please sign in to obtain a new JWT.',
	internal:
		'The server was unable to complete your request. Please try again later.',
	passwordRequired: 'Password is required for device deletion',
	passwordIncorrect: 'Password incorrect',
	invalidJson: 'Invalid JSON in request body',
	invalidRequestData: 'Invalid request data',
	invalidFormat: 'Invalid format parameter',
	methodNotAllowed: 'Method Not Allowed',
	tokenRequired: 'You must specify a token to refresh',
	refreshTokenInvalid:
		'Refresh token invalid or too old. Please sign in with your username and password.',
} as const

export class StandardResponse {
	/**
	 * Creates a response object for a (json) success (ok) response
	 * @param data The data for the response
	 * @returns The response
	 */
	public static ok = (data: any): Response => this.successResponse(data, 200)

	/**
	 * Creates a response object for a (json) "created" response
	 * @param data The data for the response
	 * @returns The response
	 */
	public static created = (data: any): Response =>
		this.successResponse(data, 201)

	/**
	 * Creates a response object for a (json) "no content" response
	 * @returns The response
	 */
	public static noContent = (): Response => new Response(null, { status: 204 })

	/**
	 * Creates a response object for an arbitrary successful response
	 * @param data The data for the response
	 * @param status The status code
	 * @returns The response
	 */
	public static successResponse = (data: any, status: number): Response =>
		Response.json(data, {
			status: status,
			headers: { 'Content-Type': 'application/json; charset=utf-8' },
		})

	/**
	 * Creates a response object for a bad request
	 * @param message The message for the response
	 * @returns The response
	 */
	public static badRequest = (message: string): Response =>
		this.errorResponse('Bad Request', message, 400)

	/**
	 * Creates a response object for an unauthorized request
	 * @param message The message for the response
	 * @returns The response
	 */
	public static unauthorized = (message: string): Response =>
		this.errorResponse('Unauthorized', message, 401)

	/**
	 * Creates a response object for a forbidden request
	 * @param message The message for the response
	 * @returns The response
	 */
	// TODO: We often use this in cases where we previously returned the string
	// "unuathorized" but with response code 403. For a future v2 API, reevaluate
	// all places where this is returned and decide if 403 Forbidden or 401 Unauthorized should be returned.
	public static forbidden = (message: string): Response =>
		this.errorResponse('Forbidden', message, 403)

	/**
	 * Creates a response object for a 404
	 * @param message The message for the response
	 * @returns The response
	 */
	public static notFound = (message: string): Response =>
		this.errorResponse('Not Found', message, 404)

	/**
	 * Creates a response object for a request with a method that is not allowed
	 * @param message The message for the response
	 * @returns The response
	 */
	public static methodNotAllowed = (message: string): Response =>
		this.errorResponse('Method Not Allowed', message, 405)

	/**
	 * Creates a response object for a conflict response
	 * @param message The message for the response
	 * @returns The response
	 */
	public static conflict = (message: string): Response =>
		this.errorResponse('Conflict', message, 409)

	/**
	 * Creates a response object for a gone response
	 * @param message The message for the response
	 * @returns The response
	 */
	public static gone = (message: string): Response =>
		this.errorResponse('Gone', message, 410)

	/**
	 * Creates a response object for unsupported media type
	 * @param message The message for the response
	 * @returns The response
	 */
	public static unsupportedMediaType = (message: string): Response =>
		this.errorResponse('Unsupported Media Type', message, 415)

	/**
	 * Creates a response object for a bad gateway response
	 * @param message The message for the response
	 * @returns The response
	 */
	public static badGateway = (message: string): Response =>
		this.errorResponse('Bad Gateway', message, 502)

	/**
	 * Creates a response object for an unprocessable entity
	 * @param message The message for the response
	 * @returns The response
	 */
	public static unprocessableContent = (message: string): Response =>
		this.errorResponse('Unprocessable Content', message, 422)

	/**
	 * Creates a response object for an internal server error
	 * @param message The message for the response. Default:
	 *  The server was unable to complete your request. Please try again later.
	 * @returns The response
	 */
	public static internalServerError = (
		message = 'The server was unable to complete your request. Please try again later.',
	): Response => this.errorResponse('Internal Server Error', message, 500)

	/**
	 * Creates a response object for an arbitrary error
	 * @param error The error string for the response
	 * @param message The message for the response.
	 * @param status The error code
	 * @returns The response
	 */
	public static errorResponse = (
		error: string,
		message: string,
		status: number,
	) =>
		Response.json(
			{
				code: error,
				message: message,
				error: message,
			},
			{
				status: status,
				headers: {
					'Content-Type': 'application/json; charset=utf-8',
				},
			},
		)
}

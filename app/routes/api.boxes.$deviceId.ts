import { type ActionFunctionArgs, type LoaderFunctionArgs } from 'react-router'
import { transformDeviceToApiFormat } from '~/lib/device-transform'
import { deleteDevice } from '~/lib/devices-service.server'
import { getUserFromJwt } from '~/lib/jwt'
import {
	DeviceUpdateError,
	getDevice,
	updateDevice,
	type UpdateDeviceArgs,
} from '~/models/device.server'
import { type Device, type User } from '~/schema'
import { StandardResponse } from '~/utils/response-utils'

/**
 * @openapi
 * /api/device/{deviceId}:
 *   get:
 *     summary: Get device by ID
 *     description: Retrieve a single device by their unique identifier
 *     tags:
 *       - Device
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Unique identifier of the user
 *         schema:
 *           type: string
 *           example: "12345"
 *     responses:
 *       200:
 *         description: Device retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   example: "12345"
 *                 name:
 *                   type: string
 *                   example: "John Doe"
 *                 email:
 *                   type: string
 *                   example: "john.doe@example.com"
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                   example: "2023-01-15T10:30:00Z"
 *       404:
 *         description: Device not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Device not found"
 *       400:
 *         description: Device ID is required
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Device ID is required."
 *       500:
 *         description: Internal server error
 */
export async function loader({ params }: LoaderFunctionArgs) {
	const { deviceId } = params

	if (!deviceId) return StandardResponse.badRequest('Device ID is required.')

	try {
		const device = await getDevice({ id: deviceId })

		if (!device) return StandardResponse.notFound('Device not found.')

		return StandardResponse.ok(device)
	} catch (error) {
		console.error('Error fetching box:', error)

		if (error instanceof Response) {
			throw error
		}

		return new Response(
			JSON.stringify({ error: 'Internal server error while fetching box' }),
			{
				status: 500,
				headers: {
					'Content-Type': 'application/json; charset=utf-8',
				},
			},
		)
	}
}

export async function action({ request, params }: ActionFunctionArgs) {
	const { deviceId } = params

	if (!deviceId) {
		return Response.json({ error: 'Device ID is required.' }, { status: 400 })
	}

	const jwtResponse = await getUserFromJwt(request)

	if (typeof jwtResponse === 'string') {
		return Response.json(
			{
				code: 'Forbidden',
				message:
					'Invalid JWT authorization. Please sign in to obtain a new JWT.',
			},
			{ status: 403 },
		)
	}

	switch (request.method) {
		case 'PUT':
			return await put(request, jwtResponse, deviceId)
		case 'DELETE':
			return await del(request, jwtResponse, deviceId)
		default:
			return Response.json({ message: 'Method Not Allowed' }, { status: 405 })
	}
}

async function put(request: Request, user: any, deviceId: string) {
	const body = await request.json()

	const currentDevice = await getDevice({ id: deviceId })
	if (!currentDevice) {
		return Response.json(
			{ code: 'NotFound', message: 'Device not found' },
			{ status: 404 },
		)
	}

	// Check for conflicting parameters (backwards compatibility)
	if (body.sensors && body.addons?.add) {
		return Response.json(
			{
				code: 'BadRequest',
				message: 'sensors and addons can not appear in the same request.',
			},
			{ status: 400 },
		)
	}

	if (body.addons?.add === 'feinstaub') {
		const homeModels = ['homeWifi', 'homeEthernet']
		if (currentDevice.model && homeModels.includes(currentDevice.model)) {
			body.model = `${currentDevice.model}Feinstaub`

			const hasPM10 = currentDevice.sensors.some(
				(s) => s.sensorType === 'SDS 011' && s.title === 'PM10',
			)
			const hasPM25 = currentDevice.sensors.some(
				(s) => s.sensorType === 'SDS 011' && s.title === 'PM2.5',
			)

			if (!hasPM10 || !hasPM25) {
				body.sensors = [
					...(body.sensors ?? []),
					!hasPM10 && {
						new: true,
						title: 'PM10',
						unit: 'µg/m³',
						sensorType: 'SDS 011',
						// icon: 'osem-cloud',
					},
					!hasPM25 && {
						new: true,
						title: 'PM2.5',
						unit: 'µg/m³',
						sensorType: 'SDS 011',
						// icon: 'osem-cloud',
					},
				].filter(Boolean)
			}
		}
	}

	// Handle addons (merge with grouptag)
	if (body.addons?.add) {
		const currentTags = Array.isArray(body.grouptag) ? body.grouptag : []
		body.grouptag = Array.from(new Set([...currentTags, body.addons.add]))
	}

	// Handle image deletion
	if (body.deleteImage === true) {
		body.image = ''
	}

	// Prepare location if provided
	let locationData: { lat: number; lng: number; height?: number } | undefined
	if (body.location) {
		locationData = {
			lat: body.location.lat,
			lng: body.location.lng,
		}
		if (body.location.height !== undefined) {
			locationData.height = body.location.height
		}
	}

	const updateArgs: UpdateDeviceArgs = {
		name: body.name,
		exposure: body.exposure,
		description: body.description,
		image: body.image,
		model: body.model,
		useAuth: body.useAuth,
		link: body.weblink,
		location: locationData,
		grouptag: body.grouptag,
		sensors: body.sensors,
	}

	try {
		const updatedDevice = await updateDevice(deviceId, updateArgs)

		const deviceWithSensors = await getDevice({ id: updatedDevice.id })

		const apiResponse = transformDeviceToApiFormat(deviceWithSensors as any)

		return Response.json(apiResponse, { status: 200 })
	} catch (error) {
		console.error('Error updating device:', error)

		// Handle specific device update errors
		if (error instanceof DeviceUpdateError) {
			return Response.json(
				{
					code: error.statusCode === 400 ? 'BadRequest' : 'NotFound',
					message: error.message,
				},
				{ status: error.statusCode },
			)
		}

		// Return generic error for unexpected errors
		return Response.json(
			{
				code: 'InternalServerError',
				message:
					error instanceof Error ? error.message : 'Failed to update device',
			},
			{ status: 500 },
		)
	}
}

async function del(request: Request, user: User, deviceId: string) {
	const device = (await getDevice({ id: deviceId })) as unknown as Device

	if (!device) throw StandardResponse.notFound('Device not found')

	const body = await request.json()

	if (!body.password)
		throw StandardResponse.badRequest(
			'Password is required for device deletion',
		)

	try {
		const deleted = await deleteDevice(user, device, body.password)

		if (deleted === 'forbidden')
			return StandardResponse.forbidden(
				'Only the device owner can delete this device',
			)
		if (deleted === 'unauthorized')
			return StandardResponse.unauthorized('Password incorrect')
		if (deleted === 'integration-cleanup-failed')
			return StandardResponse.errorResponse(
				'Service Unavailable',
				'Could not remove device integrations. Please try deleting the device again later.',
				503,
			)

		return StandardResponse.ok(null)
	} catch (err) {
		console.warn(err)
		return StandardResponse.internalServerError()
	}
}

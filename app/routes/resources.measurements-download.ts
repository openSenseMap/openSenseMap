import { type Route } from './+types/resources.measurements-download'
import {
	createMeasurementExportResponse,
	measurementExportErrorResponse,
} from '~/services/measurement-export.server'

export async function loader({ request }: Route.LoaderArgs) {
	try {
		return await createMeasurementExportResponse(request)
	} catch (error) {
		return measurementExportErrorResponse(error)
	}
}

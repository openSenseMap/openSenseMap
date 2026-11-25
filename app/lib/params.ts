import { StandardResponse } from './responses'

/**
 * Parses a parameter from the url search paramaters into a date.
 * If the parameter doesn't exist, the default value is returned.
 * If the parameter is in a wrong format, an error response is returned.
 * @param url The url containing the date as a search parameter
 * @param paramName The name of the date parameter
 * @param defaultDate The default date, returned when the parameter doesn't exist
 * @returns Either the parsed date or a bad request response
 */
export function parseDateParam(
	url: URL,
	paramName: string,
	defaultDate: Date,
): Response | Date {
	const param = url.searchParams.get(paramName)
	if (param) {
		const date = new Date(param)
		if (Number.isNaN(date.valueOf()))
			return StandardResponse.badRequest(
				`Illegal value for parameter ${paramName}. Allowed values: RFC3339Date`,
			)
		return date
	}
	return defaultDate
}

/**
 * Parses a parameter from the url search paramaters into a string from a fixed set of options.
 * If the parameter doesn't exist, the default value is returned.
 * If the parameter is not one of the allowed values, an error response is returned.
 * @param url The url containing the enum value as a search parameter
 * @param paramName The name of the enum parameter
 * @param allowedValues The allowed values for the enum parameter
 * @param defaultValue The default value, returned when the parameter doesn't exist
 * @returns Either the parsed enum (string) or a bad request response
 */
export function parseEnumParam<DefaultType>(
	url: URL,
	paramName: string,
	allowedValues: string[],
	defaultValue: DefaultType,
): Response | string | DefaultType {
	const param = url.searchParams.get(paramName)
	if (param) {
		if (!allowedValues.includes(param))
			return StandardResponse.badRequest(
				`Illegal value for parameter ${paramName}. Allowed values: ${allowedValues}`,
			)
		return param
	}
	return defaultValue
}

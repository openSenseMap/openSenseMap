import * as z from 'zod/v4'
import { IsoDateTimeSchema } from '../openapi/schemas/common'

export const ExposureSchema = z
	.enum(['indoor', 'outdoor', 'mobile', 'unknown'])
	.meta({
		id: 'Exposure',
		description: 'Device exposure.',
		example: 'outdoor',
	})

export const OutputFormatSchema = z.enum(['json', 'csv']).default('json').meta({
	id: 'OutputFormat',
	description: 'Response format. Can be json or csv. Defaults to json.',
	example: 'json',
})

export const JsonGeoJsonFormatSchema = z
	.enum(['json', 'geojson'])
	.default('json')
	.meta({
		id: 'JsonGeoJsonOutputFormat',
		description: 'Response format. Can be json or geojson. Defaults to json.',
		example: 'json',
	})

export const CsvDelimiterValueSchema = z.enum(['comma', 'semicolon']).meta({
	id: 'CsvDelimiterValue',
	description: 'CSV delimiter value.',
	example: 'comma',
})

export const DelimiterSchema = CsvDelimiterValueSchema.default('comma').meta({
	id: 'Delimiter',
	description: 'CSV delimiter. Defaults to `comma`.',
	example: 'comma',
})

export const SeparatorSchema = CsvDelimiterValueSchema.optional().meta({
	id: 'Separator',
	description:
		'Legacy alias for `delimiter`. Do not use together with `delimiter`.',
	example: 'semicolon',
})

export const DownloadSchema = z
	.union([z.boolean(), z.enum(['true', 'false'])])
	.optional()
	.meta({
		id: 'Download',
		description:
			'If true, the response includes a Content-Disposition download header.',
		example: true,
	})

export const QueryDownloadSchema = z.enum(['true', 'false']).optional().meta({
	id: 'QueryDownload',
	description:
		'If true, the response includes a Content-Disposition download header.',
	example: 'true',
})

export const BboxTupleSchema = z
	.tuple([z.number(), z.number(), z.number(), z.number()])
	.meta({
		id: 'BboxTuple',
		description: 'Bounding box as [lngSW, latSW, lngNE, latNE].',
		example: [7.0, 51.0, 8.0, 52.0],
	})

export const QueryBboxSchema = z.string().optional().meta({
	id: 'QueryBbox',
	description:
		'Bounding box as comma-separated coordinates: lngSW,latSW,lngNE,latNE.',
	example: '7.0,51.0,8.0,52.0',
})

export const BboxSchema = z
	.union([QueryBboxSchema.unwrap(), BboxTupleSchema])
	.optional()
	.meta({
		id: 'Bbox',
		description:
			'Bounding box as comma-separated string or [lngSW, latSW, lngNE, latNE].',
	})

export const DateRangeQuerySchema = z.object({
	'from-date': IsoDateTimeSchema.optional().meta({
		description: 'Beginning of the time range.',
		example: '2026-05-13T12:00:00.000Z',
	}),
	'to-date': IsoDateTimeSchema.optional().meta({
		description: 'End of the time range.',
		example: '2026-05-15T12:00:00.000Z',
	}),
})

export const ColumnsQuerySchema = z.string().optional().meta({
	id: 'ColumnsQuery',
	description: 'Comma-separated list of columns to include in the output.',
	example: 'createdAt,value,boxId,boxName,sensorId,phenomenon,unit,lat,lon',
})

export const ColumnsBodySchema = z
	.union([z.string(), z.array(z.string())])
	.optional()
	.meta({
		id: 'Columns',
		description:
			'Columns to include in the output, either as comma-separated string or array.',
		example: ['createdAt', 'value', 'boxId', 'sensorId'],
	})

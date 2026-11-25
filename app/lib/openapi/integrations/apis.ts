import { type ZodOpenApiPathsObject } from 'zod-openapi'
import {
	healthResponseExample,
	mqttConfigRequestExample,
	ttnConfigRequestExample,
	mqttJsonSchemaExample,
} from './examples'

export const integrationPaths: ZodOpenApiPathsObject = {
	'/integrations/{deviceId}': {
		get: {
			summary: 'Get integration configuration for a device',
			description:
				'Returns the integration configuration associated with the given openSenseMap device ID.',
			tags: ['Integration Management'],
			parameters: [
				{
					$ref: '#/components/parameters/DeviceId',
				},
			],
			responses: {
				'200': {
					description: 'Integration configuration returned successfully.',
					content: {
						'application/json': {
							schema: {
								$ref: '#/components/schemas/IntegrationConfig',
							},
						},
					},
				},
				'401': {
					$ref: '#/components/responses/Unauthorized',
				},
				'404': {
					$ref: '#/components/responses/NotFound',
				},
				'500': {
					$ref: '#/components/responses/InternalError',
				},
			},
		},

		put: {
			summary: 'Create or update integration configuration',
			description:
				'Creates or updates the integration configuration for the given openSenseMap device ID.',
			tags: ['Integration Management'],
			parameters: [
				{
					$ref: '#/components/parameters/DeviceId',
				},
			],
			requestBody: {
				required: true,
				content: {
					'application/json': {
						schema: {
							$ref: '#/components/schemas/IntegrationConfigInput',
						},
						examples: {
							mqtt: {
								summary: 'MQTT integration configuration',
								value: mqttConfigRequestExample,
							},
							ttn: {
								summary: 'TTN integration configuration',
								value: ttnConfigRequestExample,
							},
						},
					},
				},
			},
			responses: {
				'200': {
					description: 'Integration configuration updated successfully.',
					content: {
						'application/json': {
							schema: {
								$ref: '#/components/schemas/IntegrationConfig',
							},
						},
					},
				},
				'201': {
					description: 'Integration configuration created successfully.',
					content: {
						'application/json': {
							schema: {
								$ref: '#/components/schemas/IntegrationConfig',
							},
						},
					},
				},
				'400': {
					$ref: '#/components/responses/ValidationError',
				},
				'401': {
					$ref: '#/components/responses/Unauthorized',
				},
				'500': {
					$ref: '#/components/responses/InternalError',
				},
			},
		},

		delete: {
			summary: 'Delete integration configuration',
			description:
				'Deletes the integration configuration for the given openSenseMap device ID.',
			tags: ['Integration Management'],
			parameters: [
				{
					$ref: '#/components/parameters/DeviceId',
				},
			],
			responses: {
				'204': {
					description: 'Integration configuration deleted successfully.',
				},
				'401': {
					$ref: '#/components/responses/Unauthorized',
				},
				'404': {
					$ref: '#/components/responses/NotFound',
				},
				'500': {
					$ref: '#/components/responses/InternalError',
				},
			},
		},
	},

	'/integrations/schema/{integrationName}': {
		get: {
			summary: 'Get JSON Schema for integration configuration form',
			description:
				'Returns a JSON Schema and optional UI Schema for rendering a configuration form for the requested integration type.',
			tags: ['Schema'],
			parameters: [
				{
					$ref: '#/components/parameters/IntegrationName',
				},
			],
			responses: {
				'200': {
					description: 'JSON Schema returned successfully.',
					content: {
						'application/json': {
							schema: {
								$ref: '#/components/schemas/JsonSchemaResponse',
							},
							examples: {
								mqtt: {
									summary: 'MQTT schema example',
									value: mqttJsonSchemaExample,
								},
							},
						},
					},
				},
				'401': {
					$ref: '#/components/responses/Unauthorized',
				},
				'404': {
					$ref: '#/components/responses/NotFound',
				},
				'500': {
					$ref: '#/components/responses/InternalError',
				},
			},
		},
	},

	'/health': {
		get: {
			summary: 'Health check endpoint',
			description:
				'Returns the health status of the integration service. This endpoint does not require authentication.',
			tags: ['Health'],
			security: [],
			responses: {
				'200': {
					description: 'Service is healthy.',
					content: {
						'application/json': {
							schema: {
								$ref: '#/components/schemas/HealthResponse',
							},
							example: healthResponseExample,
						},
					},
				},
			},
		},
	},
}

import { type ZodOpenApiObject } from 'zod-openapi'
import {
	errorExamples,
	mqttIntegrationConfigExample,
	mqttJsonSchemaExample,
} from './examples'

type OpenApiComponents = NonNullable<ZodOpenApiObject['components']>

export const integrationComponents = {
	securitySchemes: {
		ServiceKey: {
			type: 'apiKey',
			in: 'header',
			name: 'x-service-key',
			description: 'Service authentication key configured in openSenseMap.',
		},
	},

	parameters: {
		DeviceId: {
			name: 'deviceId',
			in: 'path',
			required: true,
			schema: {
				type: 'string',
			},
			description: 'openSenseMap device ID.',
			example: 'cm65qexample123',
		},

		IntegrationName: {
			name: 'integrationName',
			in: 'path',
			required: true,
			schema: {
				type: 'string',
			},
			description: 'Name of the integration type.',
			example: 'mqtt',
		},
	},

	schemas: {
		IntegrationConfig: {
			type: 'object',
			description:
				'Integration configuration. Common metadata fields may be present; integration-specific configuration fields are allowed.',
			properties: {
				id: {
					type: 'string',
					description: 'Integration configuration ID.',
					example: 'intg_123',
				},
				deviceId: {
					type: 'string',
					description: 'openSenseMap device ID.',
					example: 'cm65qexample123',
				},
				enabled: {
					type: 'boolean',
					description: 'Whether the integration is enabled.',
					example: true,
				},
			},
			additionalProperties: true,
			example: mqttIntegrationConfigExample,
		},

		IntegrationConfigInput: {
			type: 'object',
			description:
				'Configuration payload specific to the integration type. The exact shape should match the schema returned by /integrations/schema/{integrationName}.',
			additionalProperties: true,
		},

		JsonSchemaResponse: {
			type: 'object',
			description:
				'JSON Schema and optional UI Schema used to render a dynamic configuration form.',
			properties: {
				schema: {
					type: 'object',
					description: 'JSON Schema definition.',
					additionalProperties: true,
				},
				uiSchema: {
					type: 'object',
					description: 'React JSON Schema Form UI Schema.',
					additionalProperties: true,
				},
			},
			required: ['schema'],
			example: mqttJsonSchemaExample,
		},

		HealthResponse: {
			type: 'object',
			properties: {
				status: {
					type: 'string',
					example: 'healthy',
				},
				timestamp: {
					type: 'string',
					format: 'date-time',
				},
			},
			required: ['status'],
		},

		Error: {
			type: 'object',
			properties: {
				error: {
					type: 'string',
				},
				details: {
					type: 'array',
					items: {
						type: 'string',
					},
				},
			},
			required: ['error'],
		},
	},

	responses: {
		NotFound: {
			description: 'Resource not found.',
			content: {
				'application/json': {
					schema: {
						$ref: '#/components/schemas/Error',
					},
					example: errorExamples.notFound,
				},
			},
		},

		ValidationError: {
			description: 'Validation failed.',
			content: {
				'application/json': {
					schema: {
						$ref: '#/components/schemas/Error',
					},
					example: errorExamples.validation,
				},
			},
		},

		Unauthorized: {
			description: 'Unauthorized. Invalid or missing service key.',
			content: {
				'application/json': {
					schema: {
						$ref: '#/components/schemas/Error',
					},
					example: errorExamples.unauthorized,
				},
			},
		},

		InternalError: {
			description: 'Internal server error.',
			content: {
				'application/json': {
					schema: {
						$ref: '#/components/schemas/Error',
					},
					example: errorExamples.internalError,
				},
			},
		},
	},
} satisfies OpenApiComponents

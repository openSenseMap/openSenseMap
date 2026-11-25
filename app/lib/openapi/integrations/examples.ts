export const mqttIntegrationConfigExample = {
	id: 'intg_123',
	deviceId: 'cm65qexample123',
	enabled: true,
	url: 'mqtt://broker.example.com',
	topic: 'sensors/data',
	messageFormat: 'json',
	connectionOptions: {
		username: 'user',
		password: 'pass',
	},
}

export const ttnIntegrationConfigExample = {
	id: 'intg_456',
	deviceId: 'cm65qexample123',
	enabled: true,
	devId: 'my-device',
	appId: 'my-app',
	profile: 'cayenne-lpp',
}

export const mqttConfigRequestExample = {
	url: 'mqtt://broker.example.com:1883',
	topic: 'sensors/temperature',
	messageFormat: 'json',
	connectionOptions: {
		username: 'user',
		password: 'pass',
	},
}

export const ttnConfigRequestExample = {
	devId: 'my-device',
	appId: 'my-app',
	profile: 'cayenne-lpp',
}

export const mqttJsonSchemaExample = {
	schema: {
		type: 'object',
		required: ['url', 'topic', 'messageFormat'],
		properties: {
			url: {
				type: 'string',
				title: 'Broker URL',
				pattern: '^(mqtt|mqtts|ws|wss)://.+',
			},
			topic: {
				type: 'string',
				title: 'Topic',
			},
			messageFormat: {
				type: 'string',
				title: 'Message Format',
				enum: ['json', 'csv'],
			},
		},
	},
	uiSchema: {
		'ui:order': ['url', 'topic', 'messageFormat'],
	},
}

export const healthResponseExample = {
	status: 'healthy',
	timestamp: '2026-05-28T12:00:00.000Z',
}

export const errorExamples = {
	notFound: {
		error: 'Integration not found',
	},
	validation: {
		error: 'Validation failed',
		details: [
			'url is required and must be a string',
			'topic is required and must be a string',
		],
	},
	unauthorized: {
		error: 'Unauthorized',
	},
	internalError: {
		error: 'Internal server error',
	},
}

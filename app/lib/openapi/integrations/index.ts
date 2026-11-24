import { type ZodOpenApiObject } from 'zod-openapi'
import { integrationComponents } from './components'
import { integrationApiDescription } from './description'
import { integrationPaths } from './apis'

const integrationServers = [
	{
		url: 'https://your-integration-service.com',
		description: 'Your integration microservice',
	},
]

const integrationTags = [
	{
		name: 'Integration Management',
		description: 'CRUD operations for integration configurations.',
	},
	{
		name: 'Schema',
		description: 'JSON Schema for dynamic configuration forms.',
	},
	{
		name: 'Health',
		description: 'Service health check.',
	},
]

export const generateIntegrationApiSpec = (): ZodOpenApiObject => ({
	openapi: '3.1.0',

	info: {
		title: 'OpenSenseMap Integration Service Contract',
		version: '1.0.0',
		description: integrationApiDescription,
	},

	servers: integrationServers,

	components: integrationComponents,

	security: [
		{
			ServiceKey: [],
		},
	],

	tags: integrationTags,

	paths: integrationPaths,
})

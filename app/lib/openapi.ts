import {
	type ZodOpenApiPathItemObject,
	type ZodOpenApiPathsObject,
} from 'zod-openapi'
import { generateIntegrationApiSpec } from './openapi/integrations'

const DEV_SERVER = {
	url: 'http://localhost:3000',
	description: 'Development server',
}

const convertFilePathToApiPath = (filePath: string) => {
	// Extract filename and remove extension
	// /app/routes/api.users.$id.tsx -> api.users.$id
	const fileName =
		filePath
			.split('/')
			.pop()
			?.replace(/\.(tsx|ts|jsx|js)$/, '') || ''

	// Handle root routes
	if (fileName === 'root' || fileName === 'home' || fileName === 'index') {
		return '/'
	}

	// Convert dots to slashes (path separator convention)
	// api.users.$id -> api/users/$id
	let path = fileName.replace(/\./g, '/')

	// Convert $param to {param} for OpenAPI
	// api/users/$id -> api/users/{id}
	path = path.replace(/\$(\w+)/g, '{$1}')

	// Add leading slash
	return `/${path}`
}

export const generateOpenApiPathsSpec = (): ZodOpenApiPathsObject => {
	const routes = {
		...import.meta.glob<{
			openapi?: ZodOpenApiPathItemObject
			[key: string]: any
		}>('/app/routes/api.ts', { eager: true }),
		...import.meta.glob<{
			openapi?: ZodOpenApiPathItemObject
			[key: string]: any
		}>('/app/routes/api.*.ts', { eager: true }),
	}

	const paths: ZodOpenApiPathsObject = {}

	for (const [filePath, module] of Object.entries(routes)) {
		if (!module.openapi) continue

		const apiPath = convertFilePathToApiPath(filePath)

		// Merge methods into path
		paths[apiPath] = {
			...paths[apiPath],
			...module.openapi,
		}
	}

	return paths
}

export const generateOpenApiServerSpec = (): {
	url: string
	description: string
}[] => {
	return [
		...(process.env.NODE_ENV !== 'production' ? [DEV_SERVER] : []),
		{
			url: process.env.OSEM_API_URL,
			description: 'Production server',
		},
	]
}

export { generateIntegrationApiSpec }

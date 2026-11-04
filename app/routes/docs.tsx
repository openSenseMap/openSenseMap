import { useCallback, useState } from 'react'
import { useLoaderData } from 'react-router'
import SwaggerUI from 'swagger-ui-react'
import 'swagger-ui-react/swagger-ui.css'
import { createDocument } from 'zod-openapi'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '~/components/ui/select'
import {
	generateIntegrationApiSpec,
	generateOpenApiPathsSpec,
	generateOpenApiServerSpec,
} from '~/lib/openapi'

export const loader = () => {
	const doc = createDocument({
		openapi: '3.1.0',
		info: {
			title: 'openSenseMap API',
			version: '1.0.0',
			license: {
				name: 'Public Domain Dedication and License 1.0.',
				identifier: 'PDDL',
				url: 'https://opendatacommons.org/licenses/pddl/summary/',
			},
		},
		servers: generateOpenApiServerSpec(),
		paths: generateOpenApiPathsSpec(),
	})

	const integration = createDocument({ ...generateIntegrationApiSpec() })

	return { spec: doc, integrationSpec: integration }
}

export default function ApiDocumentation() {
	const { spec, integrationSpec } = useLoaderData<typeof loader>()
	const [currentSpec, setCurrentSpec] = useState(spec)

	const handleSpecSelect = useCallback(
		(value: string): void => {
			if (value === spec.info.title) setCurrentSpec(spec)
			if (value === integrationSpec.info.title) setCurrentSpec(integrationSpec)
		},
		[setCurrentSpec, spec, integrationSpec],
	)

	return (
		<main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
			<div className="flex justify-center p-3">
				<img
					src="./img/openSenseMap_API.png"
					alt="API Image"
					width={350}
					className="h-auto w-full max-w-87.5"
				/>
			</div>
			<div className="flex flex-col items-stretch justify-center gap-2 py-3 sm:flex-row sm:items-center sm:gap-4">
				<p className="shrink-0">Choose API:</p>
				<Select
					value={currentSpec.info.title}
					onValueChange={handleSpecSelect}
					name="spec"
				>
					<SelectTrigger className="w-full min-w-0 sm:w-auto sm:max-w-full [&>span]:truncate">
						<SelectValue />
					</SelectTrigger>

					<SelectContent>
						<SelectItem value={spec.info.title}>
							openSenseMap REST API
						</SelectItem>
						<SelectItem value={integrationSpec.info.title}>
							Integration Service Contract
						</SelectItem>
					</SelectContent>
				</Select>
			</div>
			<div className="max-w-full min-w-0 overflow-x-auto">
				<SwaggerUI
					spec={currentSpec}
					docExpansion="list"
					defaultModelsExpandDepth={1}
					deepLinking={true}
				/>
			</div>
		</main>
	)
}

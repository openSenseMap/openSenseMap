import { Link } from 'react-router'
import { Badge, type BadgeProps } from '~/components/ui/badge'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '~/components/ui/card'
import {
	getIntegrationServiceStatuses,
	type IntegrationServiceState,
} from '~/services/integration-service.server'
import { type Route } from './+types/admin.integrations'

const statePresentation: Record<
	IntegrationServiceState,
	{
		label: string
		description: string
		variant: BadgeProps['variant']
	}
> = {
	available: {
		label: 'Reachable',
		description: 'The service returned valid deployment metadata.',
		variant: 'default',
	},
	misconfigured: {
		label: 'Misconfigured',
		description: 'The configured service-key environment variable is missing.',
		variant: 'destructive',
	},
	unauthorized: {
		label: 'Unauthorized',
		description: 'The service rejected the configured service key.',
		variant: 'destructive',
	},
	unsupported: {
		label: 'Metadata unsupported',
		description:
			'The service is reachable but does not provide a /meta endpoint.',
		variant: 'secondary',
	},
	unreachable: {
		label: 'Unreachable',
		description:
			'The service could not be reached or did not respond within two seconds.',
		variant: 'destructive',
	},
	invalid_response: {
		label: 'Invalid response',
		description: 'The service response does not match the metadata contract.',
		variant: 'destructive',
	},
	service_error: {
		label: 'Service error',
		description: 'The service returned an unexpected error response.',
		variant: 'destructive',
	},
}

export async function loader(_args: Route.LoaderArgs) {
	return { services: await getIntegrationServiceStatuses() }
}

export default function AdminIntegrationsRoute({
	loaderData,
}: Route.ComponentProps) {
	const { services } = loaderData

	return (
		<div className="space-y-6">
			<div className="flex flex-wrap items-start justify-between gap-4">
				<div>
					<h2 className="text-2xl font-semibold">Integration services</h2>
					<p className="text-muted-foreground mt-1 text-sm">
						Deployment metadata reported by the configured microservices.
					</p>
				</div>
				<Link className="text-sm underline underline-offset-4" to="/admin">
					Back to admin
				</Link>
			</div>

			{services.length === 0 ? (
				<p className="text-muted-foreground">
					No integration services are configured.
				</p>
			) : (
				<div className="grid gap-4 lg:grid-cols-2">
					{services.map((service) => {
						const presentation = statePresentation[service.state]

						return (
							<Card key={service.id}>
								<CardHeader>
									<div className="flex items-start justify-between gap-4">
										<div className="min-w-0">
											<CardTitle>{service.name}</CardTitle>
											<CardDescription className="mt-1 break-all">
												{service.serviceUrl}
											</CardDescription>
										</div>
										<Badge variant={presentation.variant}>
											{presentation.label}
										</Badge>
									</div>
								</CardHeader>
								<CardContent>
									{service.metadata ? (
										<dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2 text-sm">
											<dt className="text-muted-foreground">Service</dt>
											<dd>{service.metadata.service}</dd>
											<dt className="text-muted-foreground">Revision</dt>
											<dd>
												<code className="break-all">
													{service.metadata.revision}
												</code>
											</dd>
										</dl>
									) : (
										<p className="text-muted-foreground text-sm">
											{presentation.description}
										</p>
									)}
								</CardContent>
							</Card>
						)
					})}
				</div>
			)}
		</div>
	)
}

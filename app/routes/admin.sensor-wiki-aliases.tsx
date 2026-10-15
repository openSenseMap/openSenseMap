import { Form, Link, redirect, useActionData } from 'react-router'
import invariant from 'tiny-invariant'
import { type Route } from './+types/admin.sensor-wiki-aliases'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Textarea } from '~/components/ui/textarea'
import {
	createSensorWikiAlias,
	deleteSensorWikiAlias,
	getSensorWikiAliasesForAdmin,
	seedMissingSensorWikiAliasesFromBundledEntries,
	updateSensorWikiAlias,
} from '~/db/models/sensor-wiki-alias.server'
import {
	createSensorWikiAliasKey,
	parseSensorWikiAliasList,
} from '~/lib/device-schemas/sensor-wiki-aliases'

type ActionData = {
	error?: boolean
	message?: string
	fieldErrors?: {
		sensorWikiPhenomenon?: string
		title?: string
	}
}

export async function loader() {
	const aliases = await getSensorWikiAliasesForAdmin()
	return { aliases }
}

export async function action({
	request,
}: Route.ActionArgs): Promise<Response | ActionData> {
	const formData = await request.formData()
	const intent = getString(formData, '_action')

	switch (intent) {
		case 'seed': {
			const insertedCount =
				await seedMissingSensorWikiAliasesFromBundledEntries()
			return {
				error: false,
				message: `Restored ${insertedCount} missing aliases from the bundled defaults.`,
			}
		}

		case 'create': {
			const parsed = parseAliasFormData(formData)
			if (parsed.error) return parsed.error

			try {
				await createSensorWikiAlias(parsed.value)
				return redirect('/admin/sensor-wiki-aliases')
			} catch (error) {
				return {
					error: true,
					message:
						error instanceof Error ? error.message : 'Failed to create alias.',
				}
			}
		}

		case 'update': {
			const id = getString(formData, 'id')
			invariant(id, 'Expected alias id')
			const parsed = parseAliasFormData(formData)
			if (parsed.error) return parsed.error

			try {
				await updateSensorWikiAlias(id, parsed.value)
				return redirect('/admin/sensor-wiki-aliases')
			} catch (error) {
				return {
					error: true,
					message:
						error instanceof Error ? error.message : 'Failed to update alias.',
				}
			}
		}

		case 'delete': {
			const id = getString(formData, 'id')
			invariant(id, 'Expected alias id')

			try {
				await deleteSensorWikiAlias(id)
				return redirect('/admin/sensor-wiki-aliases')
			} catch (error) {
				return {
					error: true,
					message:
						error instanceof Error ? error.message : 'Failed to delete alias.',
				}
			}
		}

		default:
			return {
				error: true,
				message: 'Unknown action.',
			}
	}
}

export default function AdminSensorWikiAliasesRoute({
	loaderData,
}: Route.ComponentProps) {
	const { aliases } = loaderData
	const actionData = useActionData<typeof action>()

	return (
		<div className="space-y-8">
			<div>
				<Link to="/admin" className="text-sm underline underline-offset-2">
					Back to admin
				</Link>
				<div className="mt-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
					<div>
						<h2 className="text-2xl font-semibold">Sensor-Wiki aliases</h2>
						<p className="text-muted-foreground mt-1 text-sm">
							The database migration seeds the bundled defaults. Runtime
							matching uses this table directly, and the restore action adds
							back any missing defaults.
						</p>
					</div>
					<Form method="post">
						<Button type="submit" name="_action" value="seed">
							Restore missing bundled aliases
						</Button>
					</Form>
				</div>
			</div>

			{actionData?.message ? (
				<p
					className={
						actionData.error
							? 'text-destructive text-sm'
							: 'text-sm text-green-700'
					}
				>
					{actionData.message}
				</p>
			) : null}

			<section className="rounded-md border p-4">
				<h3 className="text-lg font-medium">Create alias entry</h3>
				<AliasForm action="create" fieldErrors={actionData?.fieldErrors} />
			</section>

			<section className="space-y-4">
				<div className="flex items-center justify-between">
					<h3 className="text-lg font-medium">
						Alias entries ({aliases.length})
					</h3>
				</div>

				{aliases.length === 0 ? (
					<p className="text-muted-foreground rounded-md border p-4 text-sm">
						No aliases are configured, so alias suggestions and inferred
						matching are disabled. The migration normally seeds the bundled
						defaults; create entries manually or use the restore action.
					</p>
				) : (
					<div className="space-y-4">
						{aliases.map((alias) => (
							<div key={alias.id} className="rounded-md border p-4">
								<div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
									<div>
										<h4 className="font-medium">{alias.title}</h4>
										<p className="text-muted-foreground text-sm">
											{alias.sensorWikiPhenomenon}
											{alias.sensorWikiUnit ? ` / ${alias.sensorWikiUnit}` : ''}
										</p>
									</div>
									<Form method="post">
										<input type="hidden" name="id" value={alias.id} />
										<Button
											type="submit"
											name="_action"
											value="delete"
											variant="destructive"
											size="sm"
											onClick={(event) => {
												if (
													!window.confirm(
														`Delete alias entry "${alias.title}"?`,
													)
												) {
													event.preventDefault()
												}
											}}
										>
											Delete
										</Button>
									</Form>
								</div>
								<AliasForm
									action="update"
									alias={{
										id: alias.id,
										sensorWikiPhenomenon: alias.sensorWikiPhenomenon,
										sensorWikiUnit: alias.sensorWikiUnit ?? '',
										title: alias.title,
										unit: alias.unit ?? '',
										titleAliases: alias.titleAliases,
										unitAliases: alias.unitAliases,
										sensorTypeAliases: alias.sensorTypeAliases,
									}}
								/>
							</div>
						))}
					</div>
				)}
			</section>
		</div>
	)
}

function AliasForm({
	action,
	alias,
	fieldErrors,
}: {
	action: 'create' | 'update'
	alias?: {
		id: string
		sensorWikiPhenomenon: string
		sensorWikiUnit: string
		title: string
		unit: string
		titleAliases: string[]
		unitAliases: string[]
		sensorTypeAliases: string[]
	}
	fieldErrors?: ActionData['fieldErrors']
}) {
	return (
		<Form method="post" className="mt-4 space-y-4">
			{alias ? <input type="hidden" name="id" value={alias.id} /> : null}
			<div className="grid gap-4 md:grid-cols-2">
				<div>
					<Label htmlFor={`${action}-${alias?.id ?? 'new'}-phenomenon`}>
						Sensor-Wiki phenomenon
					</Label>
					<Input
						id={`${action}-${alias?.id ?? 'new'}-phenomenon`}
						name="sensorWikiPhenomenon"
						defaultValue={alias?.sensorWikiPhenomenon ?? ''}
						placeholder="relative_humidity"
					/>
					{fieldErrors?.sensorWikiPhenomenon ? (
						<p className="text-destructive mt-1 text-sm">
							{fieldErrors.sensorWikiPhenomenon}
						</p>
					) : null}
				</div>
				<div>
					<Label htmlFor={`${action}-${alias?.id ?? 'new'}-sensor-unit`}>
						Sensor-Wiki unit
					</Label>
					<Input
						id={`${action}-${alias?.id ?? 'new'}-sensor-unit`}
						name="sensorWikiUnit"
						defaultValue={alias?.sensorWikiUnit ?? ''}
						placeholder="%"
					/>
				</div>
				<div>
					<Label htmlFor={`${action}-${alias?.id ?? 'new'}-title`}>
						Display title
					</Label>
					<Input
						id={`${action}-${alias?.id ?? 'new'}-title`}
						name="title"
						defaultValue={alias?.title ?? ''}
						placeholder="Relative humidity"
					/>
					{fieldErrors?.title ? (
						<p className="text-destructive mt-1 text-sm">{fieldErrors.title}</p>
					) : null}
				</div>
				<div>
					<Label htmlFor={`${action}-${alias?.id ?? 'new'}-unit`}>
						Display unit
					</Label>
					<Input
						id={`${action}-${alias?.id ?? 'new'}-unit`}
						name="unit"
						defaultValue={alias?.unit ?? ''}
						placeholder="%"
					/>
				</div>
			</div>

			<div className="grid gap-4 md:grid-cols-3">
				<ArrayTextarea
					id={`${action}-${alias?.id ?? 'new'}-title-aliases`}
					name="titleAliases"
					label="Title aliases"
					values={alias?.titleAliases ?? []}
				/>
				<ArrayTextarea
					id={`${action}-${alias?.id ?? 'new'}-unit-aliases`}
					name="unitAliases"
					label="Unit aliases"
					values={alias?.unitAliases ?? []}
				/>
				<ArrayTextarea
					id={`${action}-${alias?.id ?? 'new'}-sensor-type-aliases`}
					name="sensorTypeAliases"
					label="Sensor type aliases"
					values={alias?.sensorTypeAliases ?? []}
				/>
			</div>

			<Button type="submit" name="_action" value={action}>
				{action === 'create' ? 'Create alias' : 'Save changes'}
			</Button>
		</Form>
	)
}

function ArrayTextarea({
	id,
	name,
	label,
	values,
}: {
	id: string
	name: string
	label: string
	values: string[]
}) {
	const descriptionId = `${id}-description`

	return (
		<div>
			<Label htmlFor={id}>{label}</Label>
			<p id={descriptionId} className="text-muted-foreground mb-1 text-xs">
				One alias per line. Commas are preserved.
			</p>
			<Textarea
				id={id}
				name={name}
				aria-describedby={descriptionId}
				defaultValue={values.join('\n')}
				className="font-mono text-xs"
				rows={6}
			/>
		</div>
	)
}

function parseAliasFormData(formData: FormData):
	| {
			value: {
				key: string
				sensorWikiPhenomenon: string
				sensorWikiUnit?: string | null
				title: string
				unit?: string | null
				titleAliases: string[]
				unitAliases: string[]
				sensorTypeAliases: string[]
			}
			error?: never
	  }
	| { value?: never; error: ActionData } {
	const sensorWikiPhenomenon = getString(
		formData,
		'sensorWikiPhenomenon',
	).trim()
	const sensorWikiUnit = emptyToNull(getString(formData, 'sensorWikiUnit'))
	const title = getString(formData, 'title').trim()
	const unit = emptyToNull(getString(formData, 'unit'))
	const fieldErrors: ActionData['fieldErrors'] = {}

	if (!sensorWikiPhenomenon) {
		fieldErrors.sensorWikiPhenomenon = 'Sensor-Wiki phenomenon is required.'
	}
	if (!title) fieldErrors.title = 'Display title is required.'

	if (fieldErrors.sensorWikiPhenomenon || fieldErrors.title) {
		return {
			error: {
				error: true,
				message: 'Please fix the highlighted fields.',
				fieldErrors,
			},
		}
	}

	return {
		value: {
			key: createSensorWikiAliasKey({
				sensorWikiPhenomenon,
				sensorWikiUnit,
			}),
			sensorWikiPhenomenon,
			sensorWikiUnit,
			title,
			unit,
			titleAliases: parseSensorWikiAliasList(
				getString(formData, 'titleAliases'),
			),
			unitAliases: parseSensorWikiAliasList(getString(formData, 'unitAliases')),
			sensorTypeAliases: parseSensorWikiAliasList(
				getString(formData, 'sensorTypeAliases'),
			),
		},
	}
}

function emptyToNull(value: string) {
	const trimmed = value.trim()
	return trimmed.length > 0 ? trimmed : null
}

function getString(formData: FormData, name: string) {
	const value = formData.get(name)
	return typeof value === 'string' ? value : ''
}

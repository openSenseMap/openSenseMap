import { zodResolver } from '@hookform/resolvers/zod'
import { defineStepper } from '@stepperize/react'
import { Info, Slash } from 'lucide-react'
import { type MouseEvent, useEffect, useState } from 'react'
import { type FieldErrors, FormProvider, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import {
	Form,
	useActionData,
	useLoaderData,
	useNavigation,
	useSubmit,
} from 'react-router'
import { z } from 'zod'
import { AdvancedStep } from './advanced-info'
import { DeviceSelectionStep } from './device-info'
import { GeneralInfoStep } from './general-info'
import { LocationStep } from './location-info'
import { SensorSelectionStep } from './sensors-info'
import { SummaryInfo } from './summary-info'
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbSeparator,
} from '~/components/ui/breadcrumb'
import { Button } from '~/components/ui/button'
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from '~/components/ui/tooltip'
import { useToast } from '~/components/ui/use-toast'
import { type action, type loader } from '~/routes/device.new'
import {
	advancedSchema,
	deviceSelectionSchema,
	newDeviceLocationSubmissionSchema,
	sensorSelectionSchema,
} from '~/lib/new-device-form'
import { generalInfoSchema, type GeneralInfoData } from '~/lib/device-general'

const formSchema = z.union([
	generalInfoSchema,
	newDeviceLocationSubmissionSchema,
	deviceSelectionSchema,
	sensorSelectionSchema,
	advancedSchema,
])

export const Stepper = defineStepper([
	{
		id: 'general-info',
		label: 'general_info',
		infoKey: 'general_information_text',
		schema: generalInfoSchema,
		index: 0,
	},
	{
		id: 'location',
		label: 'location',
		infoKey: 'location_info_text',
		schema: newDeviceLocationSubmissionSchema,
		index: 1,
	},
	{
		id: 'device-selection',
		label: 'device_selection',
		infoKey: 'device_selection_info_text',
		schema: deviceSelectionSchema,
		index: 2,
	},
	{
		id: 'sensor-selection',
		label: 'sensor_selection',
		infoKey: 'sensor_selection_info_text',
		schema: sensorSelectionSchema,
		index: 3,
	},
	{
		id: 'advanced',
		label: 'advanced',
		infoKey: null,
		schema: advancedSchema,
		index: 4,
	},
	{
		id: 'summary',
		label: 'summary',
		infoKey: null,
		schema: z.object({}),
		index: 5,
	},
])

type DeviceData = z.infer<typeof deviceSelectionSchema>
type SensorData = z.infer<typeof sensorSelectionSchema>
type AdvancedData = z.infer<typeof advancedSchema>
type LocationData = z.infer<typeof newDeviceLocationSubmissionSchema>

type FormData =
	| GeneralInfoData
	| LocationData
	| DeviceData
	| SensorData
	| AdvancedData

export default function NewDeviceStepper() {
	const { integrations, hasElevationConsent } = useLoaderData<typeof loader>()
	const submit = useSubmit()
	const [formData, setFormData] = useState<Record<string, any>>({})
	const stepper = Stepper.useStepper()
	const form = useForm({
		mode: 'onTouched',
		defaultValues: {
			elevationLookupConsent: hasElevationConsent,
		},
		resolver: zodResolver<
			z.input<typeof formSchema>,
			any,
			z.output<typeof formSchema>
		>(stepper.current.schema),
	})
	const { toast } = useToast()
	const { t } = useTranslation('newdevice')
	const [isFirst, setIsFirst] = useState(false)
	const navigation = useNavigation()
	const actionData = useActionData<typeof action>()
	const isSubmitting = navigation.state !== 'idle'

	useEffect(() => {
		setIsFirst(stepper.isFirst)
	}, [stepper.isFirst])

	useEffect(() => {
		if (!actionData || actionData.ok) return

		toast({
			title: t('device_creation_error'),
			description: t(actionData.error),
			variant: 'destructive',
		})
	}, [actionData, t, toast])

	const onSubmit = (data: FormData) => {
		const updatedData = {
			...formData,
			[stepper.current.id]: data,
		}

		setFormData(updatedData)

		if (stepper.isLast) {
			void submit(
				{
					formData: JSON.stringify(updatedData),
				},
				{ method: 'post' },
			)
		} else {
			void stepper.next()
		}
	}

	const onError = (errors: FieldErrors<FormData>) => {
		const firstError = Object.values(errors)[0]

		let message: string | undefined

		if (firstError && 'message' in firstError) {
			message = firstError.message as string | undefined
		}

		if (message) {
			toast({
				title: 'Form Error',
				description: t(message),
				variant: 'destructive',
				duration: 2000,
			})
		}
	}

	const onBack = () => {
		const parsed = stepper.current.schema.safeParse(form.getValues())

		if (parsed.success) {
			setFormData((current) => ({
				...current,
				[stepper.current.id]: parsed.data,
			}))
		}

		stepper.prev()
	}

	return (
		<Stepper.Provider>
			<FormProvider {...form}>
				<Form
					onSubmit={form.handleSubmit(onSubmit, onError)}
					className="bg-card flex h-full min-h-0 w-full max-w-5xl flex-col space-y-6 rounded-lg border p-4 sm:p-6"
				>
					<div className="shrink-0 space-y-4">
						{/* Breadcrumb Navigation */}
						<Breadcrumb className="w-full overflow-x-auto pb-2">
							<BreadcrumbList className="w-max flex-nowrap">
								{Stepper.steps.map((step, index) => {
									return (
										<div className="flex gap-2" key={index}>
											<BreadcrumbItem key={step.id}>
												<BreadcrumbLink
													onClick={() => {
														if (stepper.current.id === step.id) return

														void form.handleSubmit((data) => {
															setFormData((current) => ({
																...current,
																[stepper.current.id]: data,
															}))
															stepper.goTo(step.id)
														}, onError)()
													}}
													className={` ${
														stepper.index === step.index
															? 'text-foreground font-bold'
															: 'hover:text-foreground text-muted-foreground cursor-pointer'
													} `}
												>
													{t(step.label)}
												</BreadcrumbLink>
											</BreadcrumbItem>

											{index < Stepper.steps.length - 1 && (
												<BreadcrumbSeparator>
													<Slash className="h-4 w-4" />
												</BreadcrumbSeparator>
											)}
										</div>
									)
								})}
							</BreadcrumbList>
						</Breadcrumb>

						{/* Step Header with Info */}
						<div className="flex items-center justify-start gap-2">
							<h2 className="text-lg font-medium">
								{t('step')} {stepper.index + 1} {t('of')} {Stepper.steps.length}
								: {t(stepper.current.label)}
							</h2>
							{stepper.current.infoKey && (
								<Tooltip>
									<TooltipTrigger
										type="button"
										onClick={(event: MouseEvent<HTMLButtonElement>) => {
											event.preventDefault()
											event.stopPropagation()
										}}
									>
										<Info />
									</TooltipTrigger>
									<TooltipContent>{t(stepper.current.infoKey)}</TooltipContent>
								</Tooltip>
							)}
						</div>
					</div>

					{/* Form Content */}
					<div className="min-h-0 flex-1 overflow-auto">
						{stepper.match({
							advanced: () => <AdvancedStep integrations={integrations} />,
							'general-info': () => <GeneralInfoStep />,
							location: () => <LocationStep />,
							'device-selection': () => <DeviceSelectionStep />,
							'sensor-selection': () => <SensorSelectionStep />,
							summary: () => <SummaryInfo />,
						})}
					</div>

					{/* Navigation Buttons */}
					<div className="mt-4 flex shrink-0 justify-between">
						<Button
							type="button"
							variant="secondary"
							onClick={onBack}
							disabled={isFirst || isSubmitting}
						>
							{t('back')}
						</Button>
						<Button type="submit" disabled={isSubmitting}>
							{isSubmitting
								? t('submitting')
								: stepper.isLast
									? t('complete')
									: t('next')}
						</Button>
					</div>
				</Form>
			</FormProvider>
		</Stepper.Provider>
	)
}

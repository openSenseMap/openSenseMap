import { X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useFormContext } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Button } from '~/components/ui/button'
import { Card, CardContent } from '~/components/ui/card'
import { Label } from '~/components/ui/label'
import { RadioGroup, RadioGroupItem } from '~/components/ui/radio-group'
import { Separator } from '~/components/ui/separator'
import { cn } from '~/lib/utils'

const devices = [
	{
		name: 'senseBox:Home',
		image: '/img/device_images/senseBox_Home.jpg',
		imageHasPadding: true,
	},
	{
		name: 'senseBox:Edu',
		image: '/img/device_images/senseBox_edu.jpg',
		imageHasPadding: true,
	},
	{
		name: 'luftdaten.info',
		label: 'Sensor.Community',
		image:
			'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGNsYXNzPSJsdWNpZGUgbHVjaWRlLXdpbmQiPjxwYXRoIGQ9Ik0xMi44IDE5LjZBMiAyIDAgMSAwIDE0IDE2SDIiLz48cGF0aCBkPSJNMTcuNSA4YTIuNSAyLjUgMCAxIDEgMiA0SDIiLz48cGF0aCBkPSJNOS44IDQuNEEyIDIgMCAxIDEgMTEgOEgyIi8+PC9zdmc+',
		imageHasPadding: false,
	},
	{
		name: 'custom',
		image:
			'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGNsYXNzPSJsdWNpZGUgbHVjaWRlLXdyZW5jaCI+PHBhdGggZD0iTTE0LjcgNi4zYTEgMSAwIDAgMCAwIDEuNGwxLjYgMS42YTEgMSAwIDAgMCAxLjQgMGwzLjc3LTMuNzdhNiA2IDAgMCAxLTcuOTQgNy45NGwtNi45MSA2LjkxYTIuMTIgMi4xMiAwIDAgMS0zLTNsNi45MS02LjkxYTYgNiAwIDAgMSA3Ljk0LTcuOTRsLTMuNzYgMy43NnoiLz48L3N2Zz4=',
		imageHasPadding: false,
	},
]

const connectionTypes = ['Wifi', 'Lora', 'Ethernet']

export function DeviceSelectionStep() {
	const { setValue, watch } = useFormContext()
	const { t } = useTranslation('newdevice')

	// Watch the existing values from the form state
	const model = watch('model')

	// Initialize component state with form values
	const [selectedDevice, setSelectedDevice] = useState(model || null)
	const [selectedConnectionType, setSelectedConnectionType] = useState('')

	useEffect(() => {
		if (
			model === 'homeV2Wifi' ||
			model === 'homeV2Ethernet' ||
			model === 'homeV2Lora'
		) {
			setSelectedDevice('senseBox:Home')
			const connectionMap: Record<string, string> = {
				homeV2Wifi: 'Wifi',
				homeV2Ethernet: 'Ethernet',
				homeV2Lora: 'Lora',
			}
			setSelectedConnectionType(connectionMap[model] || '')
		} else {
			setSelectedDevice(model || '')
			setSelectedConnectionType('')
		}
	}, [model])

	const handleDeviceChange = (value: string) => {
		setValue('selectedSensors', null) // Reset the selected sensors
		if (selectedDevice === value) {
			// Deselect the currently selected device
			setSelectedDevice(null)
			setValue('model', '') // Reset the model
		} else {
			// Select a new device
			setSelectedDevice(value)

			// Set the model for the selected device
			if (value === 'senseBox:Home') {
				setValue('model', 'homeV2Wifi') // Default to a valid connection type for Home
			} else {
				setValue('model', value) // Set model to the selected device name
			}
		}
	}

	const handleConnectionTypeChange = (type: string) => {
		// Dynamically set the model based on the connection type
		const modelMap: Record<string, string> = {
			Wifi: 'homeV2Wifi',
			Ethernet: 'homeV2Ethernet',
			Lora: 'homeV2Lora',
		}
		setValue('model', modelMap[type])
		setSelectedConnectionType(type) // Update local state
	}

	const handleClose = () => {
		setSelectedDevice(null)
		setSelectedConnectionType('')
		setValue('model', null)
	}

	const isConfiguringSenseBoxHome = selectedDevice === 'senseBox:Home'

	return (
		<div className="overflow-hidden p-4">
			<div
				className={cn(
					'grid gap-6',
					isConfiguringSenseBoxHome
						? 'grid-cols-1'
						: 'grid-cols-1 lg:grid-cols-2',
				)}
			>
				{devices.map((device) => {
					if (isConfiguringSenseBoxHome && device.name !== selectedDevice)
						return null

					return (
						<Card
							key={device.name}
							role="button"
							tabIndex={0}
							className={cn(
								'border-border bg-card text-card-foreground relative transform cursor-pointer overflow-hidden rounded-xl border transition-all duration-300 ease-in-out',
								'hover:border-primary/40 hover:bg-muted/40 hover:-translate-y-0.5 hover:shadow-md',
								'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
								selectedDevice === device.name &&
									'border-primary bg-primary/10 ring-primary/40 shadow-sm ring-2',
							)}
							onClick={() => {
								if (isConfiguringSenseBoxHome) {
									return
								}
								handleDeviceChange(device.name)
							}}
							onKeyDown={(event) => {
								if (event.key === 'Enter' || event.key === ' ') {
									event.preventDefault()

									if (isConfiguringSenseBoxHome) {
										return
									}

									handleDeviceChange(device.name)
								}
							}}
						>
							<CardContent className="flex flex-row p-0">
								<div className="border-border flex w-24 shrink-0 items-center justify-center border-r bg-white">
									<img
										src={device.image}
										alt={'label' in device ? device.label : device.name}
										className={cn(
											'h-full w-full',
											device.imageHasPadding
												? 'object-cover'
												: 'object-contain p-4',
										)}
									/>
								</div>

								<div className="flex min-w-0 flex-1 flex-col justify-center p-3">
									{isConfiguringSenseBoxHome && (
										<Button
											variant="ghost"
											size="icon"
											className="text-muted-foreground hover:bg-muted hover:text-foreground absolute top-2 right-2"
											onClick={(e) => {
												e.stopPropagation()
												handleClose()
											}}
										>
											<X className="h-4 w-4" />
										</Button>
									)}

									<h3 className="text-foreground text-lg font-semibold wrap-break-word">
										{'label' in device ? device.label : device.name}
									</h3>

									{device.name === 'senseBox:Home' &&
										selectedDevice === 'senseBox:Home' && (
											<>
												<Separator className="my-2" />

												<div className="w-full max-w-xs">
													<h4 className="text-muted-foreground mb-2 text-sm font-medium">
														{t('connection_type')}
													</h4>

													<RadioGroup
														value={selectedConnectionType}
														onValueChange={(value) =>
															handleConnectionTypeChange(value)
														}
														className="flex flex-col space-y-1"
													>
														{connectionTypes.map((type) => (
															<div
																key={type}
																className="flex items-center space-x-2"
															>
																<RadioGroupItem value={type} id={type} />
																<Label
																	htmlFor={type}
																	className="text-foreground text-sm"
																>
																	{type}
																</Label>
															</div>
														))}
													</RadioGroup>
												</div>
											</>
										)}
								</div>
							</CardContent>
						</Card>
					)
				})}
			</div>
		</div>
	)
}

import { Plus, Cloud, Home, HelpCircle, Bike, X, Info } from 'lucide-react'
import React, { useState } from 'react'
import { useFormContext, useFieldArray } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MarkdownContent } from '~/components/markdown-content'
import { Badge } from '~/components/ui/badge'
import { Checkbox } from '~/components/ui/checkbox'
import { Label } from '~/components/ui/label'
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from '~/components/ui/tooltip'
import { cn } from '~/lib/utils'

type ExposureOption = 'outdoor' | 'indoor' | 'mobile' | 'unknown'

export function GeneralInfoStep() {
	const { register, control, setValue, getValues, watch } = useFormContext()
	const { t } = useTranslation('newdevice')
	const { fields, append, remove } = useFieldArray({
		control,
		name: 'tags', // Tags array
	})

	const description = watch('description') || ''

	const currentExposure = watch('exposure') // Watch exposure value

	// State for temporary expiration date
	const [temporaryExpirationDate, setTemporaryExpirationDate] = useState<
		string | null
	>(watch('temporaryExpirationDate') || null)

	const maxExpirationDate = new Date()
	maxExpirationDate.setMonth(maxExpirationDate.getMonth() + 1)

	const handleTemporaryChange = (checked: boolean) => {
		if (checked) {
			const newDate = maxExpirationDate.toISOString().split('T')[0]
			setTemporaryExpirationDate(newDate) // Update local state
			setValue('temporaryExpirationDate', newDate) // Update form value
		} else {
			setTemporaryExpirationDate(null) // Clear local state
			setValue('temporaryExpirationDate', '') // Clear form value
		}
	}

	const handleExpirationDateChange = (date: string) => {
		setTemporaryExpirationDate(date) // Update local state
		setValue('temporaryExpirationDate', date) // Update form value
	}

	const addTag = (event: React.FormEvent) => {
		event.preventDefault()
		const tagInput = document.getElementById('tag-input') as HTMLInputElement
		if (tagInput?.value.trim()) {
			append({ value: tagInput.value.trim() }) // Append a new tag object
			tagInput.value = '' // Clear input
		}
	}

	const exposureOptions: {
		value: ExposureOption
		icon: React.ReactNode
		label: string
	}[] = [
		{
			value: 'outdoor',
			icon: <Cloud className="h-6 w-6" />,
			label: t('outdoor'),
		},
		{ value: 'indoor', icon: <Home className="h-6 w-6" />, label: t('indoor') },
		{
			value: 'mobile',
			icon: <Bike className="h-6 w-6" />,
			label: t('mobile'),
		},
		{
			value: 'unknown',
			icon: <HelpCircle className="h-6 w-6" />,
			label: t('unknown'),
		},
	]

	return (
		<div className="flex h-full flex-col space-y-4 p-2">
			<div>
				<Label htmlFor="name">Name</Label>
				<Input
					defaultValue={watch('name')} // Set default value from form state
					id="name"
					{...register('name')}
					className="w-full rounded-md border p-2"
				/>
			</div>
			<div className="grid gap-4 lg:grid-cols-2">
				<div className="space-y-2">
					<Label htmlFor="description">{t('description')}</Label>
					<textarea
						id="description"
						{...register('description')}
						maxLength={5000}
						placeholder={`## ${t('my_station')}

		${t('installed_on_roof')}

		- PM2.5
		- Temperature

		[${t('project_website')}](https://example.com)`}
						className="min-h-55 w-full rounded-md border p-3 font-mono text-sm"
					/>
					<div className="text-muted-foreground text-sm">
						{description.length} / 5000
					</div>
					<div className="text-muted-foreground text-sm">
						{t('markdown_supported')}
					</div>
				</div>

				<div className="space-y-2">
					<Label>{t('preview')}</Label>
					<div className="min-h-55 rounded-md border p-3">
						{description.trim() ? (
							<MarkdownContent>{description}</MarkdownContent>
						) : (
							<p className="text-muted-foreground text-sm">
								{t('nothing_to_preview')}
							</p>
						)}
					</div>
				</div>
			</div>
			<div>
				<Label htmlFor="exposure">{t('exposure')}</Label>
				<div className="mt-2 flex flex-wrap gap-2">
					{exposureOptions.map((option) => (
						<Button
							key={option.value}
							type="button"
							onClick={() => setValue('exposure', option.value)}
							variant="outline"
							aria-pressed={currentExposure === option.value}
							className={cn(
								'flex items-center gap-2 transition-all duration-200 ease-in-out',
								currentExposure === option.value
									? [
											'border-primary bg-primary/10 text-primary ring-primary/40 shadow-md ring-2',
											'hover:bg-primary/15',
											'dark:border-primary dark:bg-primary/20 dark:text-primary dark:hover:bg-primary/25',
										]
									: 'hover:bg-muted',
							)}
						>
							{option.icon}
							<span className="text-sm">{option.label}</span>
						</Button>
					))}
				</div>
			</div>
			<div className="space-y-2">
				<div className="flex flex-col gap-4 sm:flex-row sm:items-center">
					<div className="flex items-center space-x-2">
						<Checkbox
							id="isTemporary"
							checked={!!temporaryExpirationDate}
							onCheckedChange={handleTemporaryChange}
						/>
						<Label htmlFor="isTemporary" className="text-base font-medium">
							{t('temporary')}
						</Label>

						<Tooltip>
							<TooltipTrigger
								type="button"
								onClick={(e) => {
									e.preventDefault()
									e.stopPropagation()
								}}
							>
								<Info />
							</TooltipTrigger>
							<TooltipContent>
								{
									<p className="text-sm text-gray-500">
										{t('temporary_info_text')}
									</p>
								}
							</TooltipContent>
						</Tooltip>
					</div>
					{temporaryExpirationDate && (
						<div className="flex min-w-0 grow flex-col gap-2 sm:flex-row sm:items-center">
							<Label
								htmlFor="temporaryExpirationDate"
								className="text-sm font-medium whitespace-nowrap"
							>
								{t('expiration_date')}
							</Label>
							<Input
								type="date"
								id="temporaryExpirationDate"
								value={temporaryExpirationDate}
								onChange={(e) => handleExpirationDateChange(e.target.value)}
								min={new Date().toISOString().split('T')[0]}
								max={maxExpirationDate.toISOString().split('T')[0]}
								className="grow rounded-md border p-2"
							/>
						</div>
					)}
				</div>
			</div>
			<div className="space-y-2">
				<Label htmlFor="tag-input" className="text-base">
					Tags:
				</Label>
				<div className="flex space-x-2">
					<Input
						id="tag-input"
						type="text"
						placeholder={t('add_tag')}
						onKeyDown={(e) => {
							if (e.key === 'Enter') {
								e.preventDefault()
								addTag(e) // Call addTag on Enter key
							}
						}}
					/>
					<Button variant={'outline'} onClick={addTag} aria-label="Add tag">
						<Plus className="h-4 w-4" />
					</Button>
				</div>
				<div className="flex flex-wrap gap-2 pt-2">
					{fields.map((field, index) => (
						<Badge
							key={field.id}
							variant="secondary"
							className="flex items-center text-sm"
						>
							{getValues(`tags.${index}.value`)}
							<button
								onClick={() => remove(index)}
								className="ml-2 flex items-center justify-center text-xs"
								aria-label="Remove tag"
							>
								<X className="h-3 w-3" />
							</button>
						</Badge>
					))}
				</div>
			</div>
		</div>
	)
}

import { Check, ChevronsUpDown, X } from 'lucide-react'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from '~/components/ui/command'
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '~/components/ui/popover'
import { Label } from '~/components/ui/label'
import { cn } from '~/lib/utils'
import { useTranslation } from 'react-i18next'

interface FilterTagsProps {
	tags: string[]
	availableTags: string[] | undefined
	onTagsChange: (tags: string[]) => void
}

export default function FilterTags({
	tags,
	availableTags,
	onTagsChange,
}: FilterTagsProps) {
	const { t } = useTranslation('filter')
	const toggleTag = (tag: string) => {
		if (tags.includes(tag)) {
			onTagsChange(tags.filter((currentTag) => currentTag !== tag))
			return
		}

		onTagsChange([...tags, tag])
	}

	const removeTag = (tag: string) => {
		onTagsChange(tags.filter((currentTag) => currentTag !== tag))
	}

	return (
		<div className="grid gap-1.5 md:grid-cols-[5.5rem_1fr] md:items-start">
			<Label className="pt-2 text-sm text-gray-600 dark:text-zinc-400">
				Tags
			</Label>

			<div className="min-w-0 space-y-2">
				<Popover>
					<PopoverTrigger asChild>
						<Button
							type="button"
							variant="outline"
							role="combobox"
							className="h-8 w-full justify-between px-2 text-sm font-normal"
						>
							<span className="truncate">
								{tags.length > 0
									? `${tags.length} ${t('tag')}${tags.length === 1 ? '' : 's'} ${t('selected')}`
									: `${t('select_tags')}`}
							</span>

							<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
						</Button>
					</PopoverTrigger>

					<PopoverContent
						align="start"
						className="w-[--radix-popover-trigger-width] p-0"
					>
						<Command>
							<CommandInput placeholder={t('search_tags')} />

							<CommandList>
								<CommandEmpty>{t('no_tag_found')}</CommandEmpty>

								<CommandGroup>
									{availableTags?.map((tag) => {
										const selected = tags.includes(tag)

										return (
											<CommandItem
												key={tag}
												value={tag}
												onSelect={() => toggleTag(tag)}
											>
												<Check
													className={cn(
														'mr-2 h-4 w-4',
														selected ? 'opacity-100' : 'opacity-0',
													)}
												/>

												<span className="truncate">{tag}</span>
											</CommandItem>
										)
									})}
								</CommandGroup>
							</CommandList>
						</Command>
					</PopoverContent>
				</Popover>

				{tags.length > 0 && (
					<div className="flex flex-wrap gap-1.5">
						{tags.map((tag) => (
							<Badge key={tag} variant="secondary" className="text-xs">
								<span className="max-w-40 truncate">{tag}</span>

								<button
									type="button"
									onClick={() => removeTag(tag)}
									className="hover:text-destructive ml-1 rounded-full"
									aria-label={`Remove ${tag} tag`}
								>
									<X className="h-3 w-3" />
								</button>
							</Badge>
						))}
					</div>
				)}
			</div>
		</div>
	)
}

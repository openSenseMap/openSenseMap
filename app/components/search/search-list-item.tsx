import { type VariantProps, cva } from 'class-variance-authority'
import { type HTMLProps } from 'react'

export type HeroIcon = React.ComponentType<
	React.PropsWithoutRef<React.ComponentProps<'svg'>> & {
		title?: string | undefined
		titleId?: string | undefined
	}
>

interface SearchListItemProps
	extends VariantProps<typeof searchListItemStyle>, HTMLProps<HTMLDivElement> {
	index: number
	controlPress: boolean
	icon: HeroIcon
	name: string
}

const searchListItemStyle = cva(
	'data-[active=true]:bg-light-green relative my-1 flex h-8 items-center gap-2 rounded-lg px-2 data-[active=true]:text-white',
	{
		variants: {
			active: {
				true: 'bg-light-green text-white',
			},
		},
	},
)

export default function SearchListItem({
	active,
	index,
	controlPress,
	icon,
	name,
	...props
}: SearchListItemProps) {
	const Icon = icon

	return (
		<div className={searchListItemStyle({ active })} {...props}>
			{controlPress && (
				<div className="w-6">
					<kbd>{index + 1}</kbd>
				</div>
			)}
			<div className="h-8 w-8 p-1">
				<Icon className="h-full" />
			</div>
			<span className="inline-block overflow-hidden align-middle text-ellipsis whitespace-nowrap">
				{name}
			</span>
		</div>
	)
}

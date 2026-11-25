import { useLocation, Link } from 'react-router'
import { buttonVariants } from '~/components/ui/button'
import { cn } from '~/lib/utils'

interface SidebarNavProps extends React.HTMLAttributes<HTMLElement> {
	items: {
		href: string
		title: string
		icon: any
	}[]
}

export function EditDeviceSidebarNav({
	className,
	items,
	...props
}: SidebarNavProps) {
	const pathname = useLocation().pathname

	return (
		<nav
			className={cn(
				'flex w-full gap-2 overflow-x-auto pb-2 lg:flex-col lg:gap-1 lg:overflow-visible lg:pb-0',
				className,
			)}
			{...props}
		>
			{items.map((item) => (
				<Link
					key={item.href}
					to={item.href}
					prefetch="intent"
					className={cn(
						buttonVariants({ variant: 'ghost' }),
						pathname === item.href
							? 'bg-muted hover:bg-muted'
							: 'hover:bg-transparent hover:underline',
						'shrink-0 justify-start text-base lg:w-full',
					)}
				>
					<item.icon className="mr-2 inline h-5 w-5 align-sub" />
					{item.title}
				</Link>
			))}
		</nav>
	)
}

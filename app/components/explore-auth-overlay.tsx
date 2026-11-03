import { type ComponentProps, ViewTransition } from 'react'
import { Link } from 'react-router'
import { Card } from '~/components/ui/card'
import { cn } from '~/lib/utils'

type ExploreAuthOverlayBackdropProps = {
	to: ComponentProps<typeof Link>['to']
}

export function ExploreAuthOverlayBackdrop({
	to,
}: ExploreAuthOverlayBackdropProps) {
	return (
		<ViewTransition
			name="explore-auth-backdrop"
			default="none"
			enter="explore-overlay-backdrop"
			exit="explore-overlay-backdrop"
			share="none"
		>
			<Link
				to={to}
				aria-label="Close"
				className="absolute inset-0 z-40 h-full w-full bg-black opacity-25"
			/>
		</ViewTransition>
	)
}

export function ExploreAuthOverlayCard({
	children,
	className,
	...props
}: ComponentProps<typeof Card>) {
	return (
		<ViewTransition
			name="explore-auth-dialog"
			default="none"
			enter="explore-auth-dialog"
			exit="explore-auth-dialog"
			share="explore-auth-dialog"
		>
			<div className="pointer-events-none absolute inset-0 z-50 flex h-full w-full items-start justify-center overflow-y-auto p-4 sm:items-center">
				<Card className={cn('pointer-events-auto', className)} {...props}>
					{children}
				</Card>
			</div>
		</ViewTransition>
	)
}

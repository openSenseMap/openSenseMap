import { type ComponentProps, ViewTransition } from 'react'
import { Link } from 'react-router'
import { Card } from '~/components/ui/card'

type ExploreAuthOverlayBackdropProps = {
	to: ComponentProps<typeof Link>['to']
}

export function ExploreAuthOverlayBackdrop({
	to,
}: ExploreAuthOverlayBackdropProps) {
	return (
		<Link to={to}>
			<ViewTransition
				name="explore-auth-backdrop"
				default="none"
				enter="explore-overlay-backdrop"
				exit="explore-overlay-backdrop"
				share="none"
			>
				<div className="absolute inset-0 z-40 h-full w-full bg-black opacity-25" />
			</ViewTransition>
		</Link>
	)
}

export function ExploreAuthOverlayCard({
	children,
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
			<Card {...props}>{children}</Card>
		</ViewTransition>
	)
}

import { cva, type VariantProps } from 'class-variance-authority'
import {
	type LucideIcon,
	LucideInfo,
	LucideLightbulb,
	LucideMessageCircleWarning,
	LucideTriangleAlert,
	LucideOctagonAlert,
} from 'lucide-react'
import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

const alertVariants = cva(
	'relative w-full rounded-md border border-slate-200 p-4 dark:border-slate-800 [&:has(svg)]:pl-12 [&>svg]:absolute [&>svg]:top-4 [&>svg]:left-4 [&>svg]:text-slate-950 dark:[&>svg]:text-slate-50 [&>svg+div]:translate-y-[-3px]',
	{
		variants: {
			variant: {
				default:
					'dark:bg-dark-boxes dark:text-dark-text bg-white text-slate-950',
				destructive:
					'border-red-500/50 text-red-500 dark:border-red-500 dark:border-red-900/50 dark:dark:border-red-900 dark:text-red-900 [&>svg]:text-red-500 dark:[&>svg]:text-red-900',
				note: 'border-blue-500/50 bg-blue-50 text-blue-900 dark:border-blue-900/50 dark:bg-blue-900/20 dark:text-blue-200 [&>svg]:text-blue-500 dark:[&>svg]:text-blue-400',
				tip: 'border-green-500/50 bg-green-50 text-green-900 dark:border-green-900/50 dark:bg-green-900/20 dark:text-green-200 [&>svg]:text-green-500 dark:[&>svg]:text-green-400',
				important:
					'border-violet-500/50 bg-violet-50 text-violet-900 dark:border-violet-900/50 dark:bg-violet-900/20 dark:text-violet-200 [&>svg]:text-violet-500 dark:[&>svg]:text-violet-400',
				warning:
					'border-yellow-500/50 bg-yellow-50 text-yellow-900 dark:border-yellow-900/50 dark:bg-yellow-900/20 dark:text-yellow-200 [&>svg]:text-yellow-500 dark:[&>svg]:text-yellow-400',
				caution:
					'border-red-500/50 bg-red-50 text-red-900 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-200 [&>svg]:text-red-500 dark:[&>svg]:text-red-400',
			},
		},
		defaultVariants: {
			variant: 'default',
		},
	},
)

const Alert = React.forwardRef<
	HTMLDivElement,
	React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
	<div
		ref={ref}
		role="alert"
		className={cn(alertVariants({ variant }), className)}
		{...props}
	/>
))
Alert.displayName = 'Alert'

const AlertTitle = React.forwardRef<
	HTMLParagraphElement,
	React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
	<h5
		ref={ref}
		className={cn(
			'my-1 text-base leading-none font-medium tracking-tight',
			className,
		)}
		{...props}
	/>
))
AlertTitle.displayName = 'AlertTitle'

const AlertDescription = React.forwardRef<
	HTMLParagraphElement,
	React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
	<div
		ref={ref}
		className={cn('mt-2 text-sm [&_p]:leading-relaxed', className)}
		{...props}
	/>
))
AlertDescription.displayName = 'AlertDescription'

interface CalloutProps {
	variant: Exclude<
		VariantProps<typeof alertVariants>['variant'],
		'default' | 'destructive' | undefined | null
	>
}

const VARIANT_MAPPING: {
	[key in CalloutProps['variant']]: {
		icon: LucideIcon
		translationResource: string
	}
} = {
	note: {
		icon: LucideInfo,
		translationResource: 'callout_title_note',
	},
	tip: {
		icon: LucideLightbulb,
		translationResource: 'callout_title_tip',
	},
	important: {
		icon: LucideMessageCircleWarning,
		translationResource: 'callout_title_important',
	},
	warning: {
		icon: LucideTriangleAlert,
		translationResource: 'callout_title_warning',
	},
	caution: {
		icon: LucideOctagonAlert,
		translationResource: 'callout_title_caution',
	},
}

/**
 * A convenience wrapper for {@link Alert} that predefines icons
 * and titles for different types of callouts (notes, tips, warnings, etc.)
 */
const Callout = (
	props: React.PropsWithChildren<CalloutProps> = {
		variant: 'note',
	},
) => {
	const { t } = useTranslation('ui-components')
	const map = VARIANT_MAPPING[props.variant]
	const Icon = map.icon
	const title = t(`callout.${map.translationResource}`)

	return (
		<Alert variant={props.variant}>
			<Icon size={20} />
			<AlertTitle>{title}</AlertTitle>
			<AlertDescription>{props.children}</AlertDescription>
		</Alert>
	)
}

export { Alert, AlertTitle, AlertDescription, Callout }

import { cva } from 'class-variance-authority'

export const topbarPalette =
	'border border-gray-100 bg-white text-black hover:bg-gray-100 dark:border-zinc-700 dark:bg-zinc-800/90 dark:text-zinc-200 dark:hover:bg-zinc-700/90'

export const topbarSurface = cva(
	`${topbarPalette} shadow-xl backdrop-blur-md transition-colors`,
	{
		variants: {
			shape: {
				circle: 'h-11 w-11 rounded-full',
				pill: 'h-11 rounded-full',
				panel: 'rounded-2xl',
			},
		},
		defaultVariants: {
			shape: 'pill',
		},
	},
)

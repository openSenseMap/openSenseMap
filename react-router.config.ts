import { type Config } from '@react-router/dev/config'
import { sentryOnBuildEnd } from '@sentry/react-router/vite'

export default {
	ssr: true,
	buildEnd: async (args) => {
		if ('sentryConfig' in args.viteConfig) {
			await sentryOnBuildEnd(args)
		}
	},
} satisfies Config

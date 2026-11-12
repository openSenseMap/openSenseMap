import { type Config } from '@react-router/dev/config'
import { sentryOnBuildEnd } from '@sentry/react-router/vite'

const allowedActionOrigins =
	process.env.ALLOWED_ACTION_ORIGINS?.split(',')
		.map((origin) => origin.trim())
		.filter(Boolean) ?? []

export default {
	ssr: true,
	buildEnd: async (args) => {
		if ('sentryConfig' in args.viteConfig) {
			await sentryOnBuildEnd(args)
		}
	},
	allowedActionOrigins,
} satisfies Config

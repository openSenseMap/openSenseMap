import { type Config } from '@react-router/dev/config'

const allowedActionOrigins =
	process.env.ALLOWED_ACTION_ORIGINS?.split(',')
		.map((origin) => origin.trim())
		.filter(Boolean) ?? []

export default {
	ssr: true,
	allowedActionOrigins,
} satisfies Config

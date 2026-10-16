import { z } from 'zod'

const schema = z.object({
	NODE_ENV: z.enum(['production', 'development', 'test'] as const),
	DATABASE_URL: z.string(),
	PG_CLIENT_SSL: z.string(),
	PG_POOL_MAX: z
		.string()
		.regex(/^[1-9]\d*$/)
		.optional(),
	SESSION_SECRET: z.string(),
	NOMINATIM_SEARCH_API: z.string(),
	GPXZ_API_URL: z.string().url().optional(),
	GPXZ_API_KEY: z.string().min(1).optional(),
	OSEM_API_URL: z.string().url(),
	DIRECTUS_URL: z.string().url(),
	SENSORWIKI_API_URL: z.string().url(),
	MYBADGES_API_URL: z.string().url(),
	MYBADGES_URL: z.string().url(),
	MYBADGES_SERVERADMIN_USERNAME: z.string(),
	MYBADGES_SERVERADMIN_PASSWORD: z.string(),
	MYBADGES_ISSUERID_OSEM: z.string(),
	MYBADGES_CLIENT_ID: z.string(),
	MYBADGES_CLIENT_SECRET: z.string(),
	DISCOURSE_URL: z.string().url(),
	SENTRY_DSN: z.string().url().optional(),
	SENTRY_ENVIRONMENT: z.string().min(1).optional(),
	SENTRY_RELEASE: z.string().min(1).optional(),
	SENTRY_TRACES_SAMPLE_RATE: z
		.string()
		.refine((value) => {
			const sampleRate = Number(value)
			return Number.isFinite(sampleRate) && sampleRate >= 0 && sampleRate <= 1
		}, 'Must be a number between 0 and 1')
		.optional(),
})

declare global {
	namespace NodeJS {
		interface ProcessEnv extends z.infer<typeof schema> {}
	}
}

export function init() {
	const parsed = schema.safeParse(process.env)

	if (parsed.success === false) {
		console.error(
			'❌ Invalid environment variables:',
			parsed.error.flatten().fieldErrors,
		)
	}
}

function getSentryTracesSampleRate() {
	if (process.env.SENTRY_TRACES_SAMPLE_RATE === undefined) return 1

	const sampleRate = Number(process.env.SENTRY_TRACES_SAMPLE_RATE)
	return Number.isFinite(sampleRate) && sampleRate >= 0 && sampleRate <= 1
		? sampleRate
		: 0
}

export function getEnv() {
	return {
		NOMINATIM_SEARCH_API: process.env.NOMINATIM_SEARCH_API,
		OSEM_GITHUB_URL: process.env.OSEM_API_URL,
		MODE: process.env.NODE_ENV,
		DIRECTUS_URL: process.env.DIRECTUS_URL,
		MYBADGES_API_URL: process.env.MYBADGES_API_URL,
		MYBADGES_URL: process.env.MYBADGES_URL,
		SENSORWIKI_API_URL: process.env.SENSORWIKI_API_URL,
		COMMUNITY_URL: process.env.DISCOURSE_URL,
		SENTRY_DSN: process.env.SENTRY_DSN,
		SENTRY_ENVIRONMENT: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,
		SENTRY_RELEASE: process.env.SENTRY_RELEASE,
		SENTRY_TRACES_SAMPLE_RATE: getSentryTracesSampleRate(),
	}
}

type ENV = ReturnType<typeof getEnv>

declare global {
	var ENV: ENV
	interface Window {
		ENV: ENV
	}
}

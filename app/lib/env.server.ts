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
	}
}

type ENV = ReturnType<typeof getEnv>

declare global {
	var ENV: ENV
	interface Window {
		ENV: ENV
	}
}

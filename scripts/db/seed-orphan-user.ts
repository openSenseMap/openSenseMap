import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { envDBSchema } from './env-schema'
import { user } from '~/db/schema'

export const ORPHAN_USER_ID = 'system_orphan_user'

console.log(`🔌 setting up drizzle client to ${envDBSchema.DATABASE_URL}`)

const queryClient = postgres(envDBSchema.DATABASE_URL, {
	max: 1,
	ssl: envDBSchema.PG_CLIENT_SSL === 'true' ? true : false,
})

const client = drizzle(queryClient)

async function seed() {
	await client
		.insert(user)
		.values({
			id: ORPHAN_USER_ID,
			name: 'Orphaned Devices',
			email: 'orphaned@opensensemap.org',
			emailIsConfirmed: true,
		})
		.onConflictDoNothing()
	console.log(`✅ ensured orphan user exists (${ORPHAN_USER_ID})`)
}

seed()
	.catch((e) => {
		console.error('❌ failed to seed orphan user')
		console.error(e)
		process.exit(1)
	})
	.finally(async () => {
		await queryClient.end({ timeout: 5 })
	})

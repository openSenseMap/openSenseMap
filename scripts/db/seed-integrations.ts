import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { envDBSchema } from './env-schema'
import { integration } from '~/db/schema'

console.log(`🔌 setting up drizzle client to ${envDBSchema.DATABASE_URL}`)

const queryClient = postgres(envDBSchema.DATABASE_URL, {
	max: 1,
	ssl: envDBSchema.PG_CLIENT_SSL === 'true' ? true : false,
})
const client = drizzle(queryClient)

async function seed() {
	await client
		.insert(integration)
		.values([
			{
				name: 'MQTT',
				slug: 'mqtt',
				serviceUrl: process.env.MQTT_SERVICE_URL!,
				serviceKey: 'MQTT_SERVICE_KEY',
				icon: 'message-square-text',
				order: 1,
			},
			{
				name: 'The Things Network',
				slug: 'ttn',
				serviceUrl: process.env.TTN_SERVICE_URL!,
				serviceKey: 'TTN_SERVICE_KEY',
				icon: 'antenna',
				order: 2,
			},
		])
		.onConflictDoNothing()
}

seed()
	.catch((e) => {
		console.error(e)
		process.exit(1)
	})
	.finally(async () => {
		await queryClient.end({ timeout: 5 })
	})

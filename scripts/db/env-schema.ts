import 'dotenv/config'
import { z } from 'zod'

const envSchema = z.object({
	DATABASE_URL: z.string().url().trim().min(1),
	PG_CLIENT_SSL: z.string().default('false'),
})

const envDB = envSchema.safeParse(process.env)

if (!envDB.success) {
	console.error(envDB.error.issues)
	throw new Error('There is an error with the server environment variables')
}

export const envDBSchema = envDB.data

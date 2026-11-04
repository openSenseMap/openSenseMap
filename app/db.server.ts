import { type ExtractTablesWithRelations } from 'drizzle-orm'
import { type PgTransaction } from 'drizzle-orm/pg-core'
import {
	drizzle,
	type PostgresJsDatabase,
	type PostgresJsQueryResultHKT,
} from 'drizzle-orm/postgres-js'
import postgres, { type Sql } from 'postgres'
import invariant from 'tiny-invariant'
import * as schema from './db/schema'

let drizzleClient: PostgresJsDatabase<typeof schema>
let pg: Sql<any>
declare global {
	var __db__:
		| {
				drizzle: PostgresJsDatabase<typeof schema>
				pg: Sql<any>
		  }
		| undefined
}

if (process.env.NODE_ENV === 'production') {
	const { drizzle, pg: rawPg } = initClient()
	drizzleClient = drizzle
	pg = rawPg
} else {
	if (!global.__db__) {
		global.__db__ = initClient()
	}
	drizzleClient = global.__db__.drizzle
	pg = global.__db__.pg
}

function initClient() {
	const { DATABASE_URL } = process.env
	invariant(typeof DATABASE_URL === 'string', 'DATABASE_URL env var not set')
	const maxConnections = parsePoolSize(process.env.PG_POOL_MAX)

	const databaseUrl = new URL(DATABASE_URL)
	console.log(`🔌 setting up drizzle client to ${databaseUrl.host}`)

	const rawPg = postgres(DATABASE_URL, {
		ssl: process.env.PG_CLIENT_SSL === 'true' ? true : false,
		max: maxConnections,
	})

	const drizzleDb = drizzle(rawPg, { schema })

	return { drizzle: drizzleDb, pg: rawPg }
}

function parsePoolSize(value: string | undefined): number {
	if (value === undefined || value === '') return 10

	const parsed = Number(value)
	invariant(
		Number.isSafeInteger(parsed) && parsed > 0,
		'PG_POOL_MAX must be a positive integer',
	)

	return parsed
}

export { drizzleClient, pg }

export type DatabaseTransaction = PgTransaction<
	PostgresJsQueryResultHKT,
	typeof schema,
	ExtractTablesWithRelations<typeof schema>
>

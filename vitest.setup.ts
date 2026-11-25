import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vite-plus/test'
import { seedTos } from './scripts/db/seed-tos'
import { drizzleClient, pg } from '~/db.server'

export const BASE_URL = 'http://localhost:4200'

beforeAll(async () => {
	await seedTos(drizzleClient, {
		version: 'test-current',
		effectiveFrom: new Date('2020-01-01T00:00:00.000Z'),
		acceptBy: new Date('2030-01-01T00:00:00.000Z'),
	})
})

afterEach(() => {
	cleanup()
})

afterAll(async () => {
	// prevent lingering connections from
	// blocking other test suites
	await pg.end()
})

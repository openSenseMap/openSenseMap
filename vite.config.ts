import epicOxfmt from '@epic-web/config/oxfmt'
import epicOxlint from '@epic-web/config/oxlint' with { type: 'json' }
import { reactRouter } from '@react-router/dev/vite'
import {
	sentryReactRouter,
	type SentryReactRouterBuildOptions,
} from '@sentry/react-router/vite'
import tailwindcss from '@tailwindcss/vite'
import preserveDirectives from 'rollup-preserve-directives'
import { defineConfig, lazyPlugins, loadEnv, type UserConfig } from 'vite-plus'

const epicOxlintConfig = epicOxlint as unknown as NonNullable<
	UserConfig['lint']
>

export default defineConfig(async (configEnv) => {
	const { mode } = configEnv
	const env = loadEnv(mode, process.cwd(), '')
	const hasSentrySourceMapConfig = Boolean(
		env.SENTRY_AUTH_TOKEN && env.SENTRY_ORG && env.SENTRY_PROJECT,
	)
	const sentryConfig: SentryReactRouterBuildOptions = {
		authToken: env.SENTRY_AUTH_TOKEN,
		org: env.SENTRY_ORG,
		project: env.SENTRY_PROJECT,
		release: env.SENTRY_RELEASE ? { name: env.SENTRY_RELEASE } : undefined,
	}
	const sentryPlugins = hasSentrySourceMapConfig
		? await sentryReactRouter(sentryConfig, configEnv)
		: []

	// Make .env variables available in tests
	// Might be required only because reactRouter() is disabled in test mode
	if (mode === 'test') {
		Object.assign(process.env, env)
	}

	return {
		fmt: {
			...epicOxfmt,
			ignorePatterns: [
				...(epicOxfmt.ignorePatterns ?? []),
				'db/seeds/**',
				'app/db/drizzle/**',
			],
		},
		lint: {
			extends: [{ ...epicOxlintConfig, jsPlugins: [] }],
			ignorePatterns: ['**/.react-router/**'],
			overrides: [
				{
					files: ['**/tests/**/*.ts'],
					rules: {
						'react-hooks/rules-of-hooks': 'off',
					},
				},
			],
			jsPlugins: [
				'./node_modules/@epic-web/config/lint-rules/epic-web-plugin.js',
				{
					name: 'vite-plus',
					specifier: 'vite-plus/oxlint-plugin',
				},
			],
			rules: {
				'vite-plus/prefer-vite-plus-imports': 'error',
			},
		},
		server: {
			port: 3000,
		},
		plugins: lazyPlugins(() => [
			tailwindcss(),
			// https://github.com/remix-run/remix/issues/9871 prevents this from
			// being enabled in test mode...
			mode === 'test' ? null : reactRouter(),
			...sentryPlugins,
			preserveDirectives(), // makes sure directives such as "use client" are present in the output bundle
		]),
		test: {
			globals: true,
			environment: 'jsdom',
			setupFiles: ['./vitest.setup.ts'],
			include: ['**/*.{test,spec}.{ts,tsx}'],
			coverage: {
				reporter: ['text', 'json-summary', 'json'],
			},
			testTimeout: 10_000,
			hookTimeout: process.env.CI ? 30_000 : 10_000,
		},
		resolve: {
			tsconfigPaths: true,
		},
	}
})

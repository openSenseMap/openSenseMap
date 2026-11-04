import tailwindStylesheetUrl from '/app/styles/tailwind.css?url'
import appStylesheetUrl from '/app/styles/app.css?url'
import clsx from 'clsx'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
	data,
	Links,
	Outlet,
	Scripts,
	ScrollRestoration,
	useRouteLoaderData,
} from 'react-router'
import invariant from 'tiny-invariant'
import { type Route } from './+types/root'
import ErrorMessage from './components/error-message'
import { TosGraceDialog } from './components/tos-grace-dialog'
import { Toaster } from './components/ui/toaster'
import { getTosRequirementForUser } from './db/models/tos.server'
import { updateUserPreferencesById } from './db/models/user.server'
import { getEnv } from './lib/env.server'
import { getLocale, i18nCookie, i18nextMiddleware } from './middleware/i18next'
import { tosUiMiddleware } from './middleware/tos-ui.server'
import { prometheusMetricsMiddleware } from './middleware/metrics.server'
import {
	getDismissedGraceTosVersionId,
	getUser,
} from './services/session-service.server'
import { getServerTheme, ThemePreferenceSchema } from './lib/theme'
import {
	getThemePreference,
	themeCookie,
} from './services/theme-service.server'
import { PreventFlashOnWrongTheme } from './components/prevent-theme-flash'
import { TooltipProvider } from './components/ui/tooltip'

export const middleware: Route.MiddlewareFunction[] = [
	prometheusMetricsMiddleware,
	i18nextMiddleware,
	tosUiMiddleware,
]

export const links = () => {
	return [
		{
			rel: 'preload',
			as: 'font',
			href: '/fonts/RobotoSlab-Medium.woff2',
			type: 'font/woff2',
			crossOrigin: 'anonymous',
		},
		{
			rel: 'preload',
			as: 'font',
			href: '/fonts/RobotoSlab-Regular.woff2',
			type: 'font/woff2',
			crossOrigin: 'anonymous',
		},
		{
			rel: 'preload',
			as: 'font',
			href: '/fonts/Urbanist-Medium.woff2',
			type: 'font/woff2',
			crossOrigin: 'anonymous',
		},
		{
			rel: 'preload',
			as: 'font',
			href: '/fonts/Urbanist-Regular.woff2',
			type: 'font/woff2',
			crossOrigin: 'anonymous',
		},
		{ rel: 'stylesheet', href: tailwindStylesheetUrl },
		{ rel: 'stylesheet', href: appStylesheetUrl },
		{ rel: 'icon', href: '/img/logo.svg', type: 'image/svg+xml' },
		{
			rel: 'icon',
			href: '/img/favicon-32x32.png',
			sizes: '32x32',
			type: 'image/png',
		},
		{ rel: 'apple-touch-icon', href: '/img/favicon-180x180.png' },
		{ rel: 'manifest', href: '/manifest.json' },
	]
}

export async function loader({ context, request }: Route.LoaderArgs) {
	const locale = getLocale(context)
	const user = await getUser(request)
	const dismissedGraceTosVersionId = user
		? await getDismissedGraceTosVersionId(request)
		: undefined
	const tosRequirement = user
		? await getTosRequirementForUser(user.id)
		: undefined
	const graceTos =
		tosRequirement?.inGrace &&
		!tosRequirement.accepted &&
		tosRequirement.tos &&
		dismissedGraceTosVersionId !== tosRequirement.tos.id
			? {
					id: tosRequirement.tos.id,
					acceptBy: tosRequirement.acceptBy?.toISOString() ?? '',
				}
			: null

	const cookieThemePreference = await getThemePreference(request)

	const userThemePreferenceResult = ThemePreferenceSchema.safeParse(
		user?.themePreference,
	)

	const themePreference = userThemePreferenceResult.success
		? userThemePreferenceResult.data
		: cookieThemePreference

	const theme = getServerTheme(themePreference)

	const headers = new Headers()

	// setting the cookie is required here to make sure we keep the server and client
	// instance of i18n in synch
	headers.append('Set-Cookie', await i18nCookie.serialize(locale))

	// If the user has a DB-backed preference, mirror it into the cookie too.
	if (userThemePreferenceResult.success) {
		headers.append('Set-Cookie', await themeCookie.serialize(themePreference))
	}

	return data(
		{
			user,
			graceTos,
			locale,
			themePreference,
			theme,
			ENV: getEnv(),
		},
		{ headers },
	)
}

export async function action({ context, request }: Route.ActionArgs) {
	const formData = await request.formData()

	const setTheme = formData.get('set-theme')

	if (setTheme !== null) {
		const result = ThemePreferenceSchema.safeParse(setTheme)

		if (!result.success) {
			throw data('Invalid theme preference', { status: 400 })
		}

		const user = await getUser(request)
		const headers = new Headers()

		if (user) {
			await updateUserPreferencesById(user.id, {
				themePreference: result.data,
			})
		}

		headers.append('Set-Cookie', await themeCookie.serialize(result.data))

		return data(
			{
				ok: true,
				themePreference: result.data,
			},
			{ headers },
		)
	}

	const setLang = formData.get('set-language')?.toString() ?? null

	if (setLang === null) return null

	const locale = getLocale(context)

	if (setLang === locale) return null

	const user = await getUser(request)

	if (user) {
		// updating the user locale is sufficient,
		// because the loader will set the cookie to
		// the user locale on the next request
		await updateUserPreferencesById(user.id, {
			language: setLang,
		})

		return data({
			ok: true,
			locale: setLang,
		})
	}

	return data(
		{
			ok: true,
			locale: setLang,
		},
		{
			headers: {
				'Set-Cookie': await i18nCookie.serialize(setLang),
			},
		},
	)
}

/**
 * Convenience hook to get the {@link loader} data of the root route in order to access
 * e.g. the current locale, user or others.
 * @returns The loader data of the root route
 */
export const useRootRouteLoaderData = () => {
	const rootData = useRouteLoaderData<typeof loader>('root')
	invariant(rootData !== undefined, 'root loader should always return data')
	return rootData
}

const meta = () => (
	<>
		<title>openSenseMap</title>
		<meta charSet="utf-8" />
		<meta name="viewport" content="width=device-width,initial-scale=1" />
		<meta
			name="theme-color"
			content="#3d843f"
			media="(prefers-color-scheme: light)"
		/>
		<meta
			name="theme-color"
			content="#6fa161"
			media="(prefers-color-scheme: dark)"
		/>
		<meta
			name="description"
			content="The environmental data platform to promote education, environmental and climate protection, enthusiasm for STEM, citizen science, open data, and open source."
		/>
	</>
)

export default function App({
	loaderData: { locale, ENV, themePreference, theme, graceTos },
}: Route.ComponentProps) {
	const { i18n } = useTranslation()
	useEffect(() => {
		if (i18n.language !== locale) {
			void i18n.changeLanguage(locale)
		}
	}, [locale, i18n])

	return (
		<html
			lang={i18n.language}
			dir={i18n.dir(i18n.language)}
			className={clsx(theme, 'h-full')}
			suppressHydrationWarning
		>
			<head>
				<PreventFlashOnWrongTheme themePreference={themePreference} />
				<Links />
			</head>
			<body className="dark:bg-dark-background dark:text-dark-text h-full">
				{meta()}

				<TooltipProvider>
					<Outlet />
				</TooltipProvider>
				{graceTos && <TosGraceDialog key={graceTos.id} tos={graceTos} />}
				<Toaster />

				<ScrollRestoration />
				<Scripts />
				<script
					dangerouslySetInnerHTML={{
						__html: `window.ENV = ${JSON.stringify(ENV)}`,
					}}
				/>
			</body>
		</html>
	)
}

/**
 * A catch-all error boundary that will render if any error is thrown in the app.
 * Add a function like this to subpages, if you want to create a more specific
 * error boundary for that page (e.g. with specific messages, styling etc.).
 *
 * Note that error boundaries are shown in place of the parent pages <Outlet />.
 */
export function ErrorBoundary() {
	return (
		<html className="light h-full" suppressHydrationWarning>
			<head>
				<PreventFlashOnWrongTheme themePreference="system" />
				<Links />
			</head>
			<body className="bg-background text-foreground h-full">
				{meta()}
				<div className="flex h-screen w-screen items-center justify-center">
					<ErrorMessage />
				</div>
				<Scripts />
			</body>
		</html>
	)
}

import { readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import Backend from 'i18next-fs-backend/cjs' // Even though unintuitive, cjs is what we want: https://github.com/i18next/i18next-fs-backend/issues/57
import { initReactI18next } from 'react-i18next'
import { createCookie } from 'react-router'
import { createI18nextMiddleware } from 'remix-i18next'
import invariant from 'tiny-invariant'
import { i18nextOptions } from '~/i18next-config'
import { getUser } from '~/services/session-service.server'

invariant(process.env.SESSION_SECRET, 'SESSION_SECRET must be set')
invariant(process.env.NODE_ENV, 'NODE_ENV must be set')

const { SESSION_SECRET, NODE_ENV } = process.env
const IS_PROD = NODE_ENV === 'production'

/**
 * Runs a scan of the locales directory to determine all available translation namespaces.
 * @returns An array of all available translation namespaces
 */
const getNamespaces = () => {
	return readdirSync(resolve(`./public/locales/${i18nextOptions.fallbackLng}/`))
		.filter((f) => f.endsWith('.json'))
		.map((f) => f.replace('.json', ''))
}

export const i18nCookie = createCookie('i18n', {
	sameSite: 'lax',
	path: '/',
	secrets: [SESSION_SECRET],
	secure: IS_PROD,
})

export const [i18nextMiddleware, getLocale, getInstance] =
	createI18nextMiddleware({
		detection: {
			supportedLanguages: [...i18nextOptions.supportedLngs],
			fallbackLanguage: i18nextOptions.fallbackLng,
			cookie: i18nCookie,
			// findLocale prefers a user's saved language to make sure their choice is respected.
			// It then falls back to the cookie value and finally the accept-language header (for first time visits).
			findLocale: async ({ request }) => {
				const user = await getUser(request)
				if (user?.language) return user.language.slice(0, 2)

				const cookieValue = await i18nCookie.parse(
					request.headers.get('cookie'),
				)
				if (cookieValue) return cookieValue

				const acceptLanguage = request.headers.get('accept-language')
				if (acceptLanguage) {
					const browserLang = acceptLanguage
						.split(',')[0]
						.split('-')[0]
						.toLowerCase()

					if (i18nextOptions.supportedLngs.includes(browserLang as any))
						return browserLang
				}

				return null
			},
		},
		i18next: {
			backend: { loadPath: resolve('./public/locales/{{lng}}/{{ns}}.json') },
			ns: getNamespaces(),
			defaultNS: i18nextOptions.defaultNS,
		},
		plugins: [Backend, initReactI18next],
	})

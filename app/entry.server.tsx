import { PassThrough } from 'stream'
import { createReadableStreamFromReadable } from '@react-router/node'
import * as Sentry from '@sentry/react-router'
import { isbot } from 'isbot'
import {
	renderToPipeableStream,
	type RenderToPipeableStreamOptions,
} from 'react-dom/server'
import { I18nextProvider } from 'react-i18next'
import {
	type HandleErrorFunction,
	type RouterContextProvider,
	ServerRouter,
	type EntryContext,
} from 'react-router'
import { getEnv, init } from './lib/env.server'
import { getErrorLogAttributes } from './lib/sentry.server'
import { getInstance } from './middleware/i18next'

export const STREAM_TIMEOUT = 5_000

init()
global.ENV = getEnv()

async function handleRequest(
	request: Request,
	responseStatusCode: number,
	responseHeaders: Headers,
	entryContext: EntryContext,
	routerContext: RouterContextProvider,
) {
	return new Promise((resolve, reject) => {
		let shellRendered = false
		let userAgent = request.headers.get('user-agent')

		let readyOption: keyof RenderToPipeableStreamOptions =
			(userAgent && isbot(userAgent)) || entryContext.isSpaMode
				? 'onAllReady'
				: 'onShellReady'

		let didError = false

		const { pipe, abort } = renderToPipeableStream(
			<I18nextProvider i18n={getInstance(routerContext)}>
				<ServerRouter context={entryContext} url={request.url} />
			</I18nextProvider>,
			{
				[readyOption]: () => {
					shellRendered = true
					const body = new PassThrough()
					const stream = createReadableStreamFromReadable(body)

					responseHeaders.set('Content-Type', 'text/html')

					resolve(
						new Response(stream, {
							headers: responseHeaders,
							status: didError ? 500 : responseStatusCode,
						}),
					)

					pipe(Sentry.getMetaTagTransformer(body))
				},
				onShellError: (err: unknown) => {
					reject(err)
				},
				onError: (error: unknown) => {
					didError = true
					if (shellRendered) {
						console.error(error)
						Sentry.captureException(error)
					}
				},
			},
		)

		// Automatically timeout the React renderer after 6 seconds, which ensures
		// React has enough time to flush down the rejected boundary contents
		setTimeout(abort, STREAM_TIMEOUT + 1_000)
	})
}

export default Sentry.wrapSentryHandleRequest(handleRequest)

const sentryHandleError = Sentry.createSentryHandleError({ logErrors: true })

export const handleError: HandleErrorFunction = async (error, args) => {
	if (!args.request.signal.aborted) {
		Sentry.logger.error('Unhandled React Router server error', {
			...getErrorLogAttributes(error),
			'http.request.method': args.request.method,
		})
	}

	await sentryHandleError(error, args)
}

export const instrumentations = [
	Sentry.createSentryServerInstrumentation({ captureErrors: false }),
]

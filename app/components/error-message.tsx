import {
	AlertCircle,
	ArrowLeft,
	Home,
	RefreshCw,
	ServerCrash,
	FileQuestion,
	ShieldX,
	WifiOff,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useRouteError, isRouteErrorResponse } from 'react-router'
import { Button } from './ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from './ui/card'

type ErrorType = 'not_found' | 'forbidden' | 'server' | 'network' | 'generic'

export default function ErrorMessage() {
	const navigate = useNavigate()
	const error = useRouteError()
	const { t } = useTranslation('common')

	const goBack = () => window.history.back()
	const goHome = () => navigate('/')
	const refresh = () => window.location.reload()

	const getErrorInfo = (): {
		type: ErrorType
		status?: number
		title: string
		message: string
	} => {
		if (isRouteErrorResponse(error)) {
			const status = error.status
			const actualMessage = error.data?.message || error.data

			if (status === 404) {
				return {
					type: 'not_found',
					status,
					title: t('error_not_found_title'),
					message: actualMessage || t('error_generic_message'),
				}
			}

			if (status === 403) {
				return {
					type: 'forbidden',
					status,
					title: t('error_forbidden_title'),
					message: actualMessage || t('error_generic_message'),
				}
			}

			if (status >= 500) {
				return {
					type: 'server',
					status,
					title: t('error_server_title'),
					message: actualMessage || t('error_generic_message'),
				}
			}

			return {
				type: 'generic',
				status,
				title: `${status} ${error.statusText}`,
				message: actualMessage || t('error_generic_message'),
			}
		}

		if (typeof error === 'string') {
			const errorLower = error.toLowerCase()

			let type: ErrorType = 'generic'
			if (errorLower.includes('not found')) {
				type = 'not_found'
			} else if (
				errorLower.includes('forbidden') ||
				errorLower.includes('permission')
			) {
				type = 'forbidden'
			}

			return {
				type,
				title: t('error_occurred'),
				message: error,
			}
		}

		if (error instanceof Error) {
			let type: ErrorType = 'generic'

			if (
				error.message.includes('fetch') ||
				error.message.includes('network')
			) {
				type = 'network'
			}

			return {
				type,
				title: t('error_occurred'),
				message: error.message,
			}
		}

		return {
			type: 'generic',
			title: t('error_occurred'),
			message: t('error_generic_message'),
		}
	}

	const { type, status, title, message } = getErrorInfo()

	const getIcon = () => {
		const iconClass = 'h-12 w-12'

		switch (type) {
			case 'not_found':
				return <FileQuestion className={`${iconClass} text-amber-500`} />
			case 'forbidden':
				return <ShieldX className={`${iconClass} text-red-500`} />
			case 'server':
				return <ServerCrash className={`${iconClass} text-red-500`} />
			case 'network':
				return <WifiOff className={`${iconClass} text-gray-500`} />
			default:
				return <AlertCircle className={`${iconClass} text-amber-500`} />
		}
	}

	const getGradient = () => {
		switch (type) {
			case 'not_found':
				return 'from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20'
			case 'forbidden':
				return 'from-red-50 to-pink-50 dark:from-red-950/20 dark:to-pink-950/20'
			case 'server':
				return 'from-red-50 to-rose-50 dark:from-red-950/20 dark:to-rose-950/20'
			case 'network':
				return 'from-gray-50 to-slate-50 dark:from-gray-950/20 dark:to-slate-950/20'
			default:
				return 'from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20'
		}
	}

	return (
		<div className="flex min-h-[400px] w-full items-center justify-center p-4">
			<Card
				className={`w-full max-w-md bg-linear-to-br ${getGradient()} border-2 border-white/60 shadow-2xl ring-1 ring-black/10 backdrop-blur-xs dark:border-zinc-700/80`}
			>
				<CardHeader className="text-center">
					<div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-md dark:bg-zinc-800">
						{getIcon()}
					</div>
					{status && (
						<p className="text-5xl font-bold text-gray-300 dark:text-gray-600">
							{status}
						</p>
					)}
					<CardTitle className="text-xl">{title}</CardTitle>
					<CardDescription className="text-base">{message}</CardDescription>
				</CardHeader>

				<CardContent>
					<div className="rounded-lg bg-white/50 p-4 dark:bg-zinc-800/50">
						<p className="text-muted-foreground text-center text-sm">
							{t('error_help_text')}
						</p>
					</div>
				</CardContent>

				<CardFooter className="flex flex-col gap-2 sm:flex-row sm:justify-center">
					<Button
						variant="default"
						onClick={goBack}
						className="w-full sm:w-auto"
					>
						<ArrowLeft className="mr-2 h-4 w-4" />
						{t('go_back')}
					</Button>
					<Button
						variant="outline"
						onClick={goHome}
						className="w-full sm:w-auto"
					>
						<Home className="mr-2 h-4 w-4" />
						{t('go_home')}
					</Button>
					{(type === 'server' || type === 'network') && (
						<Button
							variant="default"
							onClick={refresh}
							className="w-full sm:w-auto"
						>
							<RefreshCw className="mr-2 h-4 w-4" />
							{t('try_again')}
						</Button>
					)}
				</CardFooter>
			</Card>
		</div>
	)
}

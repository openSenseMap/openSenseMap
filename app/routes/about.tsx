import { readItems } from '@directus/sdk'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { data, Link, useLoaderData } from 'react-router'
import { type Route } from './+types/_index'
import Footer from '~/components/landing/footer'
import { GlobeComponent } from '~/components/landing/globe.client'
import Header from '~/components/landing/header/header'
import Connect from '~/components/landing/sections/connect'
import Features from '~/components/landing/sections/features'
import Integrations from '~/components/landing/sections/integrations'
import Partners from '~/components/landing/sections/partners'
import PricingPlans from '~/components/landing/sections/pricing-plans'
import Stats from '~/components/landing/stats'
import { getLatestDevices } from '~/db/models/device.server'
import { useMediaQuery } from '~/hooks/use-media-query'
import { type SupportedLanguage } from '~/i18next-config'
import { type Partner, getDirectusClient } from '~/lib/directus'
import { getLocale } from '~/middleware/i18next'
import { getUserId, getUserName } from '~/services/session-service.server'

const sections = [
	{
		title: 'Features',
		description:
			'The openSenseMap platform has a lot to offer that makes discoverability and sharing of environmental and sensor data easy.',
		component: Features,
	},
	{
		title: 'Connect',
		description:
			'Connect your devices to the openSenseMap platform and start sharing your environmental data with the world.',
		component: Connect,
	},
	{
		title: 'Integrations',
		description:
			'Integrate your devices with the openSenseMap platform and start sharing your environmental data with the world.',
		component: Integrations,
	},
	{
		title: 'Pricing',
		description:
			'Choose the right pricing plan for your needs and start sharing your environmental data with the world.',
		component: PricingPlans,
	},
]

export const loader = async ({ context, request }: Route.LoaderArgs) => {
	const locale = getLocale(context) as SupportedLanguage

	const directus = getDirectusClient()

	const useCasesResponse = await directus.request(
		readItems('use_cases', {
			fields: ['*'],
			filter: {
				language: { _eq: locale },
			},
		}),
	)

	const featuresResponse = await directus.request(
		readItems('features', {
			fields: ['*'],
			filter: {
				language: { _eq: locale },
			},
		}),
	)

	const partnersResponse = await directus.request(
		readItems('partners', {
			fields: ['*'],
		}),
	)

	const userId = await getUserId(request)
	const userName = await getUserName(request)
	const stats = await fetch('https://api.opensensemap.org/stats').then(
		(res) => {
			return res.json()
		},
	)

	const latestDevices = await getLatestDevices()

	return data({
		useCases: useCasesResponse,
		features: featuresResponse,
		partners: partnersResponse,
		stats: stats,
		header: { userId: userId, userName: userName },
		locale: locale,
		latestDevices: latestDevices,
	})
}

export default function Index() {
	const { partners, stats, latestDevices } = useLoaderData<{
		partners: Partner[]
		stats: number[]
		latestDevices: any[]
	}>()

	const { t } = useTranslation('landing')
	const showGlobe = useMediaQuery('(min-width: 1120px)')

	return (
		<div className="min-h-screen bg-white dark:bg-black">
			<header className="z-10">
				<Header />
			</header>
			<main>
				<div
					id="firstSection"
					className="mx-auto flex max-w-7xl flex-col justify-center px-4 sm:px-6 lg:px-8"
				>
					<div className="flex items-center justify-between">
						<div className="w-full min-[1120px]:w-1/2">
							<motion.div
								initial={{ opacity: 0, scale: 0 }}
								animate={{ opacity: 1, scale: 1 }}
								transition={{
									duration: 0.4,
									scale: { type: 'spring', visualDuration: 0.4, bounce: 0.5 },
								}}
							>
								<h1 className="text-light-green dark:text-dark-green text-4xl font-bold tracking-tight sm:text-5xl">
									openSenseMap
								</h1>
							</motion.div>
							<motion.div
								initial={{ opacity: 0, x: -100 }}
								animate={{ opacity: 1, x: 0 }}
								transition={{ ease: 'easeInOut', duration: 0.5 }}
							>
								<p className="mt-6 text-lg text-gray-600 sm:ml-6 dark:text-gray-100">
									{t('introduction')}
								</p>
							</motion.div>
							<div className="mt-8 flex flex-wrap items-center justify-around gap-x-6 gap-y-4 text-xl">
								<motion.div
									initial={{ opacity: 0, y: 100, scale: 0.8 }}
									animate={{ opacity: 1, y: 0, scale: 1 }}
									transition={{
										duration: 0.5,
										delay: 0.2,
										type: 'spring',
										stiffness: 50,
									}}
								>
									<Link to="/explore" prefetch="intent">
										<motion.div
											whileHover={{ scale: 1.1 }}
											transition={{
												type: 'spring',
												stiffness: 400,
												damping: 10,
											}}
										>
											<button className="border-light-green text-light-green hover:bg-light-green dark:border-dark-green dark:bg-dark-green mt-8 cursor-pointer rounded-lg border-t-4 border-r-8 border-b-8 border-l-4 border-solid p-2 transition-all hover:text-white dark:text-white">
												{t('map')}
											</button>
										</motion.div>
									</Link>
								</motion.div>
								<motion.div
									initial={{ opacity: 0, y: 100, scale: 0.8 }}
									animate={{ opacity: 1, y: 0, scale: 1 }}
									transition={{
										duration: 0.5,
										delay: 0.5,
										type: 'spring',
										stiffness: 50,
									}}
								>
									<Link
										to="https://www.betterplace.org/de/projects/89947-opensensemap-org-die-freie-karte-fuer-umweltdaten"
										target="_blank"
										rel="noopener noreferrer"
										prefetch="intent"
									>
										<motion.div
											whileHover={{ scale: 1.1 }}
											transition={{
												type: 'spring',
												stiffness: 400,
												damping: 10,
											}}
										>
											<button className="border-light-blue text-light-blue hover:bg-light-blue dark:border-dark-blue dark:bg-dark-blue mt-8 cursor-pointer rounded-lg border-t-4 border-r-8 border-b-8 border-l-4 border-solid p-2 transition-all hover:scale-105 hover:text-white dark:text-white">
												{t('donate')}
											</button>
										</motion.div>
									</Link>
								</motion.div>
							</div>
						</div>
						<div className="hidden w-125 shrink-0 cursor-pointer min-[1120px]:block">
							{showGlobe && <GlobeComponent latestDevices={latestDevices} />}
						</div>
					</div>
					<div>
						<Stats {...stats} />
					</div>
				</div>
				{sections.map((section, _index) => {
					const Component = section.component
					return (
						<section
							key={section.title}
							className="mx-auto flex w-full max-w-7xl items-center justify-center px-4 py-12 sm:px-6 sm:py-16 md:py-20 lg:px-8 lg:py-24"
						>
							<Component />
						</section>
					)
				})}
				<div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-center px-4 py-16 sm:px-6 md:py-24 lg:px-8">
					<Partners data={partners} />
					<Footer />
				</div>
			</main>
		</div>
	)
}

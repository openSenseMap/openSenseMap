import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { type Partner } from '~/lib/directus'

type PartnersProps = {
	data: Partner[]
}

export default function Partners({ data }: PartnersProps) {
	const { t } = useTranslation('partners')
	return (
		<div
			id="partners"
			className="flex h-full w-full items-center justify-center text-xl text-gray-300 dark:text-gray-100"
		>
			<div className="flex h-full w-full flex-col justify-evenly md:w-5/6">
				<p className="text-center font-serif text-4xl font-black text-blue-100 subpixel-antialiased sm:text-6xl dark:text-blue-200">
					{t('Partners')}
				</p>
				<p className="text-center">{t('made_possible_by_partners')}</p>
				<div className="flex flex-wrap items-center justify-center">
					{data.map((partner, index) => {
						return (
							<motion.div
								initial="hidden"
								whileInView="visible"
								viewport={{ once: true }}
								transition={{
									ease: 'backOut',
									duration: 0.8,
									delay: index * 0.1,
								}}
								variants={{
									visible: { opacity: 1, scale: 1, y: 0 },
									hidden: { opacity: 0, scale: 0, y: 50 },
								}}
								key={index}
								className="w-40 p-4 sm:w-48 sm:p-6 md:w-64 md:p-8"
							>
								<a
									href={partner.link}
									target="_blank"
									rel="noopener noreferrer"
									className="text-foreground"
								>
									{partner.logo ? (
										<img
											src={`${ENV.DIRECTUS_URL}/assets/${partner.logo}`}
											alt={partner.name}
											className="h-auto max-w-full"
										/>
									) : (
										partner.name
									)}
								</a>
							</motion.div>
						)
					})}
				</div>
				<motion.div
					initial="hidden"
					whileInView="visible"
					viewport={{ once: true }}
					transition={{
						ease: 'backOut',
						duration: 0.5,
						delay: data.length * 0.1 + 0.3,
					}}
					variants={{
						visible: { opacity: 1, scale: 1, y: 0 },
						hidden: { opacity: 0, scale: 0, y: 50 },
					}}
					className="mt-32 flex flex-col items-center justify-center"
				>
					<p>{t('made_by')}</p>
					<img
						src="/img/openSenseLab_Logo.svg"
						alt="openSenseLab Logo"
						className="h-auto max-w-prose p-2"
					></img>
				</motion.div>
			</div>
		</div>
	)
}

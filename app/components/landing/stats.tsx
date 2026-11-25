import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import AnimatedCounter from '../ui/animated-counter'

export default function Stats(stats: number[]) {
	const { t } = useTranslation('stats')

	const osemStats = [
		{
			id: 1,
			name: 'devices',
			value: stats[0] / 1000,
			unit: 'k',
		},
		{
			id: 2,
			name: 'measurements_total',
			value: stats[1] / 1000000,
			unit: 'm',
		},
		{
			id: 3,
			name: 'measurements_per_minute',
			value: stats[2] / 1000,
			unit: 'k',
		},
	]

	return (
		<div className="mx-auto px-4 sm:max-w-xl md:max-w-full md:px-24 lg:max-w-(--breakpoint-xl) lg:px-8 lg:py-12">
			<div className="row-gap-8 grid gap-10 lg:grid-cols-3">
				{osemStats.map((stat) => (
					<div key={stat.id} id={stat.name}>
						<motion.div
							initial="hidden"
							whileInView="visible"
							viewport={{ once: true }}
							transition={{ ease: 'easeInOut', duration: 0.5 }}
							variants={{
								visible: { opacity: 1, scale: 1, x: 0 },
								hidden: { opacity: 0, scale: 0, x: -100 },
							}}
						>
							<div className="flex flex-col items-center text-center">
								<div className="flex-direction-row justify-content-center align-items-center flex">
									<h6 className="text-light-green text-5xl font-bold">
										<AnimatedCounter from={0} to={stat.value} />
									</h6>
									<h6 className="text-light-green text-5xl font-bold">
										{stat.unit}
									</h6>
								</div>
								<p className="font-bold dark:text-white">{t(stat.name)}</p>
							</div>
						</motion.div>
					</div>
				))}
			</div>
		</div>
	)
}

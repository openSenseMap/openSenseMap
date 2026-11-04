import { Gift, Star } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function PricingPlans() {
	const { t } = useTranslation('pricing-plans')
	return (
		<section id="pricing" className="w-full">
			<div className="mx-auto max-w-7xl px-4">
				<div className="mx-auto max-w-2xl text-center">
					<h2 className="text-2xl font-semibold">{t('Pricing')}</h2>
					<p className="mt-2 text-lg text-gray-600">
						{t('kidding')}
						<br />
						{t('contribution')}
					</p>
				</div>
				<div className="mt-4 flex flex-col justify-center gap-3 sm:flex-row sm:gap-5">
					<div id="left" className="flex w-full flex-col gap-3 sm:w-auto">
						<a
							href="https://github.com/openSenseMap/frontend"
							rel="noreferrer noopener nofollow"
							target="_blank"
							className="flex min-h-11 w-full items-center justify-center rounded-sm border-2 border-solid px-4 py-2 hover:cursor-pointer"
						>
							<Star className="mr-2 h-4 w-4" />
							{t('star')}
						</a>
					</div>
					<div id="right" className="flex w-full flex-col gap-3 sm:w-auto">
						<a
							href="https://www.betterplace.org/de/projects/89947-opensensemap-org-die-freie-karte-fuer-umweltdaten"
							rel="noreferrer noopener nofollow"
							target="_blank"
							className="flex min-h-11 w-full items-center justify-center rounded-sm border-2 border-solid px-4 py-2 hover:cursor-pointer"
						>
							<Gift className="mr-2 h-4 w-4" />
							{t('sponsor')}
						</a>
					</div>
				</div>
			</div>
		</section>
	)
}

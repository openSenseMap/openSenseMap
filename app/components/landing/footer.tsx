import { useTranslation } from 'react-i18next'

export default function Footer() {
	const { t } = useTranslation('footer')
	const currentYear = new Date().getFullYear()
	return (
		<footer
			id="footer"
			className="w-full bg-white px-4 text-gray-300 sm:p-6 lg:text-lg dark:bg-black dark:text-gray-100"
		>
			<hr className="my-6 border-gray-300 sm:mx-auto lg:my-8 dark:border-gray-100" />
			<div className="mx-auto w-full max-w-(--breakpoint-xl) p-4 md:flex md:flex-wrap md:items-center md:justify-between md:gap-4 lg:flex-nowrap">
				<span className="text-sm text-gray-500 sm:text-center dark:text-gray-400">
					© {currentYear}{' '}
					<a href="https://opensenselab.org/" className="hover:underline">
						openSenseLab
					</a>
					. {t('rightsReserved')}
				</span>
				<ul className="mt-3 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm font-medium text-gray-500 sm:mt-0 md:justify-end dark:text-gray-400">
					<li>
						<a
							href="/imprint"
							target="_blank"
							rel="noopener noreferrer"
							className="hover:text-light-green px-2 lg:px-8 dark:hover:text-green-200"
						>
							{t('imprint')}
						</a>
					</li>
					<li>
						<a
							href="/privacy"
							target="_blank"
							rel="noopener noreferrer"
							className="hover:text-light-green px-2 lg:px-8 dark:hover:text-green-200"
						>
							{t('dataProtection')}
						</a>
					</li>
					<li>
						<a
							href="https://www.instagram.com/opensenselab/"
							target="_blank"
							rel="noopener noreferrer"
							className="hover:text-light-green px-2 lg:px-8 dark:hover:text-green-200"
						>
							<svg
								className="h-10 w-10"
								fill="currentColor"
								viewBox="0 0 24 24"
								aria-hidden="true"
							>
								<path
									fillRule="evenodd"
									d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z"
									clipRule="evenodd"
								/>
							</svg>
							<span className="sr-only">{t('instagram')}</span>
						</a>
					</li>
					<li>
						<a
							href="https://twitter.com/openSenseLab"
							target="_blank"
							rel="noopener noreferrer"
							className="hover:text-light-green px-2 lg:px-8 dark:hover:text-green-200"
						>
							<svg
								className="h-10 w-10"
								fill="currentColor"
								viewBox="0 0 24 24"
								aria-hidden="true"
							>
								<path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
							</svg>
							<span className="sr-only">{t('twitter')}</span>
						</a>
					</li>
					<li>
						<a
							href="https://github.com/opensensemap"
							target="_blank"
							rel="noopener noreferrer"
							className="hover:text-light-green px-2 lg:px-8 dark:hover:text-green-200"
						>
							<svg
								className="h-10 w-10"
								fill="currentColor"
								viewBox="0 0 24 24"
								aria-hidden="true"
							>
								<path
									fillRule="evenodd"
									d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
									clipRule="evenodd"
								/>
							</svg>
							<span className="sr-only">{t('github')}</span>
						</a>
					</li>
				</ul>
			</div>
		</footer>
	)
}

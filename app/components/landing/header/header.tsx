import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import LanguageSelector from './language-selector'

const links = [
	{
		name: 'Map',
		link: '/explore',
	},
	{
		name: 'Features',
		link: '#features',
	},
	// {
	//   name: "Tools",
	//   link: "#tools",
	// },
	// {
	//   name: "Use Cases",
	//   link: "#useCases",
	// },
	// {
	//   name: "Partners",
	//   link: "#partners",
	// },
	{
		name: 'Sponsor',
		link: '#pricing',
	},
]

export default function Header() {
	const [openMenu, setOpenMenu] = useState(false)

	const { t } = useTranslation('header')

	return (
		<nav
			id="header"
			className="relative z-50 mx-auto flex min-h-16 max-w-7xl justify-between py-2 dark:border-gray-300 dark:bg-black"
		>
			<div className="z-50 mx-auto flex w-full flex-wrap items-center justify-between px-4 font-serif">
				{/* Osem Logo*/}
				<div className="flex max-w-(--breakpoint-xl) flex-wrap items-center justify-between">
					{/* Osem Logo*/}
					<Link to="/" className="flex items-center md:pr-10">
						<img
							src="/img/logo.png"
							className="mr-3 h-6 sm:h-9"
							alt="osem Logo"
						/>
						<span className="text-light-green dark:text-dark-green hidden self-center text-xl whitespace-nowrap md:block">
							openSenseMap
						</span>
					</Link>
					{/* Navbar Links*/}
					<div
						className={
							'hidden w-full items-center justify-between text-gray-400 lg:order-1 lg:flex lg:w-auto dark:text-gray-300'
						}
						id="navbar-cta"
					>
						<ul className="mt-4 flex flex-col rounded-lg p-4 md:mt-0 md:flex-row md:space-x-8 md:text-lg">
							{links.map((item, index) => {
								return (
									<li key={index}>
										<Link
											to={item.link}
											className="md:hover:text-light-green block rounded py-2 pr-4 pl-3 md:p-0 md:font-thin dark:md:hover:text-green-200"
										>
											{t(item.name)}
										</Link>
									</li>
								)
							})}
						</ul>
					</div>
				</div>
				<div>
					<div className="flex items-center justify-center gap-2 md:order-2">
						{/* Theme */}
						{/* <ModeToggle /> */}
						{/* Language */}
						<LanguageSelector />
						{/* Collapsible navigation bar */}
						<button
							id="navbar-menu-toggle"
							onClick={() => setOpenMenu(!openMenu)}
							type="button"
							className="inline-flex size-11 items-center justify-center rounded-lg p-2 text-sm text-gray-500 hover:bg-gray-100 focus:ring-2 focus:ring-gray-200 focus:outline-hidden lg:hidden"
							aria-controls="navbar-mobile-menu"
							aria-expanded={openMenu}
						>
							<span className="sr-only">
								{openMenu ? 'Close main menu' : 'Open main menu'}
							</span>
							<svg
								className="h-6 w-6"
								aria-hidden="true"
								fill="currentColor"
								viewBox="0 0 20 20"
								xmlns="http://www.w3.org/2000/svg"
							>
								<path
									fillRule="evenodd"
									d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
									clipRule="evenodd"
								></path>
							</svg>
						</button>
						{openMenu && (
							<div
								id="navbar-mobile-menu"
								className="absolute top-full right-2 mt-2 w-48 rounded-md bg-gray-200 py-2 shadow-lg ring-1 ring-black/5"
								role="menu"
								aria-orientation="vertical"
								aria-labelledby="navbar-menu-toggle"
							>
								{links.map((item, index) => (
									<Link
										key={index}
										to={item.link}
										className="hover:text-light-green block px-4 py-2 text-sm text-gray-700 dark:hover:text-green-200"
										role="menuitem"
									>
										{t(item.name)}
									</Link>
								))}
							</div>
						)}
					</div>
				</div>
			</div>
		</nav>
	)
}

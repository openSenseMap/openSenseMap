import { AnimatePresence, motion } from 'framer-motion'
import { DownloadIcon, SearchIcon, XIcon } from 'lucide-react'
import { useState, useEffect, useRef, createContext } from 'react'
import { useTranslation } from 'react-i18next'
import { useMap } from 'react-map-gl/maplibre'
import NavbarHandler from './nav-bar-handler'
import FilterVisualization from '~/components/map/filter-visualization'
import { type DeviceFeatureCollection } from '~/components/search/search-types'
import { cn } from '~/lib/utils'
import { topbarSurface } from '~/components/ui/topbar-styles'
import Download from '../download'

interface NavBarProps {
	devices: DeviceFeatureCollection
}

export const NavbarContext = createContext({
	open: false,
	setOpen: (_open: boolean) => {},
})

export default function NavBar(props: NavBarProps) {
	const [open, setOpen] = useState(false)
	const [downloadOpen, setDownloadOpen] = useState(false)
	const inputRef = useRef<HTMLInputElement>(null)
	const [searchString, setSearchString] = useState('')

	const { osem: mapRef } = useMap()

	const { t } = useTranslation('search')
	const { t: tDownload } = useTranslation('download')

	useEffect(() => {
		if (mapRef) {
			mapRef.on('click', () => setOpen(false))
		}
	}, [mapRef])

	// register keyboard shortcuts
	useEffect(() => {
		const down = (e: KeyboardEvent) => {
			if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
				e.preventDefault()
				setOpen((prevState) => !prevState)
			}
			if (e.key === 'Escape') {
				e.preventDefault()
				setOpen(false)
			}
		}
		document.addEventListener('keydown', down)
		return () => document.removeEventListener('keydown', down)
	}, [])

	useEffect(() => {
		if (open) {
			inputRef.current?.focus()
		} else {
			inputRef.current?.blur()
			setSearchString('')
		}
	}, [open])

	return (
		<div className="pointer-events-auto relative w-11 shrink-0 lg:w-full lg:max-w-176">
			<button
				type="button"
				onClick={() => setOpen(true)}
				aria-label={t('placeholder') || 'Search'}
				aria-expanded={open}
				className={cn(
					topbarSurface({ shape: 'circle' }),
					'flex items-center justify-center focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 focus-visible:outline-hidden lg:hidden',
					open && 'invisible',
				)}
			>
				<SearchIcon className="size-6" aria-hidden="true" />
			</button>

			<motion.div
				layout
				className={cn(
					topbarSurface({ shape: 'panel' }),
					'fixed top-16 right-3 left-3 w-auto overflow-hidden px-3 lg:relative lg:inset-auto lg:w-full lg:px-4',
					!open && 'hidden lg:block',
				)}
				animate={{
					borderRadius: open ? 16 : 999,
				}}
				transition={{
					layout: {
						duration: 0.24,
						ease: [0.22, 1, 0.36, 1],
					},
					borderRadius: {
						duration: 0.2,
						ease: [0.22, 1, 0.36, 1],
					},
				}}
			>
				<div className="flex h-11 w-full items-center gap-2 text-black lg:gap-4 dark:text-zinc-200">
					<SearchIcon className="h-6 w-6 shrink-0 dark:text-zinc-200" />

					<input
						ref={inputRef}
						placeholder={t('placeholder') || undefined}
						onFocus={() => setOpen(true)}
						onChange={(e) => setSearchString(e.target.value)}
						className="h-full min-w-0 flex-1 border-none bg-transparent focus:border-none focus:ring-0 focus:outline-hidden dark:text-zinc-200"
						value={searchString}
					/>

					{!open && (
						<span className="hidden flex-none text-xs font-semibold text-gray-400 lg:block">
							<kbd>ctrl</kbd> + <kbd>K</kbd>
						</span>
					)}

					<button
						type="button"
						onClick={() => {
							setOpen(false)
							setDownloadOpen(true)
						}}
						aria-label={tDownload('download')}
						title={tDownload('download')}
						className="flex size-8 shrink-0 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10"
					>
						<DownloadIcon className="h-5 w-5" aria-hidden="true" />
					</button>

					{open && (
						<button
							type="button"
							onClick={() => {
								setSearchString('')
								setOpen(false)
								inputRef.current?.blur()
							}}
							aria-label="Close search"
							className="-mr-2 flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-black/5 lg:mr-0 lg:size-8 dark:hover:bg-white/10"
						>
							<XIcon className="h-5 w-5" />
						</button>
					)}
				</div>

				<NavbarContext.Provider value={{ open, setOpen }}>
					<AnimatePresence initial={false}>
						{open && (
							<motion.div
								key="search-results"
								className="overflow-hidden"
								initial={{
									opacity: 0,
									height: 0,
									y: -4,
								}}
								animate={{
									opacity: 1,
									height: 'auto',
									y: 0,
								}}
								exit={{
									opacity: 0,
									height: 0,
									y: -4,
								}}
								transition={{
									duration: 0.22,
									ease: [0.22, 1, 0.36, 1],
								}}
							>
								<div className="pt-2">
									<NavbarHandler
										devices={props.devices}
										searchString={searchString}
									/>
								</div>
							</motion.div>
						)}
					</AnimatePresence>
				</NavbarContext.Provider>
			</motion.div>
			{!open && (
				<div className="hidden w-full items-center justify-center lg:flex">
					<FilterVisualization />
				</div>
			)}

			<Download
				devices={props.devices}
				open={downloadOpen}
				onOpenChange={setDownloadOpen}
			/>
		</div>
	)
}

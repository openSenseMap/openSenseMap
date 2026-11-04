import {
	LogIn,
	LogOut,
	User2,
	Settings,
	Compass,
	PlusIcon,
	Info,
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
	Form,
	Link,
	useMatches,
	useNavigation,
	useSearchParams,
} from 'react-router'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import Spinner from '~/components/spinner'
import { toast } from '~/components/ui/use-toast'
import { useOptionalUser } from '~/utils'
import { Button } from '~/components/ui/button'
export default function Menu() {
	const [searchParams] = useSearchParams()
	const redirectTo =
		searchParams.size > 0 ? '/explore?' + searchParams.toString() : '/explore'

	const [open, setOpen] = useState(false)

	const navigation = useNavigation()
	const isLoggingOut = Boolean(navigation.state === 'submitting')
	const user = useOptionalUser()
	const matches = useMatches()
	const { t } = useTranslation('menu')

	const isExplore = matches.some((match) => match.pathname === '/explore')

	return (
		<>
			<DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
				<DropdownMenuTrigger asChild>
					<div className="pointer-events-auto box-border h-10 w-10">
						<Button variant="topbar" size="topbarIcon">
							<User2 />
						</Button>
					</div>
				</DropdownMenuTrigger>

				<DropdownMenuContent
					className="w-56 dark:bg-zinc-800 dark:text-zinc-200 dark:opacity-95"
					align="end"
					forceMount
				>
					<div
						className={
							navigation.state === 'loading' ? 'pointer-events-none' : ''
						}
					>
						<DropdownMenuLabel className="font-normal">
							{!user ? (
								<div className="flex flex-col space-y-1">
									<p className="text-sm leading-none font-medium">
										{t('title')}
									</p>
									<p className="text-muted-foreground text-xs leading-none">
										{t('subtitle')}
									</p>
								</div>
							) : (
								<div className="flex flex-col space-y-1 p-2">
									<p className="text-sm leading-none font-medium">
										{user?.name}
									</p>
									<p className="text-muted-foreground text-xs leading-none">
										{user?.email}
									</p>
								</div>
							)}
						</DropdownMenuLabel>

						<DropdownMenuSeparator />

						{user && (
							<DropdownMenuGroup>
								{navigation.state === 'loading' && (
									<div className="absolute inset-0 z-50 flex items-center justify-center bg-white/30 backdrop-blur-xs dark:bg-zinc-800/30">
										<Spinner />
									</div>
								)}

								<Link to="/about">
									<DropdownMenuItem className="cursor-pointer">
										<Info className="mr-2 h-5 w-5" />
										<span>{t('about_label')}</span>
									</DropdownMenuItem>
								</Link>
								{!isExplore && (
									<Link to="/explore">
										<DropdownMenuItem className="cursor-pointer">
											<Compass className="mr-2 h-5 w-5" />
											<span>{t('explore_label')}</span>
										</DropdownMenuItem>
									</Link>
								)}

								{matches[1]?.pathname !== '/settings' && (
									<Link to="/settings/profile">
										<DropdownMenuItem className="cursor-pointer">
											<Settings className="mr-2 h-5 w-5" />
											{t('settings_label')}
										</DropdownMenuItem>
									</Link>
								)}

								{matches[1]?.pathname !== '/profile' && (
									<Link to="/profile/me">
										<DropdownMenuItem className="cursor-pointer">
											<User2 className="mr-2 h-5 w-5" />
											{t('my_devices_label')}
										</DropdownMenuItem>
									</Link>
								)}

								{matches[1]?.pathname !== '/profile' && (
									<Link to="/device/new">
										<DropdownMenuItem className="cursor-pointer">
											<PlusIcon className="mr-2 h-5 w-5" />
											{t('add_device_label')}
										</DropdownMenuItem>
									</Link>
								)}
							</DropdownMenuGroup>
						)}

						<DropdownMenuGroup>
							<DropdownMenuItem
								onSelect={(e) => {
									e.preventDefault()
								}}
							>
								{!user ? (
									<Link
										to={{
											pathname: 'login',
											search: searchParams.toString(),
										}}
										onClick={() => setOpen(false)}
										className="w-full cursor-pointer"
									>
										<button className="hover:bg-accent focus:bg-accent focus:text-accent-foreground relative flex w-full items-center rounded-sm text-sm outline-hidden transition-colors select-none">
											<LogIn className="mr-2 h-5 w-5" />
											<span className="text-light-green">
												{t('login_label')}
											</span>
										</button>
									</Link>
								) : (
									<Form
										action="/logout"
										method="post"
										onSubmit={() => {
											setOpen(false)
											toast({
												description: 'Successfully logged out.',
											})
										}}
										className="w-full cursor-pointer"
									>
										<input type="hidden" name="redirectTo" value={redirectTo} />
										<button
											type="submit"
											className="hover:bg-accent focus:bg-accent focus:text-accent-foreground relative flex w-full items-center rounded-sm text-sm outline-hidden transition-colors select-none"
											disabled={isLoggingOut}
										>
											<LogOut className="mr-2 h-5 w-5" />
											<span className="text-red-500">{t('logout_label')}</span>
										</button>
									</Form>
								)}
							</DropdownMenuItem>
						</DropdownMenuGroup>
					</div>
				</DropdownMenuContent>
			</DropdownMenu>
		</>
	)
}

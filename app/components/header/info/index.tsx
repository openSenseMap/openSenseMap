import {
	Globe,
	FileLock2,
	Coins,
	ExternalLink,
	ScrollText,
	MessagesSquare,
	InfoIcon,
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigation } from 'react-router'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useRootRouteLoaderData } from '~/root'
import { Button } from '~/components/ui/button'

export default function Info() {
	const { ENV } = useRootRouteLoaderData()
	const [open, setOpen] = useState(false)
	const navigation = useNavigation()

	const { t } = useTranslation('menu')

	return (
		<DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
			<DropdownMenuTrigger asChild>
				<div className="pointer-events-auto box-border h-10 w-10">
					<Button variant="topbar" size="topbarIcon">
						<InfoIcon />
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
					<DropdownMenuGroup>
						<Link to={ENV.COMMUNITY_URL} target="_blank">
							<DropdownMenuItem className="cursor-pointer">
								<MessagesSquare className="mr-2 h-5 w-5" />
								<span>{t('community_label')}</span>
								<ExternalLink className="ml-auto h-4 w-4 text-gray-300" />
							</DropdownMenuItem>
						</Link>
						<Link to="https://docs.opensensemap.org/" target="_blank">
							<DropdownMenuItem className="cursor-pointer">
								<Globe className="mr-2 h-5 w-5" />
								<span>{t('api_docs_label')}</span>
								<ExternalLink className="ml-auto h-4 w-4 text-gray-300" />
							</DropdownMenuItem>
						</Link>
					</DropdownMenuGroup>
					<DropdownMenuSeparator />
					<DropdownMenuGroup>
						<Link to={'/privacy'} prefetch="intent">
							<DropdownMenuItem className="cursor-pointer">
								<FileLock2 className="mr-2 h-5 w-5" />
								<span>{t('data_protection_label')}</span>
							</DropdownMenuItem>
						</Link>
					</DropdownMenuGroup>
					<DropdownMenuGroup>
						<Link to={'/terms'} target="_blank">
							<DropdownMenuItem
								onSelect={(e) => e.preventDefault()}
								className="cursor-pointer"
							>
								<ScrollText className="mr-2 inline h-5 w-5" />
								<span> {t('tos')}</span>
							</DropdownMenuItem>
						</Link>
					</DropdownMenuGroup>
					<DropdownMenuSeparator />

					<DropdownMenuGroup>
						<Link
							to={
								'https://www.betterplace.org/de/projects/89947-opensensemap-org-die-freie-karte-fuer-umweltdaten'
							}
							target="_blank"
						>
							<DropdownMenuItem
								onSelect={(e) => e.preventDefault()}
								className="cursor-pointer"
							>
								<Coins className="mr-2 inline h-5 w-5" />
								<span> {t('donate_label')}</span>
								<ExternalLink className="ml-auto h-4 w-4 text-gray-300" />
							</DropdownMenuItem>
						</Link>
					</DropdownMenuGroup>
				</div>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}

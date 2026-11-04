'use client'

import {
	createColumnHelper,
	type RowData,
	type ColumnDef,
} from '@tanstack/react-table'
import { ArrowUpDown, Ellipsis, LucideMapPin } from 'lucide-react'
import { type UseTranslationResponse } from 'react-i18next'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import { type Device } from '~/db/schema'
import { DeviceIdCell } from './device-id-cell'
import { type CustomTableFeatures } from './data-table'

export type SenseBox = {
	id: string
	name: string
	exposure: Device['exposure']
	createdAt: Date
	archivedAt: Date | null
	model: Device['model']
	// model: string;
}

const colStyle = 'pl-0 dark:text-white'

export function getColumns(
	useTranslation: UseTranslationResponse<'data-table', any>,
	hydrated: boolean,
	opts?: { isOwner?: boolean },
): ColumnDef<CustomTableFeatures, SenseBox, unknown>[] {
	const { t, i18n } = useTranslation
	const isOwner = opts?.isOwner ?? false

	const columnHelper = createColumnHelper<CustomTableFeatures, SenseBox>()

	return columnHelper.columns([
		columnHelper.accessor('name', {
			header: ({ column }) => {
				return (
					<Button
						variant="ghost"
						onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
						className={colStyle}
					>
						{t('name')}
						<ArrowUpDown className="ml-2 h-4 w-4" />
					</Button>
				)
			},
			cell: ({ row }) => {
				const device = row.original
				const isArchived = !!device.archivedAt

				return (
					<div className="flex items-center gap-2">
						<span
							className={
								isArchived
									? 'text-muted-foreground line-through opacity-70'
									: ''
							}
						>
							{device.name}
						</span>
						{isArchived ? (
							<span className="text-muted-foreground rounded-md border px-2 py-0.5 text-xs">
								{t('archived')}
							</span>
						) : null}
					</div>
				)
			},
		}),
		columnHelper.accessor('createdAt', {
			sortFn: 'datetime',
			header: ({ column }) => {
				return (
					<Button
						variant="ghost"
						className={colStyle}
						onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
					>
						{t('createdAt')}
						<ArrowUpDown className="ml-2 h-4 w-4" />
					</Button>
				)
			},
			cell: ({ row }) => {
				const date = new Date(row.getValue('createdAt'))
				return <div>{hydrated && date.toLocaleDateString(i18n.language)}</div>
			},
		}),
		columnHelper.accessor('exposure', {
			header: ({ column }) => {
				return (
					<Button
						variant="ghost"
						onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
						className={colStyle}
					>
						{t('exposure')}
						<ArrowUpDown className="ml-2 h-4 w-4" />
					</Button>
				)
			},
			cell: ({ row }) => {
				const exposure = row.original.exposure
				return <div>{t(`exposure_values.${exposure}`)}</div>
			},
		}),
		/*columnHelper.accessor("model", {
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className={styleVal}
        >
          {t("model")}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
  }, */
		columnHelper.accessor('id', {
			header: () => (
				<div className="text-muted-foreground pl-0">{t('device_id')}</div>
			),
			cell: ({ row }) => {
				const device = row.original

				return (
					<DeviceIdCell
						deviceId={device.id}
						copyLabel={t('copy_id')}
						copiedLabel={t('copied')}
					/>
				)
			},
		}),
		columnHelper.display({
			id: 'actions',
			header: () => (
				<div className="text-center dark:text-white">{t('actions')}</div>
			),
			cell: ({ row }) => {
				const device = row.original
				const isArchived = !!device.archivedAt

				if (isOwner)
					return (
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="ghost" className="h-8 w-8 p-0">
									<span className="sr-only">Open menu</span>
									<Ellipsis className="h-4 w-4" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent
								align="end"
								className="dark:bg-dark-background dark:text-dark-text"
							>
								<DropdownMenuLabel>{t('actions')}</DropdownMenuLabel>
								<DropdownMenuSeparator />
								<DropdownMenuItem asChild>
									<a href={`/device/${device.id}/overview`}>{t('overview')}</a>
								</DropdownMenuItem>
								<DropdownMenuItem disabled={isArchived} asChild>
									<a href={`/explore/${device.id}`}>{t('show_on_map')}</a>
								</DropdownMenuItem>
								<DropdownMenuItem disabled={isArchived} asChild={!isArchived}>
									{isArchived ? (
										<span>{t('edit')}</span>
									) : (
										<a href={`/device/${device.id}/edit/general`}>
											{t('edit')}
										</a>
									)}
								</DropdownMenuItem>
								<DropdownMenuItem disabled={isArchived} asChild={!isArchived}>
									{isArchived ? (
										<span>{t('data_upload')}</span>
									) : (
										<a href={`/device/${device.id}/dataupload`}>
											{t('data_upload')}
										</a>
									)}
								</DropdownMenuItem>
								{((device.model?.toLowerCase() ?? '').indexOf('sensebox') >=
									0 ||
									(device.model?.toLowerCase() ?? '').indexOf('home') >= 0) && (
									<DropdownMenuItem disabled={isArchived} asChild>
										<a
											href="https://sensebox.de/de/go-home"
											target="_blank"
											rel="noopener noreferrer"
										>
											{t('support')}
										</a>
									</DropdownMenuItem>
								)}
								<DropdownMenuItem
									onClick={() => navigator.clipboard.writeText(device.id)}
									className="cursor-pointer"
								>
									{t('copy_id')}
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					)
				else
					return (
						<Link to={`/explore/${device.id}`} title={t('show_on_map')}>
							<span className="sr-only">Show on map</span>
							<LucideMapPin className="h-4 w-4" />
						</Link>
					)
			},
		}),
	])
}

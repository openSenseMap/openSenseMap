'use client'

import {
	type CellData,
	type ColumnDef,
	type ColumnFiltersState,
	type RowData,
	type SortingState,
	columnFilteringFeature,
	columnVisibilityFeature,
	createFilteredRowModel,
	createPaginatedRowModel,
	createSortedRowModel,
	filterFn_includesString,
	flexRender,
	rowPaginationFeature,
	rowSelectionFeature,
	rowSortingFeature,
	sortFn_alphanumeric,
	sortFn_datetime,
	sortFn_text,
	tableFeatures,
	useTable,
} from '@tanstack/react-table'
import {
	ChevronLeft,
	ChevronRight,
	ChevronsLeft,
	ChevronsRight,
} from 'lucide-react'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
	Select,
	SelectTrigger,
	SelectValue,
	SelectContent,
	SelectItem,
} from '@/components/ui/select'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table'

export const customTableFeatures = tableFeatures({
	rowSortingFeature,
	rowPaginationFeature,
	rowSelectionFeature,
	columnFilteringFeature,
	columnVisibilityFeature,
	sortedRowModel: createSortedRowModel(),
	paginatedRowModel: createPaginatedRowModel(),
	filteredRowModel: createFilteredRowModel(),
	sortFns: {
		alphanumeric: sortFn_alphanumeric,
		datetime: sortFn_datetime,
		text: sortFn_text,
	},
	filterFns: { includesString: filterFn_includesString },
})

export type CustomTableFeatures = typeof customTableFeatures

interface DataTableProps<TData extends RowData, TValue extends CellData> {
	columns: ColumnDef<CustomTableFeatures, RowData, TValue>[]
	data: TData[]
	getRowClassName?: (row: TData) => string
}

export function DataTable<TData extends RowData, TValue extends CellData>({
	columns,
	data,
	getRowClassName,
}: DataTableProps<TData, TValue>) {
	const [sorting, setSorting] = React.useState<SortingState>([
		{ id: 'createdAt', desc: true },
	])
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
		[],
	)

	const table = useTable({
		features: customTableFeatures,
		columns: columns as ColumnDef<CustomTableFeatures, TData, unknown>[],
		data,
		onSortingChange: setSorting,
		onColumnFiltersChange: setColumnFilters,
		state: {
			sorting,
			columnFilters,
		},
		initialState: {
			pagination: {
				pageSize: 5,
				pageIndex: 0,
			},
		},
		enableRowRangeSelection: false,
	})

	const tableColsWidth = [30, 30, 30, 40]
	const { t } = useTranslation('data-table')

	return (
		<div className="w-full max-w-full min-w-0 overflow-hidden">
			<div className="flex items-center py-4">
				<Input
					placeholder={t('filter_names')}
					value={(table.getColumn('name')?.getFilterValue() as string) ?? ''}
					onChange={(event) =>
						table.getColumn('name')?.setFilterValue(event.target.value)
					}
					className="border-input bg-background text-foreground placeholder:text-muted-foreground max-w-sm"
				/>
			</div>

			<div className="border-border bg-card max-w-full min-w-0 overflow-hidden rounded-md border">
				<Table>
					<TableHeader>
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow key={headerGroup.id}>
								{headerGroup.headers.map((header) => (
									<TableHead key={header.id}>
										{header.isPlaceholder
											? null
											: flexRender(
													header.column.columnDef.header,
													header.getContext(),
												)}
									</TableHead>
								))}
							</TableRow>
						))}
					</TableHeader>

					<TableBody>
						{table.getRowModel().rows?.length ? (
							table.getRowModel().rows.map((row) => (
								<TableRow
									key={row.id}
									data-state={row.getIsSelected() && 'selected'}
									className={getRowClassName?.(row.original) ?? ''}
								>
									{row.getVisibleCells().map((cell, index) => (
										<TableCell
											key={cell.id}
											style={{ width: `${tableColsWidth[index]}%` }}
										>
											{flexRender(
												cell.column.columnDef.cell,
												cell.getContext(),
											)}
										</TableCell>
									))}
								</TableRow>
							))
						) : (
							<TableRow>
								<TableCell
									colSpan={columns.length}
									className="text-muted-foreground h-24 text-center"
								>
									{t('no_results')}
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>

			<div className="text-foreground flex justify-center py-4">
				<div className="flex flex-col items-center gap-3 sm:flex-row sm:gap-6">
					<div className="flex flex-wrap items-center space-x-2">
						<span className="text-sm font-medium">{t('rows_per_page')}</span>
						<Select
							value={table.state.pagination.pageSize.toString()}
							onValueChange={(value) => {
								table.setPageSize(Number(value))
							}}
						>
							<SelectTrigger className="border-input bg-background text-foreground h-8 w-16">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{[5, 10, 20, 30, 40, 50].map((item) => (
									<SelectItem key={item} value={item.toString()}>
										{item}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="text-sm font-medium">
						{t('page')}
						{` ${table.state.pagination.pageIndex + 1} `}
						{t('of')}
						{` ${table.getPageCount() ?? 10}`}
					</div>
					<div className="flex items-center space-x-2">
						<Button
							variant="outline"
							size="sm"
							className="h-8 w-8 px-0"
							onClick={() => table.setPageIndex(0)}
							disabled={!table.getCanPreviousPage()}
						>
							<ChevronsLeft className="h-5 w-5" aria-hidden="true" />
							<span className="sr-only">{t('first_page')}</span>
						</Button>
						<Button
							variant="outline"
							size="sm"
							className="h-8 w-8 px-0"
							onClick={() => table.previousPage()}
							disabled={!table.getCanPreviousPage()}
						>
							<ChevronLeft className="h-5 w-5" aria-hidden="true" />
							<span className="sr-only">{t('previous_page')}</span>
						</Button>
						<Button
							variant="outline"
							size="sm"
							className="h-8 w-8 px-0"
							onClick={() => table.nextPage()}
							disabled={!table.getCanNextPage()}
						>
							<ChevronRight className="h-5 w-5" aria-hidden="true" />
							<span className="sr-only">{t('next_page')}</span>
						</Button>
						<Button
							variant="outline"
							size="sm"
							className="h-8 w-8 px-0"
							onClick={() => table.setPageIndex(table.getPageCount() - 1)}
							disabled={!table.getCanNextPage()}
						>
							<ChevronsRight className="h-5 w-5" aria-hidden="true" />
							<span className="sr-only">{t('last_page')}</span>
						</Button>
					</div>
				</div>
			</div>
		</div>
	)
}

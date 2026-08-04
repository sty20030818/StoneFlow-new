'use client'

/**
 * Linear 式筛选菜单：一级字段列表 + 侧向 Sub 二级值列表。
 * 勾选即写入 FilterQuery；无 drill-in、无「应用」按钮。
 */
import { useState, type ReactNode } from 'react'

import { Input } from '@/shared/components/base/input'
import { Kbd } from '@/shared/components/base/kbd'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from '@/shared/components/base/dropdown-menu'
import { cn } from '@/shared/lib/utils'

import { setFilterFieldClause, type FilterField, type FilterQuery } from '../core'
import { useListFilterUi } from '../model/ListFilterUiContext'
import { FILTER_MENU_FIELDS, formatFilterFieldLabel } from './filterLabels'
import { getFilterFieldLeading } from './filterOptionCatalog'
import { FilterValueSubMenu } from './FilterValueSubMenu'

type FilterMenuProps = {
	trigger: ReactNode
	open?: boolean
	onOpenChange?: (open: boolean) => void
	className?: string
}

export function FilterMenu({ trigger, open, onOpenChange, className }: FilterMenuProps) {
	const ui = useListFilterUi()
	const [internalOpen, setInternalOpen] = useState(false)
	const [query, setQuery] = useState('')
	const isOpen = open ?? internalOpen
	const setOpen = onOpenChange ?? setInternalOpen

	if (!ui) {
		return <>{trigger}</>
	}

	const { session, projects } = ui
	const normalizedQuery = query.trim().toLowerCase()
	const visibleFields = FILTER_MENU_FIELDS.filter((field) =>
		normalizedQuery.length === 0
			? true
			: formatFilterFieldLabel(field).toLowerCase().includes(normalizedQuery),
	)

	function handleOpenChange(next: boolean) {
		setOpen(next)
		if (!next) {
			setQuery('')
		}
	}

	function toggleValue(field: FilterField, value: string) {
		const existing = session.effective.clauses.find((c) => c.field === field && c.op === 'is')
		const current = existing?.values ?? []
		const nextValues = current.includes(value)
			? current.filter((item) => item !== value)
			: [...current, value]
		const next: FilterQuery = setFilterFieldClause(session.effective, field, 'is', nextValues)
		session.replaceEffective(next)
	}

	function isChecked(field: FilterField, value: string) {
		const existing = session.effective.clauses.find((c) => c.field === field && c.op === 'is')
		return existing?.values.includes(value) ?? false
	}

	return (
		<DropdownMenu onOpenChange={handleOpenChange} open={isOpen}>
			<DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
			<DropdownMenuContent align='end' className={cn('w-60 min-w-60', className)} sideOffset={6}>
				{/* Linear: 顶部搜索 + F 快捷键提示 */}
				<div className='flex items-center gap-2 border-b border-border px-2 py-1.5'>
					<Input
						aria-label='筛选字段'
						className='h-7 border-0 bg-transparent px-1 shadow-none focus-visible:ring-0'
						onChange={(event) => setQuery(event.target.value)}
						onKeyDown={(event) => event.stopPropagation()}
						placeholder='添加筛选…'
						value={query}
					/>
					<Kbd className='shrink-0'>F</Kbd>
				</div>

				<DropdownMenuGroupSection>
					{visibleFields.map((field) => (
						<DropdownMenuSub key={field}>
							<DropdownMenuSubTrigger className='gap-2'>
								<span className='flex size-4 shrink-0 items-center justify-center' aria-hidden>
									{getFilterFieldLeading(field)}
								</span>
								<span className='flex-1'>{formatFilterFieldLabel(field)}</span>
							</DropdownMenuSubTrigger>
							<DropdownMenuSubContent className='w-56 overflow-hidden p-0'>
								<FilterValueSubMenu
									field={field}
									isChecked={(value) => isChecked(field, value)}
									onToggle={(value) => toggleValue(field, value)}
									projects={projects}
								/>
							</DropdownMenuSubContent>
						</DropdownMenuSub>
					))}
					{visibleFields.length === 0 ? (
						<DropdownMenuItem disabled>无匹配字段</DropdownMenuItem>
					) : null}
				</DropdownMenuGroupSection>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}

function DropdownMenuGroupSection({ children }: { children: ReactNode }) {
	return <div className='p-1'>{children}</div>
}

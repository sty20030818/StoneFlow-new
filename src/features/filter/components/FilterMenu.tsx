'use client'

/**
 * Linear 式筛选菜单：一级字段列表 + 侧向 Sub 二级值列表。
 * 勾选即写入 FilterQuery；无 drill-in、无「应用」按钮。
 */
import { useMemo, useState, type ReactNode } from 'react'
import {
	CalendarClockIcon,
	CalendarIcon,
	CircleDotIcon,
	FolderIcon,
	SignalHighIcon,
} from 'lucide-react'

import { Input } from '@/shared/components/base/input'
import { Kbd } from '@/shared/components/base/kbd'
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from '@/shared/components/base/dropdown-menu'
import { cn } from '@/shared/lib/utils'

import { setFilterFieldClause, type FilterField, type FilterQuery } from '../core'
import { useListFilterUi } from '../model/ListFilterUiContext'
import {
	DATE_OPTIONS,
	FILTER_MENU_FIELDS,
	formatFilterFieldLabel,
	PRIORITY_OPTIONS,
	STATUS_OPTIONS,
} from './filterLabels'

type FilterMenuProps = {
	trigger: ReactNode
	open?: boolean
	onOpenChange?: (open: boolean) => void
	className?: string
}

const FIELD_ICONS: Record<FilterField, ReactNode> = {
	status: <CircleDotIcon className='size-4 text-sf-text-tertiary' />,
	priority: <SignalHighIcon className='size-4 text-sf-text-tertiary' />,
	project: <FolderIcon className='size-4 text-sf-text-tertiary' />,
	due: <CalendarIcon className='size-4 text-sf-text-tertiary' />,
	planned: <CalendarClockIcon className='size-4 text-sf-text-tertiary' />,
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
								{FIELD_ICONS[field]}
								<span className='flex-1'>{formatFilterFieldLabel(field)}</span>
							</DropdownMenuSubTrigger>
							<DropdownMenuSubContent className='w-56 max-h-72 overflow-y-auto p-0'>
								<FieldValueSubMenu
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

function FieldValueSubMenu({
	field,
	isChecked,
	onToggle,
	projects,
}: {
	field: FilterField
	isChecked: (value: string) => boolean
	onToggle: (value: string) => void
	projects?: Array<{ id: string; name: string }>
}) {
	const [subQuery, setSubQuery] = useState('')
	const options = useMemo(() => {
		switch (field) {
			case 'status':
				return STATUS_OPTIONS
			case 'priority':
				return PRIORITY_OPTIONS
			case 'due':
			case 'planned':
				return DATE_OPTIONS
			case 'project':
				return [
					{ value: '__none__', label: '独立事项' },
					...(projects ?? []).map((project) => ({
						value: project.id,
						label: project.name,
					})),
				]
			default:
				return []
		}
	}, [field, projects])

	const filtered = useMemo(() => {
		const q = subQuery.trim().toLowerCase()
		if (!q) return options
		return options.filter((option) => option.label.toLowerCase().includes(q))
	}, [options, subQuery])

	return (
		<>
			<div className='border-b border-border px-2 py-1.5'>
				<Input
					aria-label={`${formatFilterFieldLabel(field)} 筛选`}
					className='h-7 border-0 bg-transparent px-1 shadow-none focus-visible:ring-0'
					onChange={(event) => setSubQuery(event.target.value)}
					onKeyDown={(event) => event.stopPropagation()}
					placeholder='筛选…'
					value={subQuery}
				/>
			</div>
			<div className='p-1'>
				{filtered.map((option) => (
					<DropdownMenuCheckboxItem
						checked={isChecked(option.value)}
						className='pr-2 pl-2'
						key={option.value}
						onCheckedChange={() => onToggle(option.value)}
						// 多选时保持菜单打开
						onSelect={(event) => event.preventDefault()}
					>
						<span className='flex min-w-0 flex-1 items-center gap-2'>
							<span className='truncate'>{option.label}</span>
						</span>
					</DropdownMenuCheckboxItem>
				))}
				{filtered.length === 0 ? (
					<DropdownMenuLabel className='normal-case tracking-normal text-sf-text-tertiary'>
						无匹配项
					</DropdownMenuLabel>
				) : null}
			</div>
		</>
	)
}

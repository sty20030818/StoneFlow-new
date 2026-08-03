'use client'

/**
 * 锚定「添加筛选」菜单：字段 → 多选值 → 写入 session temp。
 */
import { useMemo, useState, type ReactNode } from 'react'
import { CheckIcon, ChevronRightIcon } from 'lucide-react'

import { Button } from '@/shared/components/base/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/base/popover'
import { cn } from '@/shared/lib/utils'

import {
	createFilterClause,
	createFilterClauseId,
	normalizeFilterQuery,
	type FilterClause,
	type FilterField,
	type FilterQuery,
} from '../core'
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

export function FilterMenu({ trigger, open, onOpenChange, className }: FilterMenuProps) {
	const ui = useListFilterUi()
	const [field, setField] = useState<FilterField | null>(null)
	const [internalOpen, setInternalOpen] = useState(false)
	const isOpen = open ?? internalOpen
	const setOpen = onOpenChange ?? setInternalOpen

	if (!ui) {
		return <>{trigger}</>
	}

	const { session, projects } = ui

	function handleOpenChange(next: boolean) {
		setOpen(next)
		if (!next) {
			setField(null)
		}
	}

	function applyClause(nextClause: FilterClause) {
		const withoutField = session.effective.clauses.filter((c) => c.field !== nextClause.field)
		const next: FilterQuery = normalizeFilterQuery({
			clauses: [...withoutField, nextClause],
		})
		session.replaceEffective(next)
		handleOpenChange(false)
	}

	return (
		<Popover onOpenChange={handleOpenChange} open={isOpen}>
			<PopoverTrigger asChild>{trigger}</PopoverTrigger>
			<PopoverContent align='end' className={cn('w-64 p-1', className)} sideOffset={6}>
				{field == null ? (
					<div className='flex flex-col py-1' role='menu'>
						<p className='px-2 py-1.5 text-[11px] font-medium text-sf-text-tertiary'>添加筛选</p>
						{FILTER_MENU_FIELDS.map((item) => (
							<button
								className='flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted'
								key={item}
								onClick={() => setField(item)}
								type='button'
							>
								<span>{formatFilterFieldLabel(item)}</span>
								<ChevronRightIcon className='size-3.5 text-sf-text-tertiary' />
							</button>
						))}
					</div>
				) : (
					<FieldValuePicker
						existing={session.effective.clauses.find((c) => c.field === field)}
						field={field}
						onApply={applyClause}
						onBack={() => setField(null)}
						projects={projects}
					/>
				)}
			</PopoverContent>
		</Popover>
	)
}

function FieldValuePicker({
	field,
	existing,
	onApply,
	onBack,
	projects,
}: {
	field: FilterField
	existing?: FilterClause
	onApply: (clause: FilterClause) => void
	onBack: () => void
	projects?: Array<{ id: string; name: string }>
}) {
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
					...(projects ?? []).map((p) => ({ value: p.id, label: p.name })),
				]
			default:
				return []
		}
	}, [field, projects])

	const [selected, setSelected] = useState<string[]>(() => existing?.values ?? [])
	const [op, setOp] = useState<'is' | 'is_not'>(existing?.op === 'is_not' ? 'is_not' : 'is')

	function toggle(value: string) {
		setSelected((current) =>
			current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
		)
	}

	return (
		<div className='flex flex-col py-1'>
			<div className='flex items-center justify-between gap-2 px-2 py-1.5'>
				<button
					className='text-[12px] text-sf-text-tertiary hover:text-foreground'
					onClick={onBack}
					type='button'
				>
					← 返回
				</button>
				<span className='text-[12px] font-medium'>{formatFilterFieldLabel(field)}</span>
				<div className='flex gap-1'>
					<button
						className={cn(
							'rounded px-1.5 py-0.5 text-[11px]',
							op === 'is' ? 'bg-muted font-medium' : 'text-sf-text-tertiary',
						)}
						onClick={() => setOp('is')}
						type='button'
					>
						是
					</button>
					<button
						className={cn(
							'rounded px-1.5 py-0.5 text-[11px]',
							op === 'is_not' ? 'bg-muted font-medium' : 'text-sf-text-tertiary',
						)}
						onClick={() => setOp('is_not')}
						type='button'
					>
						不是
					</button>
				</div>
			</div>
			<div className='max-h-56 overflow-y-auto'>
				{options.map((option) => {
					const checked = selected.includes(option.value)
					return (
						<button
							className='flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted'
							key={option.value}
							onClick={() => toggle(option.value)}
							type='button'
						>
							<span
								className={cn(
									'flex size-4 items-center justify-center rounded border',
									checked ? 'border-primary bg-primary text-primary-foreground' : 'border-border',
								)}
							>
								{checked ? <CheckIcon className='size-3' /> : null}
							</span>
							{option.label}
						</button>
					)
				})}
			</div>
			<div className='border-t border-border px-2 py-1.5'>
				<Button
					className='w-full'
					disabled={selected.length === 0}
					onClick={() =>
						onApply(
							createFilterClause(field, op, selected, existing?.id ?? createFilterClauseId()),
						)
					}
					size='sm'
					type='button'
				>
					应用
				</Button>
			</div>
		</div>
	)
}

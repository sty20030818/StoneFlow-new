'use client'

/**
 * 筛选公式条：chip（field 固定 / op·值可改）+ Clear（仅 dirty）+ Save。
 */
import { useState } from 'react'
import { PlusIcon, XIcon } from 'lucide-react'

import { Button } from '@/shared/components/base/button'
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/shared/components/base/dialog'
import { Input } from '@/shared/components/base/input'
import { ActionTooltip, OverflowTooltip } from '@/shared/components/tooltip'
import { cn } from '@/shared/lib/utils'

import {
	createFilterClause,
	normalizeFilterQuery,
	type FilterClause,
	type FilterOp,
	type FilterQuery,
} from '../core'
import { useListFilterUi } from '../model/ListFilterUiContext'
import { FilterMenu } from './FilterMenu'
import {
	formatClauseValuesSummary,
	formatFilterFieldLabel,
	formatFilterOpLabel,
} from './filterLabels'
import { getFilterValueOptions } from './filterOptionCatalog'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/base/popover'

export function FilterBar({ className }: { className?: string }) {
	const ui = useListFilterUi()
	const [saveOpen, setSaveOpen] = useState(false)
	const [filterMenuOpen, setFilterMenuOpen] = useState(false)
	const [filterTooltipOpen, setFilterTooltipOpen] = useState(false)

	if (!ui) return null

	const { session, projects, canOverwriteView, onSave } = ui
	const { effective, dirty, isEmpty, clearTemp, replaceEffective } = session

	// 干净空：不渲染；干净非空（View 定义）渲染 chip 且无 Clear；dirty 显示 Clear
	if (isEmpty && !dirty) {
		return null
	}

	function removeClause(clauseId: string) {
		const next: FilterQuery = normalizeFilterQuery({
			clauses: effective.clauses.filter((c) => c.id !== clauseId),
		})
		replaceEffective(next)
	}

	function updateClause(nextClause: FilterClause) {
		const next: FilterQuery = normalizeFilterQuery({
			clauses: effective.clauses.map((c) => (c.id === nextClause.id ? nextClause : c)),
		})
		replaceEffective(next)
	}

	const showBar = !isEmpty || dirty

	return (
		<div className={cn('flex flex-col gap-1.5', className)}>
			{showBar ? (
				<div className='flex flex-wrap items-center gap-1.5 rounded-lg border border-border/80 bg-muted/30 px-2 py-1.5'>
					{effective.clauses.map((clause) => (
						<FilterChip
							clause={clause}
							key={clause.id}
							onRemove={() => removeClause(clause.id)}
							onUpdate={updateClause}
							projects={projects}
						/>
					))}
					<ActionTooltip
						onOpenChange={(nextOpen) => setFilterTooltipOpen(nextOpen && !filterMenuOpen)}
						open={filterTooltipOpen && !filterMenuOpen}
					>
						<FilterMenu
							onOpenChange={(nextOpen) => {
								setFilterMenuOpen(nextOpen)
								if (nextOpen) {
									setFilterTooltipOpen(false)
								}
							}}
							open={filterMenuOpen}
							trigger={
								<ActionTooltip.Trigger asChild>
									<Button
										aria-label='添加筛选'
										className='size-7'
										size='icon'
										type='button'
										variant='ghost'
									>
										<PlusIcon className='size-3.5' />
									</Button>
								</ActionTooltip.Trigger>
							}
						/>
						<ActionTooltip.Content>
							<ActionTooltip.Row label='添加筛选' />
						</ActionTooltip.Content>
					</ActionTooltip>
					<div className='ml-auto flex items-center gap-1.5'>
						{dirty ? (
							<Button onClick={() => clearTemp()} size='sm' type='button' variant='ghost'>
								清除
							</Button>
						) : null}
						{!isEmpty && onSave ? (
							<Button onClick={() => setSaveOpen(true)} size='sm' type='button' variant='outline'>
								保存
							</Button>
						) : null}
					</div>
				</div>
			) : null}

			{onSave ? (
				<FilterSaveDialog
					canOverwrite={Boolean(canOverwriteView)}
					onOpenChange={setSaveOpen}
					onSave={onSave}
					open={saveOpen}
				/>
			) : null}
		</div>
	)
}

function FilterChip({
	clause,
	onUpdate,
	onRemove,
	projects,
}: {
	clause: FilterClause
	onUpdate: (clause: FilterClause) => void
	onRemove: () => void
	projects?: Array<{ id: string; name: string }>
}) {
	const multi = clause.values.length > 1
	return (
		<div className='inline-flex max-w-full items-center gap-0.5 rounded-md border border-border bg-background px-1.5 py-0.5 text-[12px]'>
			<span className='shrink-0 px-0.5 font-medium text-sf-text-secondary'>
				{formatFilterFieldLabel(clause.field)}
			</span>
			<OpPicker multi={multi} op={clause.op} onChange={(op) => onUpdate({ ...clause, op })} />
			<ValuesPicker
				clause={clause}
				onChange={(values) =>
					onUpdate(createFilterClause(clause.field, clause.op, values, clause.id))
				}
				projects={projects}
			/>
			<ActionTooltip>
				<ActionTooltip.Trigger asChild>
					<button
						aria-label='删除筛选条件'
						className='rounded p-0.5 text-sf-text-tertiary hover:bg-muted hover:text-foreground'
						onClick={onRemove}
						type='button'
					>
						<XIcon className='size-3' />
					</button>
				</ActionTooltip.Trigger>
				<ActionTooltip.Content>
					<ActionTooltip.Row label='删除筛选条件' />
				</ActionTooltip.Content>
			</ActionTooltip>
		</div>
	)
}

function OpPicker({
	op,
	multi,
	onChange,
}: {
	op: FilterOp
	multi: boolean
	onChange: (op: FilterOp) => void
}) {
	const [open, setOpen] = useState(false)
	return (
		<Popover onOpenChange={setOpen} open={open}>
			<PopoverTrigger asChild>
				<button
					className='rounded px-1 text-sf-text-tertiary hover:bg-muted hover:text-foreground'
					type='button'
				>
					{formatFilterOpLabel(op, multi)}
				</button>
			</PopoverTrigger>
			<PopoverContent align='start' className='w-28 p-1'>
				{(['is', 'is_not'] as const).map((value) => (
					<button
						className={cn(
							'flex w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted',
							value === op && 'font-medium',
						)}
						key={value}
						onClick={() => {
							onChange(value)
							setOpen(false)
						}}
						type='button'
					>
						{formatFilterOpLabel(value, multi)}
					</button>
				))}
			</PopoverContent>
		</Popover>
	)
}

function ValuesPicker({
	clause,
	onChange,
	projects,
}: {
	clause: FilterClause
	onChange: (values: string[]) => void
	projects?: Array<{ id: string; name: string }>
}) {
	const [open, setOpen] = useState(false)
	const options = getFilterValueOptions(clause.field, projects)
	const summary = formatClauseValuesSummary(clause, projects)

	function toggle(value: string) {
		const next = clause.values.includes(value)
			? clause.values.filter((v) => v !== value)
			: [...clause.values, value]
		if (next.length > 0) {
			onChange(next)
		}
	}

	return (
		<Popover onOpenChange={setOpen} open={open}>
			<PopoverTrigger asChild>
				<button
					className='flex max-w-[140px] min-w-0 rounded px-1 font-medium hover:bg-muted'
					type='button'
				>
					{open ? (
						<span className='min-w-0 truncate'>{summary}</span>
					) : (
						<OverflowTooltip className='min-w-0' content={summary}>
							{summary}
						</OverflowTooltip>
					)}
				</button>
			</PopoverTrigger>
			<PopoverContent align='start' className='max-h-56 w-48 overflow-y-auto p-1'>
				{options.map((option) => {
					const checked = clause.values.includes(option.value)
					return (
						<button
							className={cn(
								'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted',
								checked && 'font-medium',
							)}
							key={option.value}
							onClick={() => toggle(option.value)}
							type='button'
						>
							{option.leading ? (
								<span className='flex size-4 shrink-0 items-center justify-center' aria-hidden>
									{option.leading}
								</span>
							) : null}
							<OverflowTooltip className='min-w-0 flex-1' content={option.label}>
								{option.label}
							</OverflowTooltip>
						</button>
					)
				})}
			</PopoverContent>
		</Popover>
	)
}

function FilterSaveDialog({
	open,
	onOpenChange,
	canOverwrite,
	onSave,
}: {
	open: boolean
	onOpenChange: (open: boolean) => void
	canOverwrite: boolean
	onSave: (input: { mode: 'create' | 'overwrite'; name?: string }) => Promise<void>
}) {
	const [name, setName] = useState('')
	const [busy, setBusy] = useState(false)

	async function run(mode: 'create' | 'overwrite') {
		if (mode === 'create' && name.trim().length === 0) return
		setBusy(true)
		try {
			await onSave({ mode, name: name.trim() || undefined })
			onOpenChange(false)
			setName('')
		} finally {
			setBusy(false)
		}
	}

	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent className='max-w-sm'>
				<DialogHeader>
					<DialogTitle>保存为视图</DialogTitle>
				</DialogHeader>
				<div className='grid gap-3 py-2'>
					<label className='grid gap-1.5 text-sm'>
						<span className='text-sf-text-secondary'>视图名称</span>
						<Input
							disabled={busy}
							onChange={(event) => setName(event.target.value)}
							placeholder='例如：高优先级进行中'
							value={name}
						/>
					</label>
					<p className='text-[12px] text-sf-text-tertiary'>仅保存筛选条件，不包含显示选项。</p>
				</div>
				<DialogFooter className='gap-2 sm:gap-2'>
					<Button onClick={() => onOpenChange(false)} type='button' variant='outline'>
						取消
					</Button>
					{canOverwrite ? (
						<Button
							disabled={busy}
							onClick={() => void run('overwrite')}
							type='button'
							variant='secondary'
						>
							覆盖当前
						</Button>
					) : null}
					<Button
						disabled={busy || name.trim().length === 0}
						onClick={() => void run('create')}
						type='button'
					>
						另存为
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}

'use client'

/**
 * 筛选公式条：chip（field 固定 / op·值可改）+ Clear（仅 dirty）+ Save。
 */
import { useState } from 'react'
import { Button, Dropdown, Input, Label, Modal, type Selection } from '@heroui/react'
import { PlusIcon, XIcon } from 'lucide-react'

import { COMMAND_IDS, CommandActionTooltip } from '@/features/command'
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

export function FilterBar({ className }: { className?: string }) {
	const { session, projects, canOverwriteView, onSave } = useListFilterUi()
	const [saveOpen, setSaveOpen] = useState(false)
	const [filterMenuOpen, setFilterMenuOpen] = useState(false)
	const [filterTooltipOpen, setFilterTooltipOpen] = useState(false)

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

	return (
		<div className={cn('flex flex-col gap-1.5', className)}>
			<div className='flex flex-wrap items-center gap-1.5 rounded-lg border border-border bg-surface-secondary px-2 py-1.5'>
				{effective.clauses.map((clause) => (
					<FilterChip
						clause={clause}
						key={clause.id}
						onRemove={() => removeClause(clause.id)}
						onUpdate={updateClause}
						projects={projects}
					/>
				))}
				<FilterMenu
					onOpenChange={(nextOpen) => {
						setFilterMenuOpen(nextOpen)
						if (nextOpen) {
							setFilterTooltipOpen(false)
						}
					}}
					open={filterMenuOpen}
					trigger={
						<CommandActionTooltip
							commandId={COMMAND_IDS.filterAdd}
							isOpen={filterTooltipOpen && !filterMenuOpen}
							label='添加筛选'
							onOpenChange={(nextOpen) => setFilterTooltipOpen(nextOpen && !filterMenuOpen)}
						>
							<Button aria-label='添加筛选' isIconOnly size='sm' type='button' variant='ghost'>
								<PlusIcon className='size-3.5' />
							</Button>
						</CommandActionTooltip>
					}
				/>
				<div className='ml-auto flex items-center gap-1.5'>
					{dirty ? (
						<Button onPress={() => clearTemp()} size='sm' type='button' variant='ghost'>
							清除
						</Button>
					) : null}
					{!isEmpty && onSave ? (
						<Button onPress={() => setSaveOpen(true)} size='sm' type='button' variant='outline'>
							保存
						</Button>
					) : null}
				</div>
			</div>

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
		<div className='inline-flex max-w-full items-center gap-0.5 rounded-md border border-border bg-surface px-1.5 py-0.5 text-[12px]'>
			<span className='shrink-0 px-0.5 font-medium text-muted'>
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
			<ActionTooltip label='删除筛选条件'>
				<Button
					aria-label='删除筛选条件'
					isIconOnly
					onPress={onRemove}
					size='sm'
					type='button'
					variant='ghost'
				>
					<XIcon className='size-3' />
				</Button>
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
	return (
		<Dropdown>
			<Button aria-label='筛选运算符' className='min-w-0' size='sm' type='button' variant='ghost'>
				{formatFilterOpLabel(op, multi)}
			</Button>
			<Dropdown.Popover className='w-28' placement='bottom start'>
				<Dropdown.Menu aria-label='筛选运算符' selectedKeys={[op]} selectionMode='single'>
					{(['is', 'is_not'] as const).map((value) => (
						<Dropdown.Item
							id={value}
							key={value}
							onAction={() => onChange(value)}
							textValue={formatFilterOpLabel(value, multi)}
						>
							<Dropdown.ItemIndicator />
							{formatFilterOpLabel(value, multi)}
						</Dropdown.Item>
					))}
				</Dropdown.Menu>
			</Dropdown.Popover>
		</Dropdown>
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
	const options = getFilterValueOptions(clause.field, projects)
	const summary = formatClauseValuesSummary(clause, projects)

	function handleSelectionChange(selection: Selection) {
		const selectedKeys =
			selection === 'all' ? new Set(options.map((option) => option.value)) : selection
		const next = options
			.filter((option) => selectedKeys.has(option.value))
			.map((option) => option.value)
		if (next.length > 0) {
			onChange(next)
		}
	}

	return (
		<Dropdown>
			<Button
				aria-label={`筛选值 ${summary}`}
				className='max-w-35 min-w-0'
				size='sm'
				type='button'
				variant='ghost'
			>
				<span className='min-w-0 truncate' title={summary}>
					{summary}
				</span>
			</Button>
			<Dropdown.Popover className='w-48' placement='bottom start'>
				<Dropdown.Menu
					aria-label='筛选值'
					disallowEmptySelection
					selectedKeys={clause.values}
					selectionMode='multiple'
					shouldCloseOnSelect={false}
					onSelectionChange={handleSelectionChange}
				>
					{options.map((option) => {
						return (
							<Dropdown.Item
								id={option.value}
								key={option.value}
								shouldCloseOnSelect={false}
								textValue={option.label}
							>
								<Dropdown.ItemIndicator />
								{option.leading ? (
									<span className='flex size-4 shrink-0 items-center justify-center' aria-hidden>
										{option.leading}
									</span>
								) : null}
								<OverflowTooltip className='min-w-0 flex-1' content={option.label}>
									{option.label}
								</OverflowTooltip>
							</Dropdown.Item>
						)
					})}
				</Dropdown.Menu>
			</Dropdown.Popover>
		</Dropdown>
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
		<Modal.Backdrop isOpen={open} onOpenChange={onOpenChange}>
			<Modal.Container placement='center'>
				<Modal.Dialog className='max-w-sm gap-0 overflow-hidden p-0'>
					<Modal.Header className='px-5 py-4'>
						<Modal.Heading>保存为视图</Modal.Heading>
					</Modal.Header>
					<Modal.Body className='grid gap-3 px-5 py-2'>
						<div className='grid gap-1.5 text-sm'>
							<Label htmlFor='filter-view-name'>视图名称</Label>
							<Input
								fullWidth
								id='filter-view-name'
								disabled={busy}
								onChange={(event) => setName(event.currentTarget.value)}
								placeholder='例如：高优先级进行中'
								value={name}
							/>
						</div>
						<p className='text-[12px] text-muted'>仅保存筛选条件，不包含显示选项。</p>
					</Modal.Body>
					<Modal.Footer className='gap-2 px-5 py-4'>
						<Button onPress={() => onOpenChange(false)} type='button' variant='tertiary'>
							取消
						</Button>
						{canOverwrite ? (
							<Button
								isDisabled={busy}
								onPress={() => void run('overwrite')}
								type='button'
								variant='secondary'
							>
								覆盖当前
							</Button>
						) : null}
						<Button
							isDisabled={busy || name.trim().length === 0}
							isPending={busy}
							onPress={() => void run('create')}
							type='button'
						>
							另存为
						</Button>
					</Modal.Footer>
				</Modal.Dialog>
			</Modal.Container>
		</Modal.Backdrop>
	)
}

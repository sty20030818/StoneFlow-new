'use client'

/**
 * 筛选公式条：chip（field 固定 / op·值可改）+ Clear（仅 dirty）+ Save。
 */
import { useState } from 'react'
import { Button, ButtonGroup, Dropdown, Surface, type Selection } from '@heroui/react'
import { PlusIcon, XIcon } from 'lucide-react'

import { COMMAND_IDS, CommandActionTooltip } from '@/features/command'
import { ActionTooltip } from '@/shared/components/tooltip'
import { cn } from '@/shared/lib/utils'

import {
	createFilterClause,
	normalizeFilterQuery,
	type FilterClause,
	type FilterField,
	type FilterOp,
	type FilterQuery,
} from '../core'
import { useListFilterUi } from '../model/ListFilterUiContext'
import { FilterMenu } from './FilterMenu'
import { FilterValueOption } from './FilterValueOption'
import {
	formatClauseValuesSummary,
	formatFilterFieldLabel,
	formatFilterOpLabel,
	formatFilterValueLabel,
} from './filterLabels'
import { getFilterFieldLeading, getFilterValueOptions } from './filterOptionCatalog'

export function FilterBar({ className }: { className?: string }) {
	const { session, projects, onSave } = useListFilterUi()
	const [filterMenuOpen, setFilterMenuOpen] = useState(false)
	const [filterTooltipOpen, setFilterTooltipOpen] = useState(false)

	const { effective, dirty, clearTemp, replaceEffective } = session

	// Default / Saved View 是基线，不在工具条重复展示；只呈现真实 Filter Draft。
	if (!dirty) {
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
			<Surface
				className='flex flex-wrap items-center gap-2 p-2'
				data-filter-bar='true'
				variant='secondary'
			>
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
					<Button onPress={() => clearTemp()} size='sm' type='button' variant='ghost'>
						恢复
					</Button>
					{onSave ? (
						<Button onPress={onSave} size='sm' type='button' variant='outline'>
							保存
						</Button>
					) : null}
				</div>
			</Surface>
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
		<ButtonGroup
			aria-label={`${formatFilterFieldLabel(clause.field)}筛选条件`}
			className='max-w-full'
			data-filter-clause='true'
			size='sm'
			variant='ghost'
		>
			<FilterFieldLabel field={clause.field} />
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
					<ButtonGroup.Separator />
					<XIcon className='size-3' />
				</Button>
			</ActionTooltip>
		</ButtonGroup>
	)
}

/** 字段名只读，不伪装成禁用按钮，也不进入 Tab 顺序。 */
function FilterFieldLabel({ field }: { field: FilterField }) {
	return (
		<span className='flex shrink-0 items-center gap-1.5 self-stretch px-2 text-[13px]'>
			<span className='flex size-4 shrink-0 items-center justify-center' aria-hidden>
				{getFilterFieldLeading(field)}
			</span>
			{formatFilterFieldLabel(field)}
		</span>
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
				<ButtonGroup.Separator />
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
	const fullSummary = clause.values
		.map((value) => formatFilterValueLabel(clause.field, value, projects))
		.join('、')
	const leadingOptions = options
		.filter((option) => clause.values.includes(option.value) && option.leading)
		.slice(0, 3)

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
				className='max-w-35 min-w-0 shrink'
				size='sm'
				type='button'
				variant='ghost'
			>
				<ButtonGroup.Separator />
				{leadingOptions.length > 0 ? (
					<span className='isolate flex shrink-0 -space-x-1.5' aria-hidden>
						{leadingOptions.map((option) => (
							<span
								className='relative flex size-4 shrink-0 items-center justify-center'
								key={option.value}
							>
								{option.leading}
							</span>
						))}
					</span>
				) : null}
				<span className='min-w-0 truncate' title={fullSummary}>
					{summary}
				</span>
			</Button>
			<Dropdown.Popover className='w-64' placement='bottom start'>
				<Dropdown.Menu
					aria-label='筛选值'
					disallowEmptySelection
					selectedKeys={clause.values}
					selectionMode='multiple'
					shouldCloseOnSelect={false}
					onSelectionChange={handleSelectionChange}
				>
					{options.map((option) => (
						<FilterValueOption
							count={option.count}
							key={option.value}
							label={option.label}
							leading={option.leading}
							value={option.value}
						/>
					))}
				</Dropdown.Menu>
			</Dropdown.Popover>
		</Dropdown>
	)
}

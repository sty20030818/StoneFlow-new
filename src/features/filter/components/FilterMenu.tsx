'use client'

/**
 * Linear 式筛选菜单：一级字段列表 + 侧向 Sub 二级值列表。
 * 勾选即写入 FilterQuery；无 drill-in、无「应用」按钮。
 */
import { cloneElement, useLayoutEffect, useRef, useState, type ReactElement } from 'react'

import { Dropdown, SearchField } from '@heroui/react'

import { COMMAND_IDS, CommandShortcut } from '@/features/command'
import { TASK_VIEW_BASE_LABELS } from '@/features/task/presentation'
import {
	createFilterClause,
	normalizeFilterQuery,
	type FilterClause,
	type FilterField,
} from '../core'
import { useListFilterUi, type FilterQueryBoundary } from '../model/ListFilterUiContext'
import {
	FILTER_MENU_FIELDS,
	formatFilterFieldLabel,
	formatFilterOpLabel,
	formatFilterValueLabel,
} from './filterLabels'
import { FilterClauseEditor } from './FilterClauseEditor'
import { getFilterFieldLeading } from './filterOptionCatalog'
import { FilterValueSubMenu } from './FilterValueSubMenu'

type FilterMenuProps = {
	trigger: ReactElement<Record<string, unknown>>
	open: boolean
	onOpenChange: (open: boolean) => void
}

export function FilterMenu({ trigger, open, onOpenChange }: FilterMenuProps) {
	const { session, projects, boundary } = useListFilterUi()
	const [query, setQuery] = useState('')
	const firstFieldRef = useRef<HTMLDivElement>(null)
	const searchRef = useRef<HTMLInputElement>(null)
	const focusAfterRemoval = useRef<string | null>(null)
	useLayoutEffect(() => {
		if (
			focusAfterRemoval.current &&
			!session.effective.clauses.some((clause) => clause.id === focusAfterRemoval.current)
		) {
			searchRef.current?.focus()
			focusAfterRemoval.current = null
		}
	}, [session.effective])
	const [addedClauseIds, setAddedClauseIds] = useState<Partial<Record<FilterField, string>>>({})
	const normalizedQuery = query.trim().toLowerCase()
	const visibleFields = FILTER_MENU_FIELDS.filter(
		(field) => projects || field !== 'project',
	).filter((field) =>
		normalizedQuery.length === 0
			? true
			: formatFilterFieldLabel(field).toLowerCase().includes(normalizedQuery),
	)

	function handleOpenChange(next: boolean) {
		onOpenChange(next)
		if (!next) {
			setQuery('')
			setAddedClauseIds({})
		}
	}

	function addedClause(field: FilterField) {
		return session.effective.clauses.find((clause) => clause.id === addedClauseIds[field])
	}

	function toggleValue(field: FilterField, value: string) {
		const existing = addedClause(field)
		if (existing) {
			const values = existing.values.includes(value)
				? existing.values.filter((item) => item !== value)
				: [...existing.values, value]
			// 最后一个值只能通过明确的删除条件动作移除。
			if (values.length > 0) updateClause({ ...existing, values })
			return
		}
		const identical = session.effective.clauses.find(
			(clause) =>
				clause.field === field &&
				clause.op === 'is' &&
				clause.values.length === 1 &&
				clause.values[0] === value,
		)
		// 等价添加是 no-op；不能把后续勾选绑定到原条件而扩大它。
		if (identical) return
		const clause = createFilterClause(field, 'is', [value])
		setAddedClauseIds((current) => ({ ...current, [field]: clause.id }))
		session.replaceEffective(
			normalizeFilterQuery({ clauses: [...session.effective.clauses, clause] }),
		)
	}

	function updateClause(nextClause: FilterClause) {
		const next = normalizeFilterQuery({
			clauses: session.effective.clauses.map((clause) =>
				clause.id === nextClause.id ? nextClause : clause,
			),
		})
		if (!next.clauses.some((clause) => clause.id === nextClause.id))
			focusAfterRemoval.current = nextClause.id
		session.replaceEffective(next)
	}

	function removeClause(id: string) {
		searchRef.current?.focus()
		session.replaceEffective(
			normalizeFilterQuery({
				clauses: session.effective.clauses.filter((clause) => clause.id !== id),
			}),
		)
	}

	return (
		<Dropdown isOpen={open} onOpenChange={handleOpenChange}>
			<Dropdown.Trigger
				render={({ children: _children, ...props }) =>
					cloneElement(trigger, props as Record<string, unknown>)
				}
			/>
			<Dropdown.Popover
				className='w-80 max-w-[calc(100vw-24px)] overflow-y-auto'
				offset={6}
				placement='bottom end'
			>
				<div className='grid gap-3 border-b border-separator p-3'>
					{boundary ? (
						<QueryBoundary boundary={boundary} />
					) : (
						<p className='text-xs text-muted'>正在读取查询边界…</p>
					)}
					<section aria-label='当前筛选条件' className='grid gap-2'>
						<p className='text-xs text-muted'>以下条件同时满足</p>
						{session.effective.clauses.length === 0 ? (
							<p className='text-sm'>无附加筛选条件</p>
						) : (
							session.effective.clauses.map((clause) => (
								<div className='grid min-w-0 gap-1' key={clause.id}>
									<p className='wrap-anywhere text-xs text-muted'>
										{formatFilterFieldLabel(clause.field)}{' '}
										{formatFilterOpLabel(clause.op, clause.values.length > 1)}{' '}
										{clause.values
											.map((value) => formatFilterValueLabel(clause.field, value, projects))
											.join('、')}
									</p>
									<FilterClauseEditor
										clause={clause}
										onRemove={() => removeClause(clause.id)}
										onUpdate={updateClause}
										projects={projects}
									/>
								</div>
							))
						)}
					</section>
				</div>
				<div className='border-b border-separator px-2 py-1.5'>
					<SearchField
						aria-label='筛选字段'
						fullWidth
						onChange={setQuery}
						value={query}
						variant='secondary'
					>
						<SearchField.Group data-field-role='filter-search'>
							<SearchField.Input
								ref={searchRef}
								onKeyDown={(event) => {
									if (event.key === 'ArrowDown') {
										event.preventDefault()
										firstFieldRef.current?.focus()
									}
									if (event.key !== 'Escape' && event.key !== 'Tab') event.stopPropagation()
								}}
								placeholder='添加筛选…'
							/>
							<SearchField.ClearButton aria-label='清空筛选字段搜索' />
							<CommandShortcut className='mr-2 shrink-0' commandId={COMMAND_IDS.filterAdd} />
						</SearchField.Group>
					</SearchField>
				</div>

				<Dropdown.Menu aria-label='筛选字段'>
					{visibleFields.map((field) => (
						<Dropdown.SubmenuTrigger key={field}>
							<Dropdown.Item
								ref={field === visibleFields[0] ? firstFieldRef : undefined}
								id={field}
								textValue={formatFilterFieldLabel(field)}
							>
								<span className='flex size-4 shrink-0 items-center justify-center' aria-hidden>
									{getFilterFieldLeading(field)}
								</span>
								<span className='flex-1'>{formatFilterFieldLabel(field)}</span>
								<Dropdown.SubmenuIndicator />
							</Dropdown.Item>
							<Dropdown.Popover className='w-64 overflow-hidden' placement='right top'>
								<FilterValueSubMenu
									field={field}
									isChecked={(value) => addedClause(field)?.values.includes(value) ?? false}
									onClose={() => handleOpenChange(false)}
									onToggle={(value) => toggleValue(field, value)}
									projects={projects}
								/>
							</Dropdown.Popover>
						</Dropdown.SubmenuTrigger>
					))}
					{visibleFields.length === 0 ? (
						<Dropdown.Item id='empty' isDisabled textValue='无匹配字段'>
							无匹配字段
						</Dropdown.Item>
					) : null}
				</Dropdown.Menu>
			</Dropdown.Popover>
		</Dropdown>
	)
}

function QueryBoundary({ boundary }: { boundary: FilterQueryBoundary }) {
	const scope =
		boundary.scope.type === 'all' ? '所有空间' : (boundary.spaceName ?? boundary.scope.spaceId)
	const context =
		boundary.context.kind === 'all'
			? '全部任务'
			: boundary.context.kind === 'standalone'
				? '独立事项'
				: (boundary.projectName ?? boundary.context.projectId)
	return (
		<section aria-label='固定查询边界' className='grid gap-1'>
			<p className='text-xs text-muted'>固定条件</p>
			<dl className='grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-xs'>
				<dt className='text-muted'>范围</dt>
				<dd className='wrap-anywhere'>{scope}</dd>
				<dt className='text-muted'>任务归属</dt>
				<dd className='wrap-anywhere'>{context}</dd>
				<dt className='text-muted'>默认视图</dt>
				<dd>{TASK_VIEW_BASE_LABELS[boundary.baseViewKey]}</dd>
			</dl>
		</section>
	)
}

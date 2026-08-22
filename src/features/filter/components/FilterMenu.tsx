'use client'

/**
 * Linear 式筛选菜单：一级字段列表 + 侧向 Sub 二级值列表。
 * 勾选即写入 FilterQuery；无 drill-in、无「应用」按钮。
 */
import { cloneElement, useState, type ReactElement } from 'react'

import { Dropdown, SearchField } from '@heroui/react'

import { COMMAND_IDS, CommandShortcut } from '@/features/command'
import { setFilterFieldClause, type FilterField, type FilterQuery } from '../core'
import { useListFilterUi } from '../model/ListFilterUiContext'
import { FILTER_MENU_FIELDS, formatFilterFieldLabel } from './filterLabels'
import { getFilterFieldLeading } from './filterOptionCatalog'
import { FilterValueSubMenu } from './FilterValueSubMenu'

type FilterMenuProps = {
	trigger: ReactElement<Record<string, unknown>>
	open: boolean
	onOpenChange: (open: boolean) => void
}

export function FilterMenu({ trigger, open, onOpenChange }: FilterMenuProps) {
	const { session, projects } = useListFilterUi()
	const [query, setQuery] = useState('')
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
		<Dropdown isOpen={open} onOpenChange={handleOpenChange}>
			<Dropdown.Trigger
				render={({ children: _children, ...props }) =>
					cloneElement(trigger, props as Record<string, unknown>)
				}
			/>
			<Dropdown.Popover className='w-60 min-w-60' offset={6} placement='bottom end'>
				<div className='border-b border-separator p-2'>
					<SearchField
						aria-label='筛选字段'
						fullWidth
						onChange={setQuery}
						value={query}
						variant='secondary'
					>
						<SearchField.Group>
							<SearchField.SearchIcon />
							<SearchField.Input
								onKeyDown={(event) => {
									if (event.key !== 'Escape') event.stopPropagation()
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
							<Dropdown.Item id={field} textValue={formatFilterFieldLabel(field)}>
								<span className='flex size-4 shrink-0 items-center justify-center' aria-hidden>
									{getFilterFieldLeading(field)}
								</span>
								<span className='flex-1'>{formatFilterFieldLabel(field)}</span>
								<Dropdown.SubmenuIndicator />
							</Dropdown.Item>
							<Dropdown.Popover className='w-56 overflow-hidden' placement='right top'>
								<FilterValueSubMenu
									field={field}
									isChecked={(value) => isChecked(field, value)}
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

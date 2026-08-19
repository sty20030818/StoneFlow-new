import { useMemo, useState } from 'react'

import { Dropdown, SearchField } from '@heroui/react'

import type { FilterField } from '../core'
import { formatFilterFieldLabel } from './filterLabels'
import { getFilterValueOptions } from './filterOptionCatalog'
import { FilterValueOption } from './FilterValueOption'

type FilterValueSubMenuProps = {
	field: FilterField
	isChecked: (value: string) => boolean
	onToggle: (value: string) => void
	projects?: Array<{ id: string; name: string }>
}

/** 筛选值二级菜单：负责目录过滤与把用户选择上抛，不接触 session。 */
export function FilterValueSubMenu({
	field,
	isChecked,
	onToggle,
	projects,
}: FilterValueSubMenuProps) {
	const [query, setQuery] = useState('')
	const options = useMemo(() => getFilterValueOptions(field, projects), [field, projects])
	const visibleOptions = useMemo(() => {
		const normalizedQuery = query.trim().toLowerCase()
		return normalizedQuery.length === 0
			? options
			: options.filter((option) => option.label.toLowerCase().includes(normalizedQuery))
	}, [options, query])

	return (
		<>
			<SearchField
				aria-label={`${formatFilterFieldLabel(field)} 筛选`}
				className='shrink-0 border-b border-separator p-2'
				fullWidth
				onChange={setQuery}
				value={query}
				variant='secondary'
			>
				<SearchField.Group className='h-8 shadow-none'>
					<SearchField.SearchIcon />
					<SearchField.Input
						onKeyDown={(event) => {
							if (event.key !== 'Escape') event.stopPropagation()
						}}
						placeholder='筛选…'
					/>
					<SearchField.ClearButton aria-label='清空筛选值搜索' />
				</SearchField.Group>
			</SearchField>
			<Dropdown.Menu
				aria-label={`${formatFilterFieldLabel(field)} 筛选值`}
				className='max-h-60 overflow-y-auto p-1'
				selectedKeys={options
					.filter((option) => isChecked(option.value))
					.map((option) => option.value)}
				selectionMode='multiple'
				shouldCloseOnSelect={false}
			>
				{visibleOptions.map((option) => (
					<FilterValueOption
						count={option.count}
						key={option.value}
						label={option.label}
						leading={option.leading}
						onToggle={() => onToggle(option.value)}
						value={option.value}
					/>
				))}
				{visibleOptions.length === 0 ? (
					<Dropdown.Item id='empty' isDisabled textValue='无匹配项'>
						无匹配项
					</Dropdown.Item>
				) : null}
			</Dropdown.Menu>
		</>
	)
}

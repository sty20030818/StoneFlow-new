import { useMemo, useRef, useState } from 'react'

import { Dropdown, SearchField } from '@heroui/react'

import type { FilterField } from '../core'
import { formatFilterFieldLabel } from './filterLabels'
import { getFilterValueOptions } from './filterOptionCatalog'
import { FilterValueOption } from './FilterValueOption'

type FilterValueSubMenuProps = {
	field: FilterField
	isChecked: (value: string) => boolean
	onClose: () => void
	onToggle: (value: string) => void
	projects?: Array<{ id: string; name: string }>
}

/** 筛选值二级菜单：负责目录过滤与把用户选择上抛，不接触 session。 */
export function FilterValueSubMenu({
	field,
	isChecked,
	onClose,
	onToggle,
	projects,
}: FilterValueSubMenuProps) {
	const [query, setQuery] = useState('')
	const firstOptionRef = useRef<HTMLDivElement>(null)
	const options = useMemo(() => getFilterValueOptions(field, projects), [field, projects])
	const visibleOptions = useMemo(() => {
		const normalizedQuery = query.trim().toLowerCase()
		return normalizedQuery.length === 0
			? options
			: options.filter((option) => option.label.toLowerCase().includes(normalizedQuery))
	}, [options, query])

	return (
		<>
			<div className='shrink-0 border-b border-separator px-2 py-1.5'>
				<SearchField
					aria-label={`${formatFilterFieldLabel(field)} 筛选`}
					fullWidth
					onChange={setQuery}
					value={query}
					variant='secondary'
				>
					<SearchField.Group data-field-role='filter-search'>
						<SearchField.Input
							onKeyDown={(event) => {
								if (event.key === 'ArrowDown') {
									event.preventDefault()
									firstOptionRef.current?.focus()
								}
								if (event.key !== 'Escape' && event.key !== 'Tab') event.stopPropagation()
							}}
							placeholder='筛选…'
						/>
						<SearchField.ClearButton aria-label='清空筛选值搜索' />
					</SearchField.Group>
				</SearchField>
			</div>
			<Dropdown.Menu
				disallowEmptySelection
				aria-label={`${formatFilterFieldLabel(field)} 筛选值`}
				className='max-h-60 overflow-y-auto'
				selectedKeys={options
					.filter((option) => isChecked(option.value))
					.map((option) => option.value)}
				selectionMode='multiple'
				shouldCloseOnSelect={false}
			>
				{visibleOptions.map((option) => (
					<FilterValueOption
						ref={option === visibleOptions[0] ? firstOptionRef : undefined}
						count={option.count}
						key={option.value}
						label={option.label}
						leading={option.leading}
						onClose={onClose}
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

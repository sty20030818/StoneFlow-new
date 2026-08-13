import { useMemo, useState } from 'react'

import { Input } from '@/shared/components/base/input'

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
		<div className='flex max-h-72 flex-col'>
			<div className='shrink-0 border-b border-legacy-border px-2 py-1.5'>
				<Input
					aria-label={`${formatFilterFieldLabel(field)} 筛选`}
					className='h-7 border-0 bg-transparent px-1 shadow-none focus-visible:ring-0'
					onChange={(event) => setQuery(event.target.value)}
					onKeyDown={(event) => event.stopPropagation()}
					placeholder='筛选…'
					value={query}
				/>
			</div>
			<div className='min-h-0 overflow-y-auto p-1'>
				{visibleOptions.map((option) => (
					<FilterValueOption
						checked={isChecked(option.value)}
						count={option.count}
						key={option.value}
						label={option.label}
						leading={option.leading}
						onToggle={() => onToggle(option.value)}
					/>
				))}
				{visibleOptions.length === 0 ? (
					<p className='px-2 py-2 text-[13px] text-sf-text-tertiary' role='status'>
						无匹配项
					</p>
				) : null}
			</div>
		</div>
	)
}

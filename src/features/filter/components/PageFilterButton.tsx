/**
 * 工具条「筛选」入口：有 ListFilterUi 时打开锚定 FilterMenu；否则回落 Command（兼容）。
 */
import { useState } from 'react'
import { ListFilterIcon } from 'lucide-react'

import { useDialogStore } from '@/features/shell-dialogs'
import { Button } from '@/shared/components/base/button'

import { useListFilterUi } from '../model/ListFilterUiContext'
import { usePageFilterContext } from '../model/PageFilterProvider'
import { FilterMenu } from './FilterMenu'

type PageFilterButtonProps = {
	className?: string
}

export function PageFilterButton({ className }: PageFilterButtonProps) {
	const filterUi = useListFilterUi()
	const pageFilter = usePageFilterContext()
	const openCommand = useDialogStore((state) => state.openCommand)
	const [menuOpen, setMenuOpen] = useState(false)

	const hasActive = filterUi
		? !filterUi.session.isEmpty || filterUi.session.dirty
		: pageFilter.state.hasActiveFilters

	const trigger = (
		<Button
			aria-label={hasActive ? '筛选（已启用）' : '筛选'}
			className={className}
			data-active={hasActive ? 'true' : undefined}
			onClick={
				filterUi
					? undefined
					: () => {
							pageFilter.actions.openFilterPicker('root')
							openCommand('filter-picker', null, 'root')
						}
			}
			size='icon-sm'
			type='button'
			variant='outline'
		>
			<ListFilterIcon />
		</Button>
	)

	if (!filterUi) {
		return trigger
	}

	return (
		<FilterMenu onOpenChange={setMenuOpen} open={menuOpen} trigger={trigger} />
	)
}

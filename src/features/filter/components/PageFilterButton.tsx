/**
 * 工具条「筛选」入口：锚定 FilterMenu；订阅 F / 命令 open-menu 事件。
 * 无 ListFilterUi 时仅广播事件（无全页 Command picker）。
 */
import { useEffect, useState } from 'react'
import { ListFilterIcon } from 'lucide-react'

import { Button } from '@/shared/components/base/button'

import type { FilterField } from '../core'
import { subscribeFilterUiEvent } from '../model/filterUiEvents'
import { useListFilterUi } from '../model/ListFilterUiContext'
import { usePageFilterContext } from '../model/PageFilterProvider'
import { FilterMenu } from './FilterMenu'

type PageFilterButtonProps = {
	className?: string
}

export function PageFilterButton({ className }: PageFilterButtonProps) {
	const filterUi = useListFilterUi()
	const pageFilter = usePageFilterContext()
	const [menuOpen, setMenuOpen] = useState(false)
	const [initialField, setInitialField] = useState<FilterField | null>(null)

	useEffect(() => {
		return subscribeFilterUiEvent((event) => {
			if (event.type === 'open-menu') {
				setInitialField(event.field ?? null)
				setMenuOpen(true)
				return
			}
			if (event.type === 'clear-all') {
				filterUi?.session.clearTemp()
				pageFilter.actions.clearAll()
			}
		})
	}, [filterUi, pageFilter.actions])

	const hasActive = filterUi
		? !filterUi.session.isEmpty || filterUi.session.dirty
		: pageFilter.state.hasActiveFilters

	const trigger = (
		<Button
			aria-label={hasActive ? '筛选（已启用）' : '筛选'}
			className={className}
			data-active={hasActive ? 'true' : undefined}
			size='icon-sm'
			type='button'
			variant='outline'
		>
			<ListFilterIcon />
		</Button>
	)

	if (!filterUi) {
		// 无列表会话：仍渲染按钮，点击发 open-menu（无订阅则无 UI）
		return (
			<Button
				aria-label={hasActive ? '筛选（已启用）' : '筛选'}
				className={className}
				data-active={hasActive ? 'true' : undefined}
				onClick={() => {
					pageFilter.actions.openFilterPicker('root')
					// 不再 openCommand('filter-picker')
				}}
				size='icon-sm'
				type='button'
				variant='outline'
			>
				<ListFilterIcon />
			</Button>
		)
	}

	return (
		<FilterMenu
			initialField={initialField}
			onOpenChange={(open) => {
				setMenuOpen(open)
				if (!open) {
					setInitialField(null)
				}
			}}
			open={menuOpen}
			trigger={trigger}
		/>
	)
}

/**
 * 工具条「筛选」入口：锚定 FilterMenu；订阅 F / 命令 open-menu。
 * 必须位于 ListFilterUiProvider 内。
 */
import { useEffect, useState } from 'react'
import { Button } from '@heroui/react'
import { ListFilterIcon } from 'lucide-react'

import { COMMAND_IDS, CommandActionTooltip } from '@/features/command'

import { subscribeFilterUiEvent } from '../model/filterUiEvents'
import { useListFilterUi } from '../model/ListFilterUiContext'
import { usePageFilterContext } from '../model/PageFilterProvider'
import { FilterMenu } from './FilterMenu'

type PageFilterButtonProps = {
	className?: string
}

export function PageFilterButton({ className }: PageFilterButtonProps) {
	const { session } = useListFilterUi()
	const pageFilter = usePageFilterContext()
	const [menuOpen, setMenuOpen] = useState(false)
	const [tooltipOpen, setTooltipOpen] = useState(false)

	useEffect(() => {
		return subscribeFilterUiEvent((event) => {
			if (event.type === 'open-menu') {
				setTooltipOpen(false)
				setMenuOpen(true)
				return
			}
			if (event.type === 'clear-all') {
				session.clearTemp()
				pageFilter.actions.clearAll()
			}
		})
	}, [pageFilter.actions, session])

	const label = '筛选'

	const trigger = (
		<CommandActionTooltip
			commandId={COMMAND_IDS.filterAdd}
			label={label}
			onOpenChange={(nextOpen) => setTooltipOpen(menuOpen ? false : nextOpen)}
			isOpen={tooltipOpen}
		>
			<Button
				aria-label={label}
				className={className}
				isIconOnly
				size='sm'
				type='button'
				variant='outline'
			>
				<ListFilterIcon className='size-4' />
			</Button>
		</CommandActionTooltip>
	)

	return (
		<FilterMenu
			onOpenChange={(nextOpen) => {
				setMenuOpen(nextOpen)
				if (nextOpen) {
					setTooltipOpen(false)
				}
			}}
			open={menuOpen}
			trigger={trigger}
		/>
	)
}

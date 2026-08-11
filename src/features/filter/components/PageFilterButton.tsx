/**
 * 工具条「筛选」入口：锚定 FilterMenu；订阅 F / 命令 open-menu。
 * 无 ListFilterUi 时仅按钮占位。
 */
import { useEffect, useState } from 'react'
import { ListFilterIcon } from 'lucide-react'

import { COMMAND_IDS, CommandActionTooltip } from '@/features/command'
import { Button } from '@/shared/components/base/button'

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
	const [tooltipOpen, setTooltipOpen] = useState(false)

	useEffect(() => {
		return subscribeFilterUiEvent((event) => {
			if (event.type === 'open-menu') {
				setTooltipOpen(false)
				setMenuOpen(true)
				return
			}
			if (event.type === 'clear-all') {
				filterUi?.session.clearTemp()
				pageFilter.actions.clearAll()
			}
		})
	}, [filterUi, pageFilter.actions])

	const label = '筛选'

	const trigger = (
		<CommandActionTooltip
			commandId={COMMAND_IDS.filterAdd}
			label={label}
			onOpenChange={(nextOpen) => setTooltipOpen(menuOpen ? false : nextOpen)}
			open={tooltipOpen}
		>
			<Button
				aria-label={label}
				className={className}
				size='icon-sm'
				type='button'
				variant='outline'
			>
				<ListFilterIcon />
			</Button>
		</CommandActionTooltip>
	)

	if (!filterUi) {
		return (
			<CommandActionTooltip
				commandId={COMMAND_IDS.filterAdd}
				label={label}
				onOpenChange={setTooltipOpen}
				open={tooltipOpen}
			>
				<Button
					aria-label={label}
					className={className}
					onClick={() => {
						setTooltipOpen(false)
						pageFilter.actions.openFilterMenu()
					}}
					size='icon-sm'
					type='button'
					variant='outline'
				>
					<ListFilterIcon />
				</Button>
			</CommandActionTooltip>
		)
	}

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

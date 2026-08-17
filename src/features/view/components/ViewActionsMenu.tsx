import { useState } from 'react'
import { EllipsisIcon, PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react'

import { Button } from '@/shared/components/base/button'
import { ActionTooltip } from '@/shared/components/tooltip'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/shared/components/base/dropdown-menu'
import type { View } from '@/shared/types'

type ViewActionsMenuProps = {
	activeView: View | null
	onCreate: () => void
	onEdit: (view: View) => void
	onDelete: (view: View) => void
}

export function ViewActionsMenu({ activeView, onCreate, onEdit, onDelete }: ViewActionsMenuProps) {
	const canMutateActiveView = activeView?.kind === 'custom'
	const [menuOpen, setMenuOpen] = useState(false)
	const [tooltipOpen, setTooltipOpen] = useState(false)

	function handleMenuOpenChange(nextOpen: boolean) {
		setMenuOpen(nextOpen)
		if (nextOpen) {
			setTooltipOpen(false)
		}
	}

	return (
		<DropdownMenu onOpenChange={handleMenuOpenChange} open={menuOpen}>
			<ActionTooltip
				isOpen={tooltipOpen}
				label='视图操作'
				onOpenChange={(nextOpen) => setTooltipOpen(menuOpen ? false : nextOpen)}
			>
				<DropdownMenuTrigger asChild>
					<Button aria-label='视图操作' size='icon-sm' type='button' variant='outline'>
						<EllipsisIcon />
					</Button>
				</DropdownMenuTrigger>
			</ActionTooltip>
			<DropdownMenuContent align='end'>
				<DropdownMenuGroup>
					<DropdownMenuItem
						onSelect={(event) => {
							event.preventDefault()
							onCreate()
						}}
					>
						<PlusIcon />
						新建自定义视图
					</DropdownMenuItem>
					{canMutateActiveView ? (
						<DropdownMenuItem
							onSelect={(event) => {
								event.preventDefault()
								onEdit(activeView)
							}}
						>
							<PencilIcon />
							编辑当前视图
						</DropdownMenuItem>
					) : null}
				</DropdownMenuGroup>
				{canMutateActiveView ? (
					<>
						<DropdownMenuSeparator />
						<DropdownMenuItem
							onSelect={(event) => {
								event.preventDefault()
								onDelete(activeView)
							}}
							variant='destructive'
						>
							<Trash2Icon />
							删除当前视图
						</DropdownMenuItem>
					</>
				) : null}
			</DropdownMenuContent>
		</DropdownMenu>
	)
}

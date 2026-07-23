import { EllipsisIcon, PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react'

import { Button } from '@/shared/components/base/button'
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

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button aria-label='视图操作' size='icon-sm' type='button' variant='outline'>
					<EllipsisIcon />
				</Button>
			</DropdownMenuTrigger>
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

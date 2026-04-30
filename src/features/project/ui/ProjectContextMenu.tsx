import type { ReactNode } from 'react'

import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuGroup,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuTrigger,
} from '@/shared/ui/base/context-menu'
import { ExternalLinkIcon, Trash2Icon } from 'lucide-react'

type ProjectContextMenuProps = {
	children: ReactNode
	isBusy?: boolean
	onOpenProject: () => void
	onMoveToTrash: () => void
}

/**
 * Project 在 sidebar 与主内容区共用同一组管理动作。
 */
export function ProjectContextMenu({
	children,
	isBusy,
	onOpenProject,
	onMoveToTrash,
}: ProjectContextMenuProps) {
	return (
		<ContextMenu>
			<ContextMenuTrigger asChild onContextMenu={(event) => event.stopPropagation()}>
				{children}
			</ContextMenuTrigger>
			<ContextMenuContent className='w-44'>
				<ContextMenuGroup>
					<ContextMenuItem onSelect={onOpenProject}>
						<ExternalLinkIcon />
						打开项目
					</ContextMenuItem>
				</ContextMenuGroup>
				<ContextMenuSeparator />
				<ContextMenuGroup>
					<ContextMenuItem disabled={isBusy} onSelect={onMoveToTrash} variant='destructive'>
						<Trash2Icon />
						移入回收站
					</ContextMenuItem>
				</ContextMenuGroup>
			</ContextMenuContent>
		</ContextMenu>
	)
}

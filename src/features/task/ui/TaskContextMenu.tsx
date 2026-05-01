import type { TaskStatus } from '@/shared/types'
import type { ReactNode } from 'react'

import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuGroup,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuTrigger,
} from '@/shared/ui/base/context-menu'
import {
	ArchiveIcon,
	CheckCircle2Icon,
	ExternalLinkIcon,
	PinIcon,
	RotateCcwIcon,
	Trash2Icon,
} from 'lucide-react'

type TaskContextMenuProps = {
	children: ReactNode
	status?: TaskStatus | string
	isPinned?: boolean
	isBusy?: boolean
	onOpenDetails: () => void
	onTogglePin?: () => void
	onToggleStatus?: () => void
	onMoveToTrash?: () => void
	onArchive?: () => void
	moveToTrashLabel?: string
	archiveActionLabel?: string
}

/**
 * 任务实体右键菜单只接收当前场景可用动作，避免在页面里重复拼菜单项。
 */
export function TaskContextMenu({
	children,
	status,
	isPinned,
	isBusy,
	onOpenDetails,
	onTogglePin,
	onToggleStatus,
	onMoveToTrash,
	onArchive,
	moveToTrashLabel = '移入回收站',
	archiveActionLabel = '归档任务',
}: TaskContextMenuProps) {
	const canToggleStatus = !!onToggleStatus
	const canTogglePin = !!onTogglePin
	const canMoveToTrash = !!onMoveToTrash
	const canArchive = !!onArchive

	return (
		<ContextMenu>
			<ContextMenuTrigger asChild onContextMenu={(event) => event.stopPropagation()}>
				{children}
			</ContextMenuTrigger>
			<ContextMenuContent className='w-44'>
				<ContextMenuGroup>
					<ContextMenuItem onSelect={onOpenDetails}>
						<ExternalLinkIcon />
						编辑详情
					</ContextMenuItem>
					{canTogglePin ? (
						<ContextMenuItem disabled={isBusy} onSelect={onTogglePin}>
							<PinIcon />
							{isPinned ? '取消 Pin' : 'Pin 到 Focus'}
						</ContextMenuItem>
					) : null}
					{canToggleStatus ? (
						<ContextMenuItem disabled={isBusy} onSelect={onToggleStatus}>
							{status === 'done' || status === 'canceled' ? (
								<RotateCcwIcon />
							) : (
								<CheckCircle2Icon />
							)}
							{status === 'done' || status === 'canceled' ? '恢复待执行' : '标记完成'}
						</ContextMenuItem>
					) : null}
				</ContextMenuGroup>
				{canMoveToTrash || canArchive ? (
					<>
						<ContextMenuSeparator />
						<ContextMenuGroup>
							{canArchive ? (
								<ContextMenuItem disabled={isBusy} onSelect={onArchive} variant='destructive'>
									<ArchiveIcon />
									{archiveActionLabel}
								</ContextMenuItem>
							) : null}
							{canMoveToTrash ? (
								<ContextMenuItem disabled={isBusy} onSelect={onMoveToTrash} variant='destructive'>
									<Trash2Icon />
									{moveToTrashLabel}
								</ContextMenuItem>
							) : null}
						</ContextMenuGroup>
					</>
				) : null}
			</ContextMenuContent>
		</ContextMenu>
	)
}

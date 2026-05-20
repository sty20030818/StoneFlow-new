import type { ReactNode } from 'react'

import { useDangerConfirm } from '@/features/danger-confirm'
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuGroup,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuTrigger,
} from '@/shared/ui/base/context-menu'
import {
	ArchiveRestoreIcon,
	FolderOpenIcon,
	Trash2Icon,
} from 'lucide-react'

type LifecycleContextMenuProps = {
	children: ReactNode
	entityType: 'task' | 'project' | 'space'
	entityLabel: string
	targetCount: number
	isBusy?: boolean
	onOpenDetail?: () => void
	onRestore: () => void
	onMoveToTrash?: () => void
	onPermanentlyDelete?: () => void
}

export function LifecycleContextMenu({
	children,
	entityType,
	entityLabel,
	targetCount,
	isBusy,
	onOpenDetail,
	onRestore,
	onMoveToTrash,
	onPermanentlyDelete,
}: LifecycleContextMenuProps) {
	const { requestDangerConfirm } = useDangerConfirm()
	const isBulk = targetCount > 1

	return (
		<ContextMenu>
			<ContextMenuTrigger asChild onContextMenu={(event) => event.stopPropagation()}>
				{children}
			</ContextMenuTrigger>
			<ContextMenuContent className='w-48'>
				{onOpenDetail ? (
					<>
						<ContextMenuGroup>
							<ContextMenuItem disabled={isBusy} onSelect={onOpenDetail}>
								<FolderOpenIcon />
								{getOpenLabel(entityType)}
							</ContextMenuItem>
						</ContextMenuGroup>
						<ContextMenuSeparator />
					</>
				) : null}
				<ContextMenuGroup>
					<ContextMenuItem disabled={isBusy} onSelect={onRestore}>
						<ArchiveRestoreIcon />
						{isBulk ? '全部恢复' : '恢复'}
					</ContextMenuItem>
					{onMoveToTrash ? (
						<ContextMenuItem
							disabled={isBusy}
							onSelect={async () => {
								const confirmed = await requestDangerConfirm({
									intent: 'trash',
									entityType,
									count: targetCount,
									entityLabel: isBulk ? undefined : entityLabel,
								})
								if (!confirmed) {
									return
								}
								onMoveToTrash()
							}}
							variant='destructive'
						>
							<Trash2Icon />
							{isBulk ? '全部移入回收站' : '移入回收站'}
						</ContextMenuItem>
					) : null}
					{onPermanentlyDelete ? (
						<ContextMenuItem
							disabled={isBusy}
							onSelect={async () => {
								const confirmed = await requestDangerConfirm({
									intent: 'permanent-delete',
									entityType,
									count: targetCount,
									entityLabel: isBulk ? undefined : entityLabel,
								})
								if (!confirmed) {
									return
								}
								onPermanentlyDelete()
							}}
							variant='destructive'
						>
							<Trash2Icon />
							{isBulk ? '全部永久删除' : '永久删除'}
						</ContextMenuItem>
					) : null}
				</ContextMenuGroup>
			</ContextMenuContent>
		</ContextMenu>
	)
}

function getOpenLabel(entityType: LifecycleContextMenuProps['entityType']) {
	switch (entityType) {
		case 'project':
			return '打开项目'
		case 'space':
			return '前往该 Space'
		case 'task':
			return '打开详情'
	}
}

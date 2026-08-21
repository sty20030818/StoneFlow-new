import { ContextMenu } from '@heroui-pro/react'
import { ArchiveRestoreIcon, FolderOpenIcon, Trash2Icon } from 'lucide-react'
import { useState, type ReactNode } from 'react'

import { COMMAND_IDS, type CommandId, type CommandProjection } from '@/features/command'

type LifecycleContextMenuProps = {
	children: ReactNode
	targetCount: number
	isBusy?: boolean
	onOpenDetail?: () => void
	onOpenChange?: (open: boolean) => void
	lifecycleCommand: (commandId: CommandId) => CommandProjection | null
}

/** 恢复与危险处置统一由 Command projection 决定可见性、确认与执行结果。 */
export function LifecycleContextMenu({
	children,
	targetCount,
	isBusy,
	onOpenDetail,
	onOpenChange,
	lifecycleCommand,
}: LifecycleContextMenuProps) {
	const [open, setOpen] = useState(false)
	const isBulk = targetCount > 1
	const restoreCommand = open ? lifecycleCommand(COMMAND_IDS.lifecycleRestore) : null
	const deleteCommand = open ? lifecycleCommand(COMMAND_IDS.lifecycleDelete) : null
	const permanentDeleteCommand = open
		? lifecycleCommand(COMMAND_IDS.lifecycleDeletePermanently)
		: null

	return (
		<ContextMenu
			open={open}
			onOpenChange={(nextOpen) => {
				setOpen(nextOpen)
				onOpenChange?.(nextOpen)
			}}
		>
			<ContextMenu.Trigger
				className='block w-full'
				data-open={open || undefined}
				data-row-context-menu-trigger='true'
			>
				{children}
			</ContextMenu.Trigger>
			{open ? (
				<ContextMenu.Popover className='w-52'>
					<ContextMenu.Menu aria-label='生命周期操作'>
						{onOpenDetail ? (
							<>
								<ContextMenu.Section>
									<ContextMenu.Item
										id='lifecycle-open'
										isDisabled={isBusy}
										onAction={onOpenDetail}
										textValue='打开详情'
									>
										<FolderOpenIcon />
										打开详情
									</ContextMenu.Item>
								</ContextMenu.Section>
								<ContextMenu.Separator />
							</>
						) : null}
						<ContextMenu.Section>
							{restoreCommand?.visible ? (
								<ContextMenu.Item
									aria-description={restoreCommand.disabledReason}
									id='lifecycle-restore'
									isDisabled={isBusy || !restoreCommand.enabled}
									onAction={() => void restoreCommand.execute({ source: 'context-menu' })}
									textValue={isBulk ? '全部恢复' : '恢复'}
								>
									<ArchiveRestoreIcon />
									{isBulk ? '全部恢复' : '恢复'}
								</ContextMenu.Item>
							) : null}
							{deleteCommand?.visible ? (
								<ContextMenu.Item
									aria-description={deleteCommand.disabledReason}
									id='lifecycle-move-to-trash'
									isDisabled={isBusy || !deleteCommand.enabled}
									onAction={() => void deleteCommand.execute({ source: 'context-menu' })}
									textValue={isBulk ? '全部移入回收站' : '移入回收站'}
									variant='danger'
								>
									<Trash2Icon />
									{isBulk ? '全部移入回收站' : '移入回收站'}
								</ContextMenu.Item>
							) : null}
							{permanentDeleteCommand?.visible ? (
								<ContextMenu.Item
									aria-description={permanentDeleteCommand.disabledReason}
									id='lifecycle-delete-permanently'
									isDisabled={isBusy || !permanentDeleteCommand.enabled}
									onAction={() => void permanentDeleteCommand.execute({ source: 'context-menu' })}
									textValue={isBulk ? '全部永久删除' : '永久删除'}
									variant='danger'
								>
									<Trash2Icon />
									{isBulk ? '全部永久删除' : '永久删除'}
								</ContextMenu.Item>
							) : null}
						</ContextMenu.Section>
					</ContextMenu.Menu>
				</ContextMenu.Popover>
			) : null}
		</ContextMenu>
	)
}

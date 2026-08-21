import { ContextMenu } from '@heroui-pro/react'
import { ArchiveIcon, ExternalLinkIcon, Trash2Icon } from 'lucide-react'
import { useState, type ReactNode } from 'react'

import { COMMAND_IDS, type CommandId, type CommandProjection } from '@/features/command'

type ProjectContextMenuProps = {
	children: ReactNode
	isBusy?: boolean
	onOpenProject: () => void
	onOpenChange?: (open: boolean) => void
	projectCommand: (commandId: CommandId) => CommandProjection | null
}

/** 项目右键表面只消费壳层唯一 Command Runtime 的目标投影。 */
export function ProjectContextMenu({
	children,
	isBusy,
	onOpenProject,
	onOpenChange,
	projectCommand,
}: ProjectContextMenuProps) {
	const [open, setOpen] = useState(false)
	const archiveCommand = open ? projectCommand(COMMAND_IDS.projectArchive) : null
	const deleteCommand = open ? projectCommand(COMMAND_IDS.projectDelete) : null

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
				<ContextMenu.Popover className='w-48'>
					<ContextMenu.Menu aria-label='项目操作'>
						<ContextMenu.Section>
							<ContextMenu.Item id='project-open' onAction={onOpenProject} textValue='打开项目'>
								<ExternalLinkIcon />
								打开项目
							</ContextMenu.Item>
						</ContextMenu.Section>
						{archiveCommand?.visible || deleteCommand?.visible ? (
							<>
								<ContextMenu.Separator />
								<ContextMenu.Section>
									{archiveCommand?.visible ? (
										<ContextMenu.Item
											aria-description={archiveCommand.disabledReason}
											id='project-archive'
											isDisabled={isBusy || !archiveCommand.enabled}
											onAction={() => void archiveCommand.execute({ source: 'context-menu' })}
											textValue='归档项目'
										>
											<ArchiveIcon />
											归档项目
										</ContextMenu.Item>
									) : null}
									{deleteCommand?.visible ? (
										<ContextMenu.Item
											aria-description={deleteCommand.disabledReason}
											id='project-move-to-trash'
											isDisabled={isBusy || !deleteCommand.enabled}
											onAction={() => void deleteCommand.execute({ source: 'context-menu' })}
											textValue='移入回收站'
											variant='danger'
										>
											<Trash2Icon />
											移入回收站
										</ContextMenu.Item>
									) : null}
								</ContextMenu.Section>
							</>
						) : null}
					</ContextMenu.Menu>
				</ContextMenu.Popover>
			) : null}
		</ContextMenu>
	)
}

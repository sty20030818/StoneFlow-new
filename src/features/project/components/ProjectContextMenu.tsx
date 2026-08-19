import { ContextMenu } from '@heroui-pro/react'
import { ExternalLinkIcon, Trash2Icon } from 'lucide-react'
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
				className='group/project-context-menu block w-full'
				data-open={open || undefined}
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
						{deleteCommand?.visible ? (
							<>
								<ContextMenu.Separator />
								<ContextMenu.Section>
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
								</ContextMenu.Section>
							</>
						) : null}
					</ContextMenu.Menu>
				</ContextMenu.Popover>
			) : null}
		</ContextMenu>
	)
}

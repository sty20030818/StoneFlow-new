import type { Space } from '@/shared/types'

import { SpaceDropdownMenu } from '@/features/space/ui/SpaceDropdownMenu'
import { Button } from '@/shared/ui/base/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/shared/ui/base/dialog'
import { createDialogHeaderClass, createDialogShellClass } from '@/shared/ui/patterns/create-dialog'
import { ChevronRightIcon, Maximize2Icon, XIcon } from 'lucide-react'

type CreateDialogShellProps = {
	open: boolean
	/** 弹窗标题，如 "新建任务"、"新建项目" */
	title: string
	/** 无障碍描述 */
	description: string
	spaces: Space[]
	selectedSpaceId: string | null
	onSelectSpace: (spaceId: string | null) => void
	onClose: () => void
	children: React.ReactNode
}

/**
 * 创建弹窗通用壳层 — 浮动 Dialog + Space 面包屑 Header。
 * 受控组件：selectedSpaceId 由父级管理，壳层只负责展示和转发。
 */
export function CreateDialogShell({
	open,
	title,
	description,
	spaces,
	selectedSpaceId,
	onSelectSpace,
	onClose,
	children,
}: CreateDialogShellProps) {
	const currentSpace = selectedSpaceId
		? (spaces.find((space) => space.id === selectedSpaceId) ?? null)
		: null
	const currentSpaceLabel = currentSpace?.name ?? '全部 Spaces'

		return (
		<Dialog onOpenChange={(nextOpen) => !nextOpen && onClose()} open={open}>
			<DialogContent
				className={createDialogShellClass}
				disableAnimation
				showCloseButton={false}
			>
				<DialogTitle className='sr-only'>{title}</DialogTitle>
				<DialogDescription className='sr-only'>{description}</DialogDescription>

				<div className={createDialogHeaderClass}>
					<div className='flex items-center gap-1 text-[13px]'>
						<SpaceDropdownMenu
							currentSpace={currentSpace}
							currentSpaceLabel={currentSpaceLabel}
							onSelectSpace={onSelectSpace}
							selectedSpaceId={selectedSpaceId}
							spaces={spaces}
						/>
						<ChevronRightIcon className='size-3.5 text-sf-icon-subtle' />
						<span className='font-black text-foreground'>{title}</span>
					</div>

					<div className='flex items-center gap-0.5'>
						<Button className='size-7 text-sf-icon-secondary' size='icon-sm' variant='ghost'>
							<Maximize2Icon className='size-3.5' />
						</Button>
						<Button
							className='size-7 text-sf-icon-secondary'
							onClick={onClose}
							size='icon-sm'
							variant='ghost'
						>
							<XIcon className='size-3.5' />
						</Button>
					</div>
				</div>

				<div className='flex min-h-0 flex-1 flex-col overflow-hidden'>
					{children}
				</div>
			</DialogContent>
		</Dialog>
	)
}

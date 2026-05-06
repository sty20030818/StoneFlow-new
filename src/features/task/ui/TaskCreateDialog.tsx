import { useState } from 'react'

import type { Scope, Space, TaskPlacement, TaskStatus } from '@/shared/types'
import type { ProjectOption } from '@/features/project/model/types'
import { SpaceDropdownMenu } from '@/features/space/ui/SpaceDropdownMenu'
import { TaskCreateModalContent } from '@/features/task/ui/TaskCreateModalContent'
import { cn } from '@/shared/lib/utils'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/shared/ui/base/dialog'
import { Button } from '@/shared/ui/base/button'
import { dialogShellFloatingBaseClass } from '@/shared/ui/patterns/dialog-shell'
import { ChevronRightIcon, Maximize2Icon, XIcon } from 'lucide-react'

type TaskCreateDialogProps = {
	open: boolean
	currentScope: Scope
	spaces: Space[]
	projects: ProjectOption[]
	projectsLoading: boolean
	initialPlacement: TaskPlacement | null
	initialProjectId: string | null
	initialStatus: TaskStatus
	onClose: () => void
}

/**
 * 任务创建弹窗 — Linear 风格。
 * Header: Space 下拉面包屑（副按钮）+ 最大化/关闭按钮，无分割线。
 */
export function TaskCreateDialog({
	open,
	currentScope,
	spaces,
	projects,
	projectsLoading,
	initialPlacement,
	initialProjectId,
	initialStatus,
	onClose,
}: TaskCreateDialogProps) {
	const defaultSpaceId =
		currentScope.type === 'space'
			? currentScope.spaceId
			: (spaces.find((space) => space.isDefault)?.id ?? spaces[0]?.id ?? null)
	const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(defaultSpaceId)
	const currentSpace = selectedSpaceId
		? (spaces.find((space) => space.id === selectedSpaceId) ?? null)
		: null
	const currentSpaceLabel = currentSpace?.name ?? '全部 Spaces'

	return (
		<Dialog onOpenChange={(nextOpen) => !nextOpen && onClose()} open={open}>
			<DialogContent
				className={cn(
					// 顶留白 15dvh、底最多留白 15dvh → max-h = 视口 - 上下各 15dvh；只向下长
					'flex max-h-[70dvh] min-h-0 max-w-[calc(100%-1.5rem+8px)] flex-col gap-0 overflow-hidden rounded-3xl border border-border sm:max-w-3xl top-[15dvh] translate-y-0',
					dialogShellFloatingBaseClass,
				)}
				showCloseButton={false}
			>
				<DialogTitle className='sr-only'>新建任务</DialogTitle>
				<DialogDescription className='sr-only'>
					创建新任务，设置标题、描述、状态、优先级与归属。
				</DialogDescription>

				{/* Header: 面包屑 + 操作按钮，无分割线 */}
				<div className='flex shrink-0 items-center justify-between p-3'>
					<div className='flex items-center gap-1 text-[13px]'>
						<SpaceDropdownMenu
							currentSpace={currentSpace}
							currentSpaceLabel={currentSpaceLabel}
							onSelectSpace={setSelectedSpaceId}
							selectedSpaceId={selectedSpaceId}
							spaces={spaces}
						/>
						<ChevronRightIcon className='size-3.5 text-sf-icon-subtle' />
						<span className='font-black text-foreground'>新建任务</span>
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
					<TaskCreateModalContent
						currentScope={currentScope}
						initialPlacement={initialPlacement}
						initialProjectId={initialProjectId}
						initialSpaceId={selectedSpaceId}
						initialStatus={initialStatus}
						onClose={onClose}
						projects={projects}
						projectsLoading={projectsLoading}
						spaces={spaces}
					/>
				</div>
			</DialogContent>
		</Dialog>
	)
}

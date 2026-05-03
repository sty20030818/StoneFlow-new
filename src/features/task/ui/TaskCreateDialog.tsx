import type { Scope, Space, TaskStatus } from '@/shared/types'
import type { ProjectOption } from '@/features/project/model/types'
import { TaskCreateModalContent } from '@/features/task/ui/TaskCreateModalContent'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/shared/ui/base/dialog'

type TaskCreateDialogProps = {
	open: boolean
	currentSpaceLabel: string
	currentScope: Scope
	spaces: Space[]
	projects: ProjectOption[]
	projectsLoading: boolean
	initialProjectId: string | null
	initialStatus: TaskStatus
	onClose: () => void
}

/**
 * 任务创建 feature 对外暴露的完整弹窗壳层。
 */
export function TaskCreateDialog({
	open,
	currentSpaceLabel: _currentSpaceLabel,
	currentScope,
	spaces,
	projects,
	projectsLoading,
	initialProjectId,
	initialStatus,
	onClose,
}: TaskCreateDialogProps) {
	return (
		<Dialog onOpenChange={(nextOpen) => !nextOpen && onClose()} open={open}>
			<DialogContent className='max-w-[calc(100%-1.5rem)] gap-0 border-(--sf-color-border-secondary) bg-popover p-0 shadow-(--sf-shadow-float) sm:max-w-2xl'>
				<DialogHeader className='gap-1.5 border-b border-(--sf-color-divider) px-6 py-4 pr-14'>
					<DialogTitle className='text-[1.0625rem] font-semibold tracking-[-0.02em] text-foreground'>
						新建任务
					</DialogTitle>
					<DialogDescription className='max-w-136 text-[13px] leading-5 text-muted-foreground'>
						先记录任务标题，再决定进入 Inbox、No Project 或具体 Project，并补充优先级与备注。
					</DialogDescription>
				</DialogHeader>

				<div className='px-6 pb-5 pt-4'>
					<TaskCreateModalContent
						currentScope={currentScope}
						initialProjectId={initialProjectId}
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

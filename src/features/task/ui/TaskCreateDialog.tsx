import type { ProjectRecord } from '@/features/project/model/types'
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
	currentSpaceId: string
	projects: ProjectRecord[]
	projectsLoading: boolean
	onClose: () => void
}

/**
 * 任务创建 feature 对外暴露的完整弹窗壳层。
 */
export function TaskCreateDialog({
	open,
	currentSpaceId,
	projects,
	projectsLoading,
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
						先记录任务标题，再补充优先级、归属项目和备注，创建后会先进入当前 Space 的 Inbox。
					</DialogDescription>
				</DialogHeader>

				<div className='px-6 pb-5 pt-4'>
					<TaskCreateModalContent
						currentSpaceId={currentSpaceId}
						onClose={onClose}
						projects={projects}
						projectsLoading={projectsLoading}
					/>
				</div>
			</DialogContent>
		</Dialog>
	)
}

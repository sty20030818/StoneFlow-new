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
			<DialogContent className='max-w-[calc(100%-1.5rem)] rounded-2xl border-black/10 bg-background p-0 shadow-[0_24px_80px_rgba(15,23,42,0.16)] sm:max-w-2xl'>
				<DialogHeader className='gap-1 border-b border-black/8 px-6 py-5 pr-14'>
					<DialogTitle className='text-[1.125rem] font-semibold tracking-[-0.03em] text-foreground'>
						新建任务
					</DialogTitle>
					<DialogDescription className='sr-only'>
						在当前 Space 中创建一条新的任务。
					</DialogDescription>
				</DialogHeader>

				<div className='px-6 py-5'>
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

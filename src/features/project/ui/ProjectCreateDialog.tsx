import { ProjectCreateModalContent } from '@/features/project/ui/ProjectCreateModalContent'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/shared/ui/base/dialog'

type ProjectCreateDialogProps = {
	open: boolean
	currentSpaceId: string
	parentProjectId?: string | null
	onClose: () => void
}

/**
 * 项目创建 feature 对外暴露的完整弹窗壳层。
 */
export function ProjectCreateDialog({
	open,
	currentSpaceId,
	parentProjectId = null,
	onClose,
}: ProjectCreateDialogProps) {
	const isSubproject = Boolean(parentProjectId)

	return (
		<Dialog onOpenChange={(nextOpen) => !nextOpen && onClose()} open={open}>
			<DialogContent className='max-w-[calc(100%-1.5rem)] gap-0 border-(--sf-color-border-secondary) bg-popover p-0 shadow-(--sf-shadow-float) sm:max-w-xl'>
				<DialogHeader className='gap-1.5 border-b border-(--sf-color-divider) px-6 py-4 pr-14'>
					<DialogTitle className='text-[1.0625rem] font-semibold tracking-[-0.02em] text-foreground'>
						{isSubproject ? '新建子项目' : '新建项目'}
					</DialogTitle>
					<DialogDescription className='max-w-120 text-[13px] leading-5 text-muted-foreground'>
						{isSubproject
							? '在当前项目下补一个子项目，用来继续拆分和承接后续执行。'
							: '在当前 Space 中创建一个新的项目，后续任务可以继续归类到这里。'}
					</DialogDescription>
				</DialogHeader>

				<div className='px-6 py-5'>
					<ProjectCreateModalContent
						currentSpaceId={currentSpaceId}
						onClose={onClose}
						parentProjectId={parentProjectId}
					/>
				</div>
			</DialogContent>
		</Dialog>
	)
}

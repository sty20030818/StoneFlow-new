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
			<DialogContent className='max-w-[calc(100%-1.5rem)] rounded-2xl border-black/10 bg-background p-0 shadow-[0_24px_80px_rgba(15,23,42,0.16)] sm:max-w-xl'>
				<DialogHeader className='gap-1 border-b border-black/8 px-6 py-5 pr-14'>
					<DialogTitle className='text-[1.125rem] font-semibold tracking-[-0.03em] text-foreground'>
						{isSubproject ? '新建子项目' : '新建项目'}
					</DialogTitle>
					<DialogDescription className='sr-only'>
						{isSubproject
							? '在当前项目下创建一个新的子项目。'
							: '在当前 Space 中创建一个新的项目。'}
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

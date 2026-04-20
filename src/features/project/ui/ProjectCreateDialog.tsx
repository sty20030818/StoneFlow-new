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
	onClose: () => void
}

/**
 * 项目创建 feature 对外暴露的完整弹窗壳层。
 */
export function ProjectCreateDialog({ open, currentSpaceId, onClose }: ProjectCreateDialogProps) {
	return (
		<Dialog onOpenChange={(nextOpen) => !nextOpen && onClose()} open={open}>
			<DialogContent className='max-w-[calc(100%-1.5rem)] rounded-2xl border-black/10 bg-background p-0 shadow-[0_24px_80px_rgba(15,23,42,0.16)] sm:max-w-xl'>
				<DialogHeader className='gap-1 border-b border-black/8 px-6 py-5 pr-14'>
					<DialogTitle className='text-[1.125rem] font-semibold tracking-[-0.03em] text-foreground'>
						新建项目
					</DialogTitle>
					<DialogDescription className='sr-only'>
						在当前 Space 中创建一个新的项目。
					</DialogDescription>
				</DialogHeader>

				<div className='px-6 py-5'>
					<ProjectCreateModalContent currentSpaceId={currentSpaceId} onClose={onClose} />
				</div>
			</DialogContent>
		</Dialog>
	)
}

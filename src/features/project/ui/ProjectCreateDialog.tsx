import { ProjectCreateModalContent } from '@/features/project/ui/ProjectCreateModalContent'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/shared/ui/base/dialog'
import {
	dialogShellBodyClass,
	dialogShellContentVariants,
	dialogShellDescriptionClass,
	dialogShellHeaderClass,
	dialogShellTitleClass,
} from '@/shared/ui/patterns/dialog-shell'

type ProjectCreateDialogProps = {
	open: boolean
	currentSpaceLabel: string
	spaceId: string | null
	onClose: () => void
}

/**
 * 项目创建 feature 对外暴露的完整弹窗壳层。
 */
export function ProjectCreateDialog({
	open,
	currentSpaceLabel,
	spaceId,
	onClose,
}: ProjectCreateDialogProps) {
	return (
		<Dialog onOpenChange={(nextOpen) => !nextOpen && onClose()} open={open}>
			<DialogContent className={dialogShellContentVariants({ size: 'xl' })}>
				<DialogHeader className={dialogShellHeaderClass}>
					<DialogTitle className={dialogShellTitleClass}>新建项目</DialogTitle>
					<DialogDescription className={`max-w-120 ${dialogShellDescriptionClass}`}>
						在目标 Space 中创建一个新的项目，后续任务可以继续归类到这里。
					</DialogDescription>
				</DialogHeader>

				<div className={dialogShellBodyClass}>
					<ProjectCreateModalContent
						currentSpaceLabel={currentSpaceLabel}
						onClose={onClose}
						spaceId={spaceId}
					/>
				</div>
			</DialogContent>
		</Dialog>
	)
}

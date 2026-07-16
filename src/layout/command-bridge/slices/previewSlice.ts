import type { ShellCommandActions } from '@/features/command'
import { resolveTaskDetailTargetId } from '../resolveTaskDetailTargetId'
import type { ShellCommandBridgeDeps } from '../types'

/** 右侧任务预览开关 */
export function createPreviewSlice(
	deps: Pick<
		ShellCommandBridgeDeps,
		'activeDetail' | 'closeEntityDrawer' | 'taskPreviewController'
	>,
): Partial<ShellCommandActions> {
	return {
		togglePreview: (ctx) => {
			if (deps.activeDetail?.kind === 'task') {
				deps.closeEntityDrawer()
				deps.taskPreviewController.openPreview(deps.activeDetail.id, 'keyboard')
				return
			}
			if (deps.taskPreviewController.previewState.open) {
				deps.taskPreviewController.closePreview()
				return
			}
			const targetTaskId = resolveTaskDetailTargetId(ctx)
			if (!targetTaskId) {
				return
			}
			deps.taskPreviewController.openPreview(targetTaskId, 'keyboard')
		},
	}
}

import { useMemo } from 'react'

import { useTaskPreviewContext } from './TaskPreviewProvider'

export function useTaskPreviewController() {
	const context = useTaskPreviewContext()

	return useMemo(() => {
		const taskMap = new Map((context.source?.tasks ?? []).map((task) => [task.id, task]))
		const targetTask = context.state.targetTaskId
			? (taskMap.get(context.state.targetTaskId) ?? null)
			: null

		return {
			previewState: context.state,
			targetTask,
			linkSummary: context.state.linkSummary,
			openPreview: context.openPreview,
			closePreview: context.closePreview,
			scheduleClosePreview: context.scheduleClosePreview,
			cancelScheduledClose: context.cancelScheduledClose,
			syncPreviewTarget: context.syncPreviewTarget,
			setHoveredTask: context.setHoveredTask,
			setPreviewPointerInside: context.setPreviewPointerInside,
		}
	}, [context])
}

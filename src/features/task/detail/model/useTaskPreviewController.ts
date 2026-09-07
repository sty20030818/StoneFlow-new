import { useMemo } from 'react'

import { useTaskPreviewContext } from './taskPreviewContext'

export function useTaskPreviewController() {
	const context = useTaskPreviewContext()

	return useMemo(() => {
		const previewSource =
			context.source?.taskById.size === 0 ? context.sourceSnapshot : context.source
		const targetTask = context.state.targetTaskId
			? (previewSource?.taskById.get(context.state.targetTaskId) ?? null)
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

import { startTransition, useCallback, useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'

import { openTaskDetail } from '@/app/navigation'
import type { ShellRoute } from '@/app/navigation'
import { resolveCommandOpenTargetPath } from '@/features/task'
import type { useTaskPreviewController } from '@/features/task'
import type { EntityDetailRouteState } from '@/features/entity-detail'
import { takePendingCommandOpenIntent } from '@/features/command'
import { type CommandOpenPayload, useCommandOpenListener } from '@/shared/events'
import type { QueryLoadStatus } from '@/shared/query/queryStatus'

type TaskPreview = ReturnType<typeof useTaskPreviewController>

type UseShellCommandOpenRoutingArgs = {
	shellRoute: ShellRoute
	spaceStatus: QueryLoadStatus
	activeDetail: EntityDetailRouteState
	isTaskDetailPage: boolean
	closeEntityDrawer: () => void
	taskPreviewController: TaskPreview
}

/**
 * 外部/IPC 打开意图、任务全页打开，以及详情打开时关闭预览。
 */
export function useShellCommandOpenRouting({
	shellRoute,
	spaceStatus,
	activeDetail,
	isTaskDetailPage,
	closeEntityDrawer,
	taskPreviewController,
}: UseShellCommandOpenRoutingArgs) {
	const navigate = useNavigate({ from: '/' })

	const openTaskPage = useCallback(
		({ taskId, spaceId }: { taskId: string; spaceId: string }) => {
			const targetPath = openTaskDetail(taskId, spaceId)
			taskPreviewController.closePreview()
			closeEntityDrawer()
			if (shellRoute.pathname === targetPath) {
				return
			}
			startTransition(() => {
				void navigate({ to: targetPath as never })
			})
		},
		[closeEntityDrawer, navigate, shellRoute.pathname, taskPreviewController],
	)

	useEffect(() => {
		if ((!activeDetail && !isTaskDetailPage) || !taskPreviewController.previewState.open) {
			return
		}
		taskPreviewController.closePreview()
	}, [activeDetail, isTaskDetailPage, taskPreviewController])

	const handleCommandOpen = useCallback(
		(payload: CommandOpenPayload) => {
			if (payload.kind === 'task') {
				openTaskPage({ taskId: payload.id, spaceId: payload.spaceId })
				return
			}
			const targetPath = resolveCommandOpenTargetPath(payload)
			closeEntityDrawer()
			if (shellRoute.pathname === targetPath) return
			startTransition(() => {
				void navigate({ to: targetPath as never })
			})
		},
		[closeEntityDrawer, navigate, openTaskPage, shellRoute.pathname],
	)

	useCommandOpenListener(handleCommandOpen)

	useEffect(() => {
		if (spaceStatus !== 'ready') {
			return
		}
		let cancelled = false
		void takePendingCommandOpenIntent()
			.then((payload) => {
				if (cancelled || !payload) return
				handleCommandOpen(payload)
			})
			.catch((error) => {
				console.error('take pending command open intent failed', { error })
			})
		return () => {
			cancelled = true
		}
	}, [handleCommandOpen, spaceStatus])

	return { openTaskPage, navigate }
}

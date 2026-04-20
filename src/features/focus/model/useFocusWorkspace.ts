import { startTransition, useEffect, useEffectEvent, useState } from 'react'

import {
	selectTaskDataVersion,
	useShellLayoutStore,
} from '@/app/layouts/shell/model/useShellLayoutStore'
import { getFocusViewTasks } from '@/features/focus/api/getFocusViewTasks'
import { listFocusViews } from '@/features/focus/api/listFocusViews'
import { updateTaskPinState } from '@/features/focus/api/updateTaskPinState'
import type { FocusTaskRecord, FocusViewKey, FocusViewRecord } from '@/features/focus/model/types'

type UseFocusWorkspaceResult = {
	views: FocusViewRecord[]
	activeViewKey: FocusViewKey
	tasks: FocusTaskRecord[]
	isLoading: boolean
	loadError: string | null
	feedback: string | null
	pendingTaskId: string | null
	setActiveViewKey: (viewKey: FocusViewKey) => void
	refresh: () => Promise<void>
	toggleTaskPin: (task: FocusTaskRecord) => Promise<void>
}

/**
 * 为后续 Focus 页提供真实视图列表、单视图查询与 pin 动作骨架。
 */
export function useFocusWorkspace(spaceId: string): UseFocusWorkspaceResult {
	const taskDataVersion = useShellLayoutStore(selectTaskDataVersion)
	const bumpTaskDataVersion = useShellLayoutStore((state) => state.bumpTaskDataVersion)
	const [views, setViews] = useState<FocusViewRecord[]>([])
	const [activeViewKey, setActiveViewKey] = useState<FocusViewKey>('focus')
	const [tasks, setTasks] = useState<FocusTaskRecord[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [loadError, setLoadError] = useState<string | null>(null)
	const [feedback, setFeedback] = useState<string | null>(null)
	const [pendingTaskId, setPendingTaskId] = useState<string | null>(null)

	const refresh = useEffectEvent(async () => {
		setIsLoading(true)
		setLoadError(null)

		try {
			const nextViews = await listFocusViews({ spaceSlug: spaceId })
			const nextActiveViewKey = resolveActiveViewKey(nextViews, activeViewKey)
			const snapshot = await getFocusViewTasks({
				spaceSlug: spaceId,
				viewKey: nextActiveViewKey,
			})

			startTransition(() => {
				setViews(nextViews)
				setActiveViewKey(nextActiveViewKey)
				setTasks(snapshot.tasks)
			})
		} catch (error) {
			setTasks([])
			setLoadError(toErrorMessage(error))
		} finally {
			setIsLoading(false)
		}
	})

	useEffect(() => {
		void refresh()
	}, [activeViewKey, spaceId, taskDataVersion])

	const toggleTaskPin = useEffectEvent(async (task: FocusTaskRecord) => {
		const nextPinned = !task.pinned
		setPendingTaskId(task.id)
		setLoadError(null)

		try {
			const payload = await updateTaskPinState({
				spaceSlug: spaceId,
				taskId: task.id,
				pinned: nextPinned,
			})

			startTransition(() => {
				setTasks((currentTasks) => {
					if (activeViewKey === 'focus' && !payload.pinned) {
						return currentTasks.filter((currentTask) => currentTask.id !== payload.taskId)
					}

					return currentTasks.map((currentTask) =>
						currentTask.id === payload.taskId
							? {
									...currentTask,
									pinned: payload.pinned,
									updatedAt: payload.updatedAt,
								}
							: currentTask,
					)
				})
				setFeedback(
					payload.pinned ? `已将“${task.title}”加入 Focus` : `已将“${task.title}”移出 Focus`,
				)
			})
			bumpTaskDataVersion()
		} catch (error) {
			setLoadError(toErrorMessage(error))
		} finally {
			setPendingTaskId(null)
		}
	})

	return {
		views,
		activeViewKey,
		tasks,
		isLoading,
		loadError,
		feedback,
		pendingTaskId,
		setActiveViewKey,
		refresh,
		toggleTaskPin,
	}
}

function resolveActiveViewKey(views: FocusViewRecord[], activeViewKey: FocusViewKey): FocusViewKey {
	if (views.some((view) => view.key === activeViewKey)) {
		return activeViewKey
	}

	return views[0]?.key ?? 'focus'
}

function toErrorMessage(error: unknown) {
	return error instanceof Error ? error.message : 'Focus 请求失败，请稍后重试。'
}

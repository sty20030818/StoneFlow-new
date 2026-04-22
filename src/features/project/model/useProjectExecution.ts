import { startTransition, useEffect, useEffectEvent, useRef, useState } from 'react'

import {
	selectProjectDataVersion,
	selectTaskDataVersion,
	useShellLayoutStore,
} from '@/app/layouts/shell/model/useShellLayoutStore'
import { getProjectExecutionView } from '@/features/project/api/getProjectExecutionView'
import { updateProjectTaskStatus } from '@/features/project/api/updateProjectTaskStatus'
import { deleteProjectToTrash } from '@/features/trash/api/deleteProjectToTrash'
import type {
	ProjectExecutionTask,
	ProjectExecutionView,
	ProjectTaskStatus,
} from '@/features/project/model/types'

type UseProjectExecutionResult = {
	view: ProjectExecutionView | null
	isLoading: boolean
	loadError: string | null
	feedback: string | null
	pendingTaskId: string | null
	isDeletingProject: boolean
	refresh: () => Promise<void>
	toggleTaskStatus: (task: ProjectExecutionTask) => Promise<void>
	deleteCurrentProject: () => Promise<boolean>
}

/**
 * 统一管理 Project 执行页的真实查询与状态切换。
 */
export function useProjectExecution(spaceId: string, projectId: string): UseProjectExecutionResult {
	const taskDataVersion = useShellLayoutStore(selectTaskDataVersion)
	const projectDataVersion = useShellLayoutStore(selectProjectDataVersion)
	const bumpTaskDataVersion = useShellLayoutStore((state) => state.bumpTaskDataVersion)
	const bumpProjectDataVersion = useShellLayoutStore((state) => state.bumpProjectDataVersion)
	const skipNextTaskDataVersionRefreshRef = useRef(false)
	const lastTaskDataVersionRef = useRef(taskDataVersion)
	const [view, setView] = useState<ProjectExecutionView | null>(null)
	const [isLoading, setIsLoading] = useState(true)
	const [loadError, setLoadError] = useState<string | null>(null)
	const [feedback, setFeedback] = useState<string | null>(null)
	const [pendingTaskId, setPendingTaskId] = useState<string | null>(null)
	const [isDeletingProject, setIsDeletingProject] = useState(false)

	const refresh = useEffectEvent(async () => {
		setIsLoading(true)
		setLoadError(null)

		try {
			const payload = await getProjectExecutionView({
				spaceSlug: spaceId,
				projectId,
			})

			startTransition(() => {
				setView(payload)
				setFeedback(null)
			})
		} catch (error) {
			setView(null)
			setLoadError(toErrorMessage(error))
		} finally {
			setIsLoading(false)
		}
	})

	useEffect(() => {
		void refresh()
	}, [projectId, spaceId, projectDataVersion])

	useEffect(() => {
		if (skipNextTaskDataVersionRefreshRef.current) {
			skipNextTaskDataVersionRefreshRef.current = false
			lastTaskDataVersionRef.current = taskDataVersion
			return
		}

		if (lastTaskDataVersionRef.current === taskDataVersion) {
			return
		}

		lastTaskDataVersionRef.current = taskDataVersion
		void refresh()
	}, [taskDataVersion])

	const toggleTaskStatus = useEffectEvent(async (task: ProjectExecutionTask) => {
		const nextStatus: ProjectTaskStatus = task.status === 'todo' ? 'done' : 'todo'

		setPendingTaskId(task.id)

		try {
			const payload = await updateProjectTaskStatus({
				spaceSlug: spaceId,
				projectId,
				taskId: task.id,
				status: nextStatus,
			})

			startTransition(() => {
				setView((currentView) => {
					if (!currentView) {
						return currentView
					}

					return {
						...currentView,
						tasks: currentView.tasks.map((currentTask) =>
							currentTask.id === payload.taskId
								? {
										...currentTask,
										status: payload.status,
										completedAt: payload.completedAt,
										updatedAt: payload.updatedAt,
									}
								: currentTask,
						),
					}
				})
				setFeedback(
					nextStatus === 'done' ? `已完成“${task.title}”` : `已将“${task.title}”恢复为待执行`,
				)
				setLoadError(null)
			})
			skipNextTaskDataVersionRefreshRef.current = true
			bumpTaskDataVersion()
		} catch (error) {
			setLoadError(toErrorMessage(error))
		} finally {
			setPendingTaskId(null)
		}
	})

	const deleteCurrentProject = useEffectEvent(async () => {
		setIsDeletingProject(true)
		setLoadError(null)

		try {
			await deleteProjectToTrash({
				spaceSlug: spaceId,
				projectId,
			})
			bumpProjectDataVersion()
			return true
		} catch (error) {
			setLoadError(toErrorMessage(error))
			return false
		} finally {
			setIsDeletingProject(false)
		}
	})

	return {
		view,
		isLoading,
		loadError,
		feedback,
		pendingTaskId,
		isDeletingProject,
		refresh,
		toggleTaskStatus,
		deleteCurrentProject,
	}
}

function toErrorMessage(error: unknown) {
	return error instanceof Error ? error.message : 'Project 请求失败，请稍后重试。'
}

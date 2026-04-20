import { startTransition, useEffect, useEffectEvent, useState } from 'react'

import {
	selectProjectDataVersion,
	selectTaskDataVersion,
	useShellLayoutStore,
} from '@/app/layouts/shell/model/useShellLayoutStore'
import {
	listInboxTasks,
	type InboxProjectOption,
	type InboxTaskRecord,
} from '@/features/inbox/api/listInboxTasks'
import { triageInboxTask } from '@/features/inbox/api/triageInboxTask'

type InboxTaskDraft = {
	projectId: string
	priority: string
	isSubmitting: boolean
	error: string | null
}

type UseInboxTasksResult = {
	tasks: InboxTaskRecord[]
	projects: InboxProjectOption[]
	isLoading: boolean
	loadError: string | null
	feedback: string | null
	getDraft: (taskId: string) => InboxTaskDraft
	updateDraft: (taskId: string, patch: Partial<Omit<InboxTaskDraft, 'isSubmitting'>>) => void
	refresh: () => Promise<void>
	submitTriage: (taskId: string) => Promise<void>
}

const EMPTY_DRAFT: InboxTaskDraft = {
	projectId: '',
	priority: '',
	isSubmitting: false,
	error: null,
}

function createDraft(task: InboxTaskRecord): InboxTaskDraft {
	return {
		projectId: task.projectId ?? '',
		priority: task.priority ?? '',
		isSubmitting: false,
		error: null,
	}
}

/**
 * 统一管理 Inbox 列表加载、行内草稿和整理动作。
 */
export function useInboxTasks(spaceId: string): UseInboxTasksResult {
	const taskDataVersion = useShellLayoutStore(selectTaskDataVersion)
	const projectDataVersion = useShellLayoutStore(selectProjectDataVersion)
	const [tasks, setTasks] = useState<InboxTaskRecord[]>([])
	const [projects, setProjects] = useState<InboxProjectOption[]>([])
	const [drafts, setDrafts] = useState<Record<string, InboxTaskDraft>>({})
	const [isLoading, setIsLoading] = useState(true)
	const [loadError, setLoadError] = useState<string | null>(null)
	const [feedback, setFeedback] = useState<string | null>(null)

	const refresh = useEffectEvent(async () => {
		setIsLoading(true)
		setLoadError(null)

		try {
			const snapshot = await listInboxTasks({ spaceSlug: spaceId })

			startTransition(() => {
				setTasks(snapshot.tasks)
				setProjects(snapshot.projects)
				setDrafts((currentDrafts) =>
					Object.fromEntries(
						snapshot.tasks.map((task) => [task.id, currentDrafts[task.id] ?? createDraft(task)]),
					),
				)
				setFeedback(null)
			})
		} catch (error) {
			setLoadError(toErrorMessage(error))
		} finally {
			setIsLoading(false)
		}
	})

	useEffect(() => {
		void refresh()
	}, [projectDataVersion, spaceId, taskDataVersion])

	function getDraft(taskId: string) {
		return drafts[taskId] ?? EMPTY_DRAFT
	}

	function updateDraft(taskId: string, patch: Partial<Omit<InboxTaskDraft, 'isSubmitting'>>) {
		setDrafts((currentDrafts) => ({
			...currentDrafts,
			[taskId]: {
				...(currentDrafts[taskId] ?? EMPTY_DRAFT),
				...patch,
			},
		}))
	}

	const submitTriage = useEffectEvent(async (taskId: string) => {
		const task = tasks.find((item) => item.id === taskId)
		const draft = drafts[taskId]

		if (!task || !draft) {
			return
		}

		const nextProjectId = draft.projectId || null
		const nextPriority = draft.priority || null
		const projectChanged = nextProjectId !== task.projectId
		const priorityChanged = nextPriority !== task.priority

		if (!projectChanged && !priorityChanged) {
			updateDraft(taskId, {
				error: '请先调整项目或优先级，再执行整理。',
			})
			return
		}

		setDrafts((currentDrafts) => ({
			...currentDrafts,
			[taskId]: {
				...(currentDrafts[taskId] ?? EMPTY_DRAFT),
				isSubmitting: true,
				error: null,
			},
		}))

		try {
			const payload = await triageInboxTask({
				spaceSlug: spaceId,
				taskId,
				projectId: nextProjectId,
				priority: nextPriority,
			})

			startTransition(() => {
				setFeedback(
					payload.remainsInInbox
						? `已更新“${task.title}”，仍需补齐剩余字段`
						: `已整理“${task.title}”，任务已离开 Inbox`,
				)
				setTasks((currentTasks) =>
					currentTasks.flatMap((currentTask) => {
						if (currentTask.id !== taskId) {
							return [currentTask]
						}

						if (!payload.remainsInInbox) {
							return []
						}

						return [
							{
								...currentTask,
								projectId: payload.projectId,
								priority: payload.priority,
								status: payload.status,
								updatedAt: payload.updatedAt,
							},
						]
					}),
				)
				setDrafts((currentDrafts) => {
					if (!payload.remainsInInbox) {
						const { [taskId]: _removed, ...rest } = currentDrafts
						return rest
					}

					return {
						...currentDrafts,
						[taskId]: {
							projectId: payload.projectId ?? '',
							priority: payload.priority ?? '',
							isSubmitting: false,
							error: null,
						},
					}
				})
			})
		} catch (error) {
			setDrafts((currentDrafts) => ({
				...currentDrafts,
				[taskId]: {
					...(currentDrafts[taskId] ?? EMPTY_DRAFT),
					isSubmitting: false,
					error: toErrorMessage(error),
				},
			}))
			return
		}
	})

	return {
		tasks,
		projects,
		isLoading,
		loadError,
		feedback,
		getDraft,
		updateDraft,
		refresh,
		submitTriage,
	}
}

function toErrorMessage(error: unknown) {
	return error instanceof Error ? error.message : 'Inbox 请求失败，请稍后重试。'
}

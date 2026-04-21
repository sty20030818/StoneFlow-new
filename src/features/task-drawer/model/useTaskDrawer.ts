import { startTransition, useEffect, useEffectEvent, useMemo, useState } from 'react'

import { useShellLayoutStore } from '@/app/layouts/shell/model/useShellLayoutStore'
import { createTaskResource } from '@/features/task-drawer/api/createTaskResource'
import { deleteTaskResource } from '@/features/task-drawer/api/deleteTaskResource'
import { deleteTaskToTrash } from '@/features/task-drawer/api/deleteTaskToTrash'
import { getTaskDrawerDetail } from '@/features/task-drawer/api/getTaskDrawerDetail'
import { listTaskResources } from '@/features/task-drawer/api/listTaskResources'
import { openTaskResource } from '@/features/task-drawer/api/openTaskResource'
import { updateTaskDrawerFields } from '@/features/task-drawer/api/updateTaskDrawerFields'
import type {
	TaskDrawerDetail,
	TaskDrawerResourceType,
	TaskDrawerStatus,
	TaskDrawerTask,
} from '@/features/task-drawer/model/types'

type TaskDrawerDraft = {
	title: string
	note: string
	priority: string
	projectId: string
	status: TaskDrawerStatus
}

type UseTaskDrawerResult = {
	detail: TaskDrawerDetail | null
	draft: TaskDrawerDraft
	isDirty: boolean
	isLoading: boolean
	isSaving: boolean
	isDeleting: boolean
	isResourceLoading: boolean
	isAddingResource: boolean
	pendingResourceId: string | null
	loadError: string | null
	saveError: string | null
	deleteError: string | null
	resourceError: string | null
	feedback: string | null
	resourceFeedback: string | null
	refresh: () => Promise<void>
	refreshResources: () => Promise<void>
	updateDraft: (patch: Partial<TaskDrawerDraft>) => void
	save: () => Promise<void>
	deleteTask: () => Promise<boolean>
	addResource: (input: {
		type: TaskDrawerResourceType
		title: string
		target: string
	}) => Promise<boolean>
	openResource: (resourceId: string) => Promise<boolean>
	deleteResource: (resourceId: string) => Promise<boolean>
}

const EMPTY_DRAFT: TaskDrawerDraft = {
	title: '',
	note: '',
	priority: '',
	projectId: '',
	status: 'todo',
}

function createDraft(task: TaskDrawerTask): TaskDrawerDraft {
	return {
		title: task.title,
		note: task.note ?? '',
		priority: task.priority ?? '',
		projectId: task.projectId ?? '',
		status: task.status,
	}
}

/**
 * 统一管理 Task Drawer 的详情查询、草稿与保存动作。
 */
export function useTaskDrawer(spaceId: string, taskId: string): UseTaskDrawerResult {
	const bumpTaskDataVersion = useShellLayoutStore((state) => state.bumpTaskDataVersion)
	const [detail, setDetail] = useState<TaskDrawerDetail | null>(null)
	const [draft, setDraft] = useState<TaskDrawerDraft>(EMPTY_DRAFT)
	const [isLoading, setIsLoading] = useState(true)
	const [isSaving, setIsSaving] = useState(false)
	const [isDeleting, setIsDeleting] = useState(false)
	const [isResourceLoading, setIsResourceLoading] = useState(false)
	const [isAddingResource, setIsAddingResource] = useState(false)
	const [pendingResourceId, setPendingResourceId] = useState<string | null>(null)
	const [loadError, setLoadError] = useState<string | null>(null)
	const [saveError, setSaveError] = useState<string | null>(null)
	const [deleteError, setDeleteError] = useState<string | null>(null)
	const [resourceError, setResourceError] = useState<string | null>(null)
	const [feedback, setFeedback] = useState<string | null>(null)
	const [resourceFeedback, setResourceFeedback] = useState<string | null>(null)

	const refresh = useEffectEvent(async () => {
		setIsLoading(true)
		setLoadError(null)

		try {
			const payload = await getTaskDrawerDetail({
				spaceSlug: spaceId,
				taskId,
			})

			startTransition(() => {
				setDetail(payload)
				setDraft(createDraft(payload.task))
				setFeedback(null)
				setSaveError(null)
				setDeleteError(null)
				setResourceError(null)
				setResourceFeedback(null)
			})
		} catch (error) {
			setDetail(null)
			setLoadError(toErrorMessage(error))
		} finally {
			setIsLoading(false)
		}
	})

	const refreshResources = useEffectEvent(async () => {
		if (!detail) {
			return
		}

		setIsResourceLoading(true)
		setResourceError(null)

		try {
			const resources = await listTaskResources({
				spaceSlug: spaceId,
				taskId,
			})

			startTransition(() => {
				setDetail((currentDetail) =>
					currentDetail
						? {
								...currentDetail,
								resources,
							}
						: currentDetail,
				)
			})
		} catch (error) {
			setResourceError(toErrorMessage(error))
		} finally {
			setIsResourceLoading(false)
		}
	})

	useEffect(() => {
		void refresh()
	}, [spaceId, taskId])

	function updateDraft(patch: Partial<TaskDrawerDraft>) {
		setDraft((currentDraft) => ({
			...currentDraft,
			...patch,
		}))
	}

	const isDirty = useMemo(() => {
		if (!detail) {
			return false
		}

		return (
			detail.task.title !== draft.title.trim() ||
			normalizeOptionalText(detail.task.note) !== normalizeOptionalText(draft.note) ||
			(detail.task.priority ?? '') !== draft.priority ||
			(detail.task.projectId ?? '') !== draft.projectId ||
			detail.task.status !== draft.status
		)
	}, [detail, draft])

	const save = useEffectEvent(async () => {
		if (!detail || !isDirty) {
			return
		}

		setIsSaving(true)
		setSaveError(null)
		setDeleteError(null)
		setResourceError(null)

		try {
			const payload = await updateTaskDrawerFields({
				spaceSlug: spaceId,
				taskId,
				title: draft.title,
				note: draft.note,
				priority: draft.priority,
				projectId: draft.projectId,
				status: draft.status,
			})

			startTransition(() => {
				setDetail((currentDetail) =>
					currentDetail
						? {
								...currentDetail,
								task: payload,
							}
						: currentDetail,
				)
				setDraft(createDraft(payload))
				setFeedback(`已保存“${payload.title}”`)
			})
			bumpTaskDataVersion()
		} catch (error) {
			setSaveError(toErrorMessage(error))
			return
		} finally {
			setIsSaving(false)
		}
	})

	const deleteTask = useEffectEvent(async () => {
		if (!detail) {
			return false
		}

		setIsDeleting(true)
		setDeleteError(null)
		setSaveError(null)
		setResourceError(null)

		try {
			await deleteTaskToTrash({
				spaceSlug: spaceId,
				taskId,
			})
			bumpTaskDataVersion()
			return true
		} catch (error) {
			setDeleteError(toErrorMessage(error))
			return false
		} finally {
			setIsDeleting(false)
		}
	})

	const addResource = useEffectEvent(
		async (input: { type: TaskDrawerResourceType; title: string; target: string }) => {
			if (!detail) {
				return false
			}

			setIsAddingResource(true)
			setResourceError(null)
			setResourceFeedback(null)

			try {
				await createTaskResource({
					spaceSlug: spaceId,
					taskId,
					type: input.type,
					title: input.title,
					target: input.target,
				})
				await refreshResources()
				setResourceFeedback('资源已挂载')
				return true
			} catch (error) {
				setResourceError(toErrorMessage(error))
				return false
			} finally {
				setIsAddingResource(false)
			}
		},
	)

	const openResource = useEffectEvent(async (resourceId: string) => {
		if (!detail) {
			return false
		}

		setPendingResourceId(resourceId)
		setResourceError(null)
		setResourceFeedback(null)

		try {
			await openTaskResource({
				spaceSlug: spaceId,
				resourceId,
			})
			setResourceFeedback('已交给系统打开')
			return true
		} catch (error) {
			setResourceError(toErrorMessage(error))
			return false
		} finally {
			setPendingResourceId(null)
		}
	})

	const deleteResource = useEffectEvent(async (resourceId: string) => {
		if (!detail) {
			return false
		}

		setPendingResourceId(resourceId)
		setResourceError(null)
		setResourceFeedback(null)

		try {
			await deleteTaskResource({
				spaceSlug: spaceId,
				resourceId,
			})
			await refreshResources()
			setResourceFeedback('资源已移除')
			return true
		} catch (error) {
			setResourceError(toErrorMessage(error))
			return false
		} finally {
			setPendingResourceId(null)
		}
	})

	return {
		detail,
		draft,
		isDirty,
		isLoading,
		isSaving,
		isDeleting,
		isResourceLoading,
		isAddingResource,
		pendingResourceId,
		loadError,
		saveError,
		deleteError,
		resourceError,
		feedback,
		resourceFeedback,
		refresh,
		refreshResources,
		updateDraft,
		save,
		deleteTask,
		addResource,
		openResource,
		deleteResource,
	}
}

function normalizeOptionalText(value: string | null) {
	const normalized = value?.trim()
	return normalized ? normalized : null
}

function toErrorMessage(error: unknown) {
	if (typeof error === 'string') {
		return error
	}

	return error instanceof Error ? error.message : 'Task Drawer 请求失败，请稍后重试。'
}

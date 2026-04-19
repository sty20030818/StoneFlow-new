import { startTransition, useEffect, useEffectEvent, useMemo, useState } from 'react'

import { useShellLayoutStore } from '@/app/layouts/shell/model/useShellLayoutStore'
import { getTaskDrawerDetail } from '@/features/task-drawer/api/getTaskDrawerDetail'
import { updateTaskDrawerFields } from '@/features/task-drawer/api/updateTaskDrawerFields'
import type { TaskDrawerDetail, TaskDrawerStatus, TaskDrawerTask } from '@/features/task-drawer/model/types'

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
	loadError: string | null
	saveError: string | null
	feedback: string | null
	refresh: () => Promise<void>
	updateDraft: (patch: Partial<TaskDrawerDraft>) => void
	save: () => Promise<void>
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
	const [loadError, setLoadError] = useState<string | null>(null)
	const [saveError, setSaveError] = useState<string | null>(null)
	const [feedback, setFeedback] = useState<string | null>(null)

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
			})
		} catch (error) {
			setDetail(null)
			setLoadError(toErrorMessage(error))
		} finally {
			setIsLoading(false)
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

	return {
		detail,
		draft,
		isDirty,
		isLoading,
		isSaving,
		loadError,
		saveError,
		feedback,
		refresh,
		updateDraft,
		save,
	}
}

function normalizeOptionalText(value: string | null) {
	const normalized = value?.trim()
	return normalized ? normalized : null
}

function toErrorMessage(error: unknown) {
	return error instanceof Error ? error.message : 'Task Drawer 请求失败，请稍后重试。'
}

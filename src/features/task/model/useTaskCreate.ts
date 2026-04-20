import { useCallback, useState } from 'react'

import { useShellLayoutStore } from '@/app/layouts/shell/model/useShellLayoutStore'
import { createTask, type CreatedTaskPayload } from '@/features/task/api/createTask'

type TaskCreateStatus = 'idle' | 'submitting' | 'success' | 'error'

type UseTaskCreateOptions = {
	currentSpaceId: string
}

/**
 * 管理应用内任务创建表单的最小状态。
 */
export function useTaskCreate({ currentSpaceId }: UseTaskCreateOptions) {
	const bumpTaskDataVersion = useShellLayoutStore((state) => state.bumpTaskDataVersion)
	const [title, setTitle] = useState('')
	const [note, setNote] = useState('')
	const [priority, setPriority] = useState('')
	const [projectId, setProjectId] = useState('')
	const [status, setStatus] = useState<TaskCreateStatus>('idle')
	const [errorMessage, setErrorMessage] = useState<string | null>(null)
	const [createdTask, setCreatedTask] = useState<CreatedTaskPayload | null>(null)

	const reset = useCallback(() => {
		setTitle('')
		setNote('')
		setPriority('')
		setProjectId('')
		setStatus('idle')
		setErrorMessage(null)
		setCreatedTask(null)
	}, [])

	const submit = useCallback(async () => {
		if (status === 'submitting') {
			return null
		}

		setStatus('submitting')
		setErrorMessage(null)

		try {
			const payload = await createTask({
				spaceSlug: currentSpaceId,
				title,
				note,
				priority: priority || null,
				projectId: projectId || null,
			})

			setCreatedTask(payload)
			setStatus('success')
			bumpTaskDataVersion()
			return payload
		} catch (error) {
			const message = error instanceof Error ? error.message : '创建任务失败，请稍后重试。'
			console.error('task create failed', {
				currentSpaceId,
				title,
				note,
				priority,
				projectId,
				error,
			})
			setCreatedTask(null)
			setStatus('error')
			setErrorMessage(message)
			return null
		}
	}, [bumpTaskDataVersion, currentSpaceId, note, priority, projectId, status, title])

	return {
		title,
		note,
		priority,
		projectId,
		status,
		errorMessage,
		createdTask,
		setTitle,
		setNote,
		setPriority,
		setProjectId,
		reset,
		submit,
	}
}

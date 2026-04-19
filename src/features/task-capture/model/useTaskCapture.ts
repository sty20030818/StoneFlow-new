import { useCallback, useState } from 'react'

import { createTask, type CreatedTaskPayload } from '@/features/task-capture/api/createTask'

type TaskCaptureStatus = 'idle' | 'submitting' | 'success' | 'error'

type UseTaskCaptureOptions = {
	currentSpaceId: string
}

/**
 * 管理应用内任务捕获表单的最小状态。
 */
export function useTaskCapture({ currentSpaceId }: UseTaskCaptureOptions) {
	const [title, setTitle] = useState('')
	const [note, setNote] = useState('')
	const [status, setStatus] = useState<TaskCaptureStatus>('idle')
	const [errorMessage, setErrorMessage] = useState<string | null>(null)
	const [createdTask, setCreatedTask] = useState<CreatedTaskPayload | null>(null)

	const reset = useCallback(() => {
		setTitle('')
		setNote('')
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
			})

			setCreatedTask(payload)
			setStatus('success')
			return payload
		} catch (error) {
			const message = error instanceof Error ? error.message : '创建任务失败，请稍后重试。'
			setCreatedTask(null)
			setStatus('error')
			setErrorMessage(message)
			return null
		}
	}, [currentSpaceId, note, status, title])

	return {
		title,
		note,
		status,
		errorMessage,
		createdTask,
		setTitle,
		setNote,
		reset,
		submit,
	}
}

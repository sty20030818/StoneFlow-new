import { useCallback, useEffect, useState } from 'react'

import { useShellLayoutStore } from '@/app/layouts/shell/model/useShellLayoutStore'
import type { ProjectTaskStatus } from '@/features/project/model/types'
import {
	createTask,
	normalizeTaskCreateError,
	type CreatedTaskPayload,
} from '@/features/task/api/createTask'

type TaskCreateStatus = 'idle' | 'submitting' | 'success' | 'error'

type UseTaskCreateOptions = {
	currentSpaceId: string
	initialProjectId: string | null
	initialStatus: ProjectTaskStatus
}

/**
 * 管理应用内任务创建表单的最小状态。
 */
export function useTaskCreate({
	currentSpaceId,
	initialProjectId,
	initialStatus,
}: UseTaskCreateOptions) {
	const bumpTaskDataVersion = useShellLayoutStore((state) => state.bumpTaskDataVersion)
	const [title, setTitle] = useState('')
	const [note, setNote] = useState('')
	const [priority, setPriority] = useState('')
	const [projectId, setProjectId] = useState(initialProjectId ?? '')
	const [status, setStatus] = useState<TaskCreateStatus>('idle')
	const [errorMessage, setErrorMessage] = useState<string | null>(null)
	const [createdTask, setCreatedTask] = useState<CreatedTaskPayload | null>(null)
	const [taskStatus, setTaskStatus] = useState<ProjectTaskStatus>(initialStatus)

	useEffect(() => {
		setProjectId(initialProjectId ?? '')
		setTaskStatus(initialStatus)
	}, [initialProjectId, initialStatus])

	const reset = useCallback(() => {
		setTitle('')
		setNote('')
		setPriority('')
		setProjectId(initialProjectId ?? '')
		setStatus('idle')
		setErrorMessage(null)
		setCreatedTask(null)
		setTaskStatus(initialStatus)
	}, [initialProjectId, initialStatus])

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
				status: taskStatus,
			})

			setCreatedTask(payload)
			setStatus('success')
			bumpTaskDataVersion()
			return payload
		} catch (error) {
			const normalizedError = normalizeTaskCreateError(error)
			const message = normalizedError.message
			console.error('task create failed', {
				currentSpaceId,
				title,
				note,
				priority,
				projectId,
				taskStatus,
				error: normalizedError,
			})
			setCreatedTask(null)
			setStatus('error')
			setErrorMessage(message)
			return null
		}
	}, [bumpTaskDataVersion, currentSpaceId, note, priority, projectId, status, taskStatus, title])

	return {
		title,
		note,
		priority,
		projectId,
		taskStatus,
		status,
		errorMessage,
		createdTask,
		setTitle,
		setNote,
		setPriority,
		setProjectId,
		setTaskStatus,
		reset,
		submit,
	}
}

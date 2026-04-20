import { useCallback, useState } from 'react'

import { useShellLayoutStore } from '@/app/layouts/shell/model/useShellLayoutStore'
import { createProject, type CreatedProjectPayload } from '@/features/project/api/createProject'

type ProjectCreateStatus = 'idle' | 'submitting' | 'success' | 'error'

type UseProjectCreateOptions = {
	currentSpaceId: string
}

/**
 * 管理应用内项目创建表单的最小状态。
 */
export function useProjectCreate({ currentSpaceId }: UseProjectCreateOptions) {
	const bumpProjectDataVersion = useShellLayoutStore((state) => state.bumpProjectDataVersion)
	const [name, setName] = useState('')
	const [note, setNote] = useState('')
	const [status, setStatus] = useState<ProjectCreateStatus>('idle')
	const [errorMessage, setErrorMessage] = useState<string | null>(null)
	const [createdProject, setCreatedProject] = useState<CreatedProjectPayload | null>(null)

	const reset = useCallback(() => {
		setName('')
		setNote('')
		setStatus('idle')
		setErrorMessage(null)
		setCreatedProject(null)
	}, [])

	const submit = useCallback(async () => {
		if (status === 'submitting') {
			return null
		}

		setStatus('submitting')
		setErrorMessage(null)

		try {
			const payload = await createProject({
				spaceSlug: currentSpaceId,
				name,
				note,
			})

			setCreatedProject(payload)
			setStatus('success')
			bumpProjectDataVersion()
			return payload
		} catch (error) {
			const message = error instanceof Error ? error.message : '创建项目失败，请稍后重试。'
			setCreatedProject(null)
			setStatus('error')
			setErrorMessage(message)
			return null
		}
	}, [bumpProjectDataVersion, currentSpaceId, name, note, status])

	return {
		name,
		note,
		status,
		errorMessage,
		createdProject,
		setName,
		setNote,
		reset,
		submit,
	}
}

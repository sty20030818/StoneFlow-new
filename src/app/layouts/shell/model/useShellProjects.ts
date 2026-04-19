import { useEffect, useEffectEvent, useState } from 'react'

import { listProjects } from '@/features/project/api/listProjects'
import type { ProjectRecord } from '@/features/project/model/types'

type UseShellProjectsResult = {
	projects: ProjectRecord[]
	isLoading: boolean
	error: string | null
}

/**
 * 为 Shell Header / Sidebar 提供当前 Space 的真实项目导航数据。
 */
export function useShellProjects(spaceId: string): UseShellProjectsResult {
	const [projects, setProjects] = useState<ProjectRecord[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	const refresh = useEffectEvent(async () => {
		setIsLoading(true)
		setError(null)

		try {
			const payload = await listProjects({ spaceSlug: spaceId })
			setProjects(payload)
		} catch (loadError) {
			setProjects([])
			setError(toErrorMessage(loadError))
		} finally {
			setIsLoading(false)
		}
	})

	useEffect(() => {
		void refresh()
	}, [spaceId])

	return {
		projects,
		isLoading,
		error,
	}
}

function toErrorMessage(error: unknown) {
	return error instanceof Error ? error.message : '项目导航加载失败，请稍后重试。'
}

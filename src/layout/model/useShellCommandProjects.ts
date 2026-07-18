import { useEffect, useState } from 'react'

import { listAllVisibleProjects } from '@/features/project'
import type { QueryLoadStatus } from '@/shared/query/queryStatus'

export type ShellCommandProjectOption = {
	id: string
	label: string
	spaceId: string
	spaceName: string
	completedAt: string | null
}

/**
 * 命令板打开且 space ready 时懒加载可见项目列表。
 */
export function useShellCommandProjects(isCommandOpen: boolean, spaceStatus: QueryLoadStatus) {
	const [commandProjects, setCommandProjects] = useState<ShellCommandProjectOption[]>([])

	useEffect(() => {
		if (!isCommandOpen || spaceStatus !== 'ready' || commandProjects.length > 0) {
			return
		}
		let cancelled = false
		void listAllVisibleProjects()
			.then((items) => {
				if (cancelled) return
				setCommandProjects(
					items.map((project) => ({
						id: project.id,
						label: project.name,
						spaceId: project.spaceId,
						spaceName: project.spaceName,
						completedAt: project.completedAt,
					})),
				)
			})
			.catch(() => {
				if (!cancelled) setCommandProjects([])
			})
		return () => {
			cancelled = true
		}
	}, [commandProjects.length, isCommandOpen, spaceStatus])

	return commandProjects
}

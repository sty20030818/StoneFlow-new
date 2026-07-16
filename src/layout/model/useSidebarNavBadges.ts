import { useMemo } from 'react'

import type { ShellSectionKey } from '@/layout/types'
import { useLifecycleEntriesQuery } from '@/features/lifecycle'
import { useProjectSidebarQuery } from '@/features/project'
import { useTaskListQuery } from '@/features/task'
import type { Scope } from '@/shared/types'

type NavBadges = Partial<Record<ShellSectionKey, string>>

/**
 * 侧栏角标：与列表页共用 React Query keys。
 * 数据随 mutation / workspace invalidate 自动刷新，不再直刷 api + 手写事件。
 */
export function useSidebarNavBadges(scope: Scope): NavBadges {
	const allTasks = useTaskListQuery({
		scope,
		viewKey: 'active',
		placement: { kind: 'all' },
	})
	const inboxTasks = useTaskListQuery({
		scope,
		viewKey: 'active',
		placement: { kind: 'inbox' },
	})
	const noProjectTasks = useTaskListQuery({
		scope,
		viewKey: 'active',
		placement: { kind: 'noProject' },
	})
	const archiveEntries = useLifecycleEntriesQuery('archive', scope)
	const trashEntries = useLifecycleEntriesQuery('trash', scope)
	const sidebarProjects = useProjectSidebarQuery(scope)

	return useMemo(() => {
		const next: NavBadges = {}
		const allCount = allTasks.data?.length ?? 0
		const inboxCount = inboxTasks.data?.length ?? 0
		const noProjectCount = noProjectTasks.data?.length ?? 0
		const projectCount = sidebarProjects.data?.length ?? 0
		const archiveCount = archiveEntries.data?.length ?? 0
		const trashCount = trashEntries.data?.length ?? 0

		if (allCount > 0) next.tasks = String(allCount)
		if (inboxCount > 0) next.inbox = String(inboxCount)
		if (noProjectCount > 0) next.noProject = String(noProjectCount)
		if (projectCount > 0) next.projects = String(projectCount)
		if (archiveCount > 0) next.archive = String(archiveCount)
		if (trashCount > 0) next.trash = String(trashCount)
		return next
	}, [
		allTasks.data,
		inboxTasks.data,
		noProjectTasks.data,
		sidebarProjects.data,
		archiveEntries.data,
		trashEntries.data,
	])
}

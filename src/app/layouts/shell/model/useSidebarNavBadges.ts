import { useCallback, useEffect, useState } from 'react'

import type { ShellSectionKey } from '@/app/layouts/shell/types'
import { listLifecycleEntries } from '@/features/lifecycle/api/lifecycle'
import { listSidebarProjects } from '@/features/project/api/projects'
import { listTasks } from '@/features/task/api/tasks'
import { useEventSubscription } from '@/shared/events'
import type { Scope } from '@/shared/types'

type NavBadges = Partial<Record<ShellSectionKey, string>>

export function useSidebarNavBadges(scope: Scope): NavBadges {
	const [badges, setBadges] = useState<NavBadges>({})

	const refresh = useCallback(async () => {
		try {
			const [allTasks, inboxItems, archiveItems, trashItems, projects] = await Promise.all([
				listTasks({ scope, viewKey: 'active', placement: { kind: 'all' } }),
				listTasks({ scope, viewKey: 'active', placement: { kind: 'inbox' } }),
				listLifecycleEntries({ mode: 'archive', scope, entityFilter: 'task' }),
				listLifecycleEntries({ mode: 'trash', scope, entityFilter: 'task' }),
				listSidebarProjects(scope),
			])

			const next: NavBadges = {}
			if (allTasks.length > 0) next.allTasks = String(allTasks.length)
			if (inboxItems.length > 0) next.inbox = String(inboxItems.length)
			if (projects.length > 0) next.projects = String(projects.length)
			if (archiveItems.length > 0) next.archive = String(archiveItems.length)
			if (trashItems.length > 0) next.trash = String(trashItems.length)
			setBadges(next)
		} catch {
			// ignore count errors silently
		}
	}, [scope])

	useEffect(() => {
		void refresh()
	}, [refresh])

	useEventSubscription('task:created', () => void refresh())
	useEventSubscription('task:updated', () => void refresh())
	useEventSubscription('task:deleted', () => void refresh())
	useEventSubscription('lifecycle:changed', () => void refresh())
	useEventSubscription('project:created', () => void refresh())
	useEventSubscription('project:updated', () => void refresh())
	useEventSubscription('project:deleted', () => void refresh())
	useEventSubscription('space:created', () => void refresh())
	useEventSubscription('space:updated', () => void refresh())
	useEventSubscription('space:deleted', () => void refresh())

	return badges
}

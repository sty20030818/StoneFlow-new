import { useCallback, useEffect, useRef, useState } from 'react'

import type { ShellSectionKey } from '@/app/layouts/shell/types'
import { listLifecycleEntries } from '@/features/lifecycle/api/lifecycle'
import { listSidebarProjects } from '@/features/project/api/projects'
import { listTasks } from '@/features/task/api/tasks'
import { useEventSubscription } from '@/shared/events'
import type { Scope } from '@/shared/types'

type NavBadges = Partial<Record<ShellSectionKey, string>>

const DEBOUNCE_MS = 200

export function useSidebarNavBadges(scope: Scope): NavBadges {
	const [badges, setBadges] = useState<NavBadges>({})
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	const doRefresh = useCallback(async () => {
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

	const scheduleRefresh = useCallback(() => {
		if (timerRef.current) {
			clearTimeout(timerRef.current)
		}
		timerRef.current = setTimeout(() => {
			timerRef.current = null
			void doRefresh()
		}, DEBOUNCE_MS)
	}, [doRefresh])

	useEffect(() => {
		void doRefresh()
		return () => {
			if (timerRef.current) {
				clearTimeout(timerRef.current)
			}
		}
	}, [doRefresh])

	useEventSubscription('task:created', scheduleRefresh)
	useEventSubscription('task:updated', scheduleRefresh)
	useEventSubscription('task:deleted', scheduleRefresh)
	useEventSubscription('lifecycle:changed', scheduleRefresh)
	useEventSubscription('project:created', scheduleRefresh)
	useEventSubscription('project:updated', scheduleRefresh)
	useEventSubscription('project:deleted', scheduleRefresh)
	useEventSubscription('space:created', scheduleRefresh)
	useEventSubscription('space:updated', scheduleRefresh)
	useEventSubscription('space:deleted', scheduleRefresh)

	return badges
}

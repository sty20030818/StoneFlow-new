import { useCallback, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import type { AppLayoutProps } from '@/layout/appLayoutTypes'
import { ShellLayoutContent } from '@/layout/ShellLayoutContent'
import { listLifecycleEntries } from '@/features/lifecycle'
import { listAllVisibleProjects } from '@/features/project'
import {
	BulkActionProvider,
	createLifecycleBulkAdapter,
	createProjectBulkAdapter,
	createTaskBulkAdapter,
	lifecycleBulkActions,
	projectBulkActions,
	taskBulkActions,
} from '@/features/bulk-action'
import { invalidateWorkspaceQueries } from '@/shared/query/invalidation'

export function ShellBulkActionBoundary({
	children,
	currentScope,
	currentSpaceId,
	activeSection,
	shellRoute,
}: AppLayoutProps) {
	const queryClient = useQueryClient()
	const refreshLoadedSlices = useCallback(
		() => invalidateWorkspaceQueries(queryClient),
		[queryClient],
	)
	const loadVisibleProjectIds = useCallback(async () => {
		const projects = await listAllVisibleProjects()
		return projects.map((project) => project.id)
	}, [])
	const loadLifecycleEntries = useCallback(async () => {
		const [archiveEntries, trashEntries] = await Promise.all([
			listLifecycleEntries({ mode: 'archive', scope: currentScope }),
			listLifecycleEntries({ mode: 'trash', scope: currentScope }),
		])
		return [...archiveEntries, ...trashEntries]
	}, [currentScope])
	const taskBulkAdapter = useMemo(
		() =>
			createTaskBulkAdapter({
				refreshLoadedSlices,
			}),
		[refreshLoadedSlices],
	)
	const lifecycleBulkAdapter = useMemo(
		() =>
			createLifecycleBulkAdapter({
				entries: loadLifecycleEntries,
				refreshLoadedSlices,
			}),
		[loadLifecycleEntries, refreshLoadedSlices],
	)
	const projectBulkAdapter = useMemo(
		() =>
			createProjectBulkAdapter({
				availableProjectIds: loadVisibleProjectIds,
				refreshLoadedSlices,
			}),
		[loadVisibleProjectIds, refreshLoadedSlices],
	)
	const bulkActionAdapter = useMemo(
		() => ({
			...taskBulkAdapter,
			...lifecycleBulkAdapter,
			...projectBulkAdapter,
		}),
		[lifecycleBulkAdapter, projectBulkAdapter, taskBulkAdapter],
	)
	const bulkActions = useMemo(
		() => [...taskBulkActions, ...lifecycleBulkActions, ...projectBulkActions],
		[],
	)

	return (
		<BulkActionProvider actions={bulkActions} context={{ adapter: bulkActionAdapter }}>
			<ShellLayoutContent
				activeSection={activeSection}
				currentScope={currentScope}
				currentSpaceId={currentSpaceId}
				shellRoute={shellRoute}
			>
				{children}
			</ShellLayoutContent>
		</BulkActionProvider>
	)
}

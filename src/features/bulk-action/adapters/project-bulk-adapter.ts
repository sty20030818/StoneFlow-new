import {
	archiveProject as archiveProjectApi,
	deleteProject as deleteProjectApi,
} from '@/features/project/api/projects'
import type { ProjectDetail } from '@/features/project/model/types'
import { emitEvent } from '@/shared/events'

export type ProjectBulkMutationReport = {
	requestedIds: string[]
	succeededIds: string[]
	failedIds: string[]
	skippedIds: string[]
}

export type ProjectBulkAdapter = {
	archiveProject: (ids: string[]) => Promise<ProjectBulkMutationReport>
	deleteProject: (ids: string[]) => Promise<ProjectBulkMutationReport>
}

type ProjectBulkAdapterOptions = {
	availableProjectIds: string[] | (() => Promise<string[]>)
	archiveProject?: typeof archiveProjectApi
	deleteProject?: typeof deleteProjectApi
	refreshLoadedSlices: () => Promise<void>
}

export function createProjectBulkAdapter({
	archiveProject = archiveProjectApi,
	availableProjectIds,
	deleteProject = deleteProjectApi,
	refreshLoadedSlices,
}: ProjectBulkAdapterOptions): ProjectBulkAdapter {
	async function resolveAvailableProjectIdSet() {
		const ids =
			typeof availableProjectIds === 'function' ? await availableProjectIds() : availableProjectIds
		return new Set(ids)
	}

	async function runProjectBulkMutation({
		ids,
		lifecycleOperation,
		mutate,
		projectEventType = 'project:updated',
	}: {
		ids: string[]
		mutate: (projectId: string) => Promise<ProjectDetail>
		projectEventType?: 'project:updated' | 'project:deleted'
		lifecycleOperation: 'archive' | 'delete'
	}): Promise<ProjectBulkMutationReport> {
		const succeededIds: string[] = []
		const failedIds: string[] = []
		const skippedIds: string[] = []
		const availableProjectIdSet = await resolveAvailableProjectIdSet()

		for (const projectId of ids) {
			if (!availableProjectIdSet.has(projectId)) {
				skippedIds.push(projectId)
				continue
			}

			try {
				const project = await mutate(projectId)
				succeededIds.push(projectId)
				emitEvent({ type: projectEventType, payload: { projectId: project.id } })
				emitEvent({
					type: 'lifecycle:changed',
					payload: {
						entityType: 'project',
						entityId: project.id,
						operation: lifecycleOperation,
					},
				})
			} catch {
				failedIds.push(projectId)
			}
		}

		if (succeededIds.length > 0) {
			await refreshLoadedSlices()
		}

		return {
			requestedIds: [...ids],
			succeededIds,
			failedIds,
			skippedIds,
		}
	}

	return {
		archiveProject: (ids) =>
			runProjectBulkMutation({
				ids,
				lifecycleOperation: 'archive',
				mutate: archiveProject,
			}),
		deleteProject: (ids) =>
			runProjectBulkMutation({
				ids,
				lifecycleOperation: 'delete',
				mutate: deleteProject,
				projectEventType: 'project:deleted',
			}),
	}
}

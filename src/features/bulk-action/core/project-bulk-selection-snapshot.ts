import type { ProjectOverviewItem } from '@/shared/types'

import type { BulkSelectionSource } from './bulk-action.types'
import { createBulkSelectionSnapshot } from './bulk-selection-snapshot'

export function createProjectBulkSelectionSnapshotFromProjects(
	projects: ProjectOverviewItem[],
	source: BulkSelectionSource,
) {
	return createBulkSelectionSnapshot({
		entity: 'project',
		ids: projects.map((project) => project.id),
		entities: projects.map((project) => ({
			id: project.id,
			title: project.name,
			subtitle: getProjectSubtitle(project),
		})),
		source,
	})
}

function getProjectSubtitle(project: ProjectOverviewItem) {
	if (project.archivedAt) {
		return project.spaceName ? `已归档项目 · ${project.spaceName}` : '已归档项目'
	}
	if (project.completedAt) {
		return project.spaceName ? `已完成项目 · ${project.spaceName}` : '已完成项目'
	}
	return project.spaceName ? `进行中项目 · ${project.spaceName}` : '进行中项目'
}

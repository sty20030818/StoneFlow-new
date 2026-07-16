import type { CommandSelectionContext } from '@/features/command'
import type { ProjectOverviewItem } from '@/shared/types'

import type { BulkSelectionSource } from './bulk-action.types'
import { createBulkSelectionSnapshot } from './bulk-selection-snapshot'

export function createProjectBulkSelectionSnapshot(
	selection: CommandSelectionContext,
	source: BulkSelectionSource,
) {
	const projectEntities = selection.entities.filter((entity) => entity.type === 'project')

	return createBulkSelectionSnapshot({
		entity: 'project',
		ids: projectEntities.map((entity) => entity.id),
		entities: projectEntities.map((entity) => ({
			id: entity.id,
			title: entity.title,
			subtitle: entity.subtitle,
		})),
		source,
	})
}

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

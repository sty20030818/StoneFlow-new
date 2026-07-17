import type { CommandSelectionContext } from '@/features/command'
import type { ProjectOverviewItem } from '@/shared/types'

type BuildProjectCommandSelectionInput = {
	selectedIds: string[]
	projects: ProjectOverviewItem[]
	clearSelection?: () => void
}

/** 将项目多选映射为命令菜单 selection 上下文。 */
export function buildProjectCommandSelection({
	selectedIds,
	projects,
	clearSelection,
}: BuildProjectCommandSelectionInput): CommandSelectionContext {
	const projectById = new Map(projects.map((project) => [project.id, project]))
	const entities = selectedIds.flatMap((projectId) => {
		const project = projectById.get(projectId)
		if (!project) {
			return []
		}

		return [
			{
				id: project.id,
				type: 'project' as const,
				title: project.name,
				subtitle: getProjectSubtitle(project),
				projectStatus: getProjectStatus(project),
			},
		]
	})
	const ids = entities.map((entity) => entity.id)
	const count = ids.length

	return {
		type: count > 0 ? 'project' : undefined,
		ids,
		entities,
		primaryEntity: entities[0],
		clearSelection,
		source: count > 0 ? 'project-list' : 'none',
		hasSelection: count > 0,
		isSingleSelection: count === 1,
		isMultiSelection: count > 1,
	}
}

function getProjectSubtitle(project: ProjectOverviewItem) {
	const statusLabel = getProjectStatusLabel(project)
	return project.spaceName ? `${statusLabel} · ${project.spaceName}` : statusLabel
}

function getProjectStatus(project: ProjectOverviewItem) {
	if (project.archivedAt) {
		return 'archived' as const
	}
	if (project.completedAt) {
		return 'completed' as const
	}
	return 'active' as const
}

function getProjectStatusLabel(project: ProjectOverviewItem) {
	switch (getProjectStatus(project)) {
		case 'archived':
			return '已归档项目'
		case 'completed':
			return '已完成项目'
		default:
			return '进行中项目'
	}
}

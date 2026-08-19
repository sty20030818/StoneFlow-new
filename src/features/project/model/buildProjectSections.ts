import type { ProjectOverviewItem } from '@/shared/types'

export type ProjectSectionKey = 'active' | 'completed' | 'archived'

export type ProjectSection = {
	key: ProjectSectionKey
	label: string
	items: ProjectOverviewItem[]
}

export const PROJECT_SECTION_ORDER: readonly ProjectSectionKey[] = [
	'active',
	'completed',
	'archived',
]

/** 项目状态只在领域投影层分组，Board 只负责渲染。 */
export function buildProjectSections(items: ProjectOverviewItem[]): ProjectSection[] {
	const grouped: Record<ProjectSectionKey, ProjectOverviewItem[]> = {
		active: [],
		completed: [],
		archived: [],
	}

	for (const project of items) {
		grouped[getProjectSectionKey(project)].push(project)
	}

	return PROJECT_SECTION_ORDER.map((key) => ({
		key,
		label: getProjectSectionLabel(key),
		items: grouped[key],
	}))
}

function getProjectSectionKey(project: ProjectOverviewItem): ProjectSectionKey {
	if (project.archivedAt) return 'archived'
	if (project.completedAt) return 'completed'
	return 'active'
}

function getProjectSectionLabel(key: ProjectSectionKey) {
	switch (key) {
		case 'completed':
			return '已完成项目'
		case 'archived':
			return '已归档项目'
		default:
			return '进行中项目'
	}
}

import type { LifecycleEntry, LifecycleMode, Scope } from '@/shared/types'

export type LifecycleEntityFilter = 'all' | 'space' | 'project' | 'task'
export type LifecycleSectionKey = Exclude<LifecycleEntityFilter, 'all'>
export type LifecycleSection = {
	key: LifecycleSectionKey
	label: string
	items: LifecycleEntry[]
}

export const LIFECYCLE_SECTION_ORDER: readonly LifecycleSectionKey[] = ['space', 'project', 'task']

/**
 * 按实体类型过滤并分组为看板 sections。
 */
export function buildLifecycleSections(
	entries: LifecycleEntry[],
	filter: LifecycleEntityFilter,
	mode: LifecycleMode,
	scope: Scope,
): LifecycleSection[] {
	const showSpace = scope.type === 'all'
	const filteredEntries = showSpace
		? entries
		: entries.filter((entry) => entry.entityType !== 'space')

	if (filter === 'space') {
		if (!showSpace) return []
		return [
			{
				key: 'space',
				label: mode === 'archive' ? '已归档的空间' : '已删除的空间',
				items: entries.filter((entry) => entry.entityType === 'space'),
			},
		]
	}

	if (filter === 'project') {
		return [
			{
				key: 'project',
				label: mode === 'archive' ? '已归档的项目' : '已删除的项目',
				items: filteredEntries.filter((entry) => entry.entityType === 'project'),
			},
		]
	}

	if (filter === 'task') {
		return [
			{
				key: 'task',
				label: mode === 'archive' ? '已归档的任务' : '已删除的任务',
				items: filteredEntries.filter((entry) => entry.entityType === 'task'),
			},
		]
	}

	const sections: LifecycleSection[] = []
	if (showSpace) {
		sections.push({
			key: 'space',
			label: mode === 'archive' ? '已归档的空间' : '已删除的空间',
			items: entries.filter((entry) => entry.entityType === 'space'),
		})
	}
	sections.push({
		key: 'project',
		label: mode === 'archive' ? '已归档的项目' : '已删除的项目',
		items: filteredEntries.filter((entry) => entry.entityType === 'project'),
	})
	sections.push({
		key: 'task',
		label: mode === 'archive' ? '已归档的任务' : '已删除的任务',
		items: filteredEntries.filter((entry) => entry.entityType === 'task'),
	})
	return sections
}

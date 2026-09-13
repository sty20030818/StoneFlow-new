import { formatTaskPriorityLabel, formatTaskStatusLabel } from '@/features/task/presentation'
import type { TaskQueryGroup, TaskQueryItem } from '@/shared/types'

import type { TaskDisplayLeafSection, TaskDisplaySection } from './task-display-types'

/** 按统一查询的组序合并已加载成员，不重新分类或排序。 */
export function buildTaskDisplaySections(items: TaskQueryItem[]): TaskDisplaySection[] {
	const sections = new Map<string, TaskDisplaySection>()
	const children = new Map<string, TaskDisplayLeafSection>()
	for (const task of items) {
		const descriptor = describeTaskQueryGroup(task.group)
		let section = sections.get(descriptor.key)
		if (!section) {
			section = { ...descriptor, tasks: [] }
			sections.set(descriptor.key, section)
		}
		section.tasks.push(task)
		if (task.subGroup.kind === 'none') continue
		const subDescriptor = describeTaskQueryGroup(task.subGroup)
		const key = JSON.stringify([descriptor.key, subDescriptor.key])
		let child = children.get(key)
		if (!child) {
			child = { ...subDescriptor, key, tasks: [] }
			children.set(key, child)
			;(section.children ??= []).push(child)
		}
		child.tasks.push(task)
	}
	return [...sections.values()]
}

function describeTaskQueryGroup(group: TaskQueryGroup): Omit<TaskDisplayLeafSection, 'tasks'> {
	switch (group.kind) {
		case 'none':
			return { key: 'all', label: '全部任务' }
		case 'status':
			return {
				key: `status:${group.status}`,
				label: formatTaskStatusLabel(group.status),
				status: group.status,
			}
		case 'priority':
			return { key: `priority:${group.priority}`, label: formatTaskPriorityLabel(group.priority) }
		case 'project':
			return group.projectId === null
				? { key: 'project:none', label: '独立事项' }
				: { key: `project:id:${group.projectId}`, label: group.projectName ?? '未命名项目' }
		case 'due':
		case 'scheduled':
			return { key: `${group.kind}:${group.bucket}`, label: DATE_BUCKET_LABELS[group.bucket] }
	}
}

const DATE_BUCKET_LABELS = {
	overdue: '已过期',
	today: '今天',
	tomorrow: '明天',
	'this-week': '本周剩余',
	later: '更晚',
	none: '未设置',
} as const

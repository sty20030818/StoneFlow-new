import { formatTaskPriorityLabel, formatTaskStatusLabel } from '@/features/task/presentation'
import type { TaskQueryGroup, TaskQueryGroupSummary, TaskQueryItem } from '@/shared/types'

import type { TaskDisplayLeafSection, TaskDisplaySection } from './task-display-types'

/** 摘要拥有候选和组序；窗口项只贡献已加载成员。 */
export function buildTaskDisplaySections(
	items: TaskQueryItem[],
	groupSummary: TaskQueryGroupSummary[] | null,
	showEmptyGroups: boolean,
): TaskDisplaySection[] {
	if (groupSummary === null) return []
	const members = new Map<string, TaskQueryItem[]>()
	for (const task of items) {
		const parentKey = describeTaskQueryGroup(task.group).key
		const keys = [parentKey]
		if (task.subGroup.kind !== 'none') {
			keys.push(JSON.stringify([parentKey, describeTaskQueryGroup(task.subGroup).key]))
		}
		for (const key of keys) {
			const tasks = members.get(key)
			if (tasks) tasks.push(task)
			else members.set(key, [task])
		}
	}

	const sections: TaskDisplaySection[] = []
	for (const summary of groupSummary) {
		const descriptor = describeTaskQueryGroup(summary.group)
		const tasks = members.get(descriptor.key) ?? []
		if (
			tasks.length === 0 &&
			!(showEmptyGroups && summary.group.kind !== 'none' && summary.totalCount === 0)
		)
			continue
		const section: TaskDisplaySection = { ...descriptor, totalCount: summary.totalCount, tasks }
		if (summary.subGroups.length > 0) {
			section.children = []
			for (const subSummary of summary.subGroups) {
				const child = describeTaskQueryGroup(subSummary.group)
				const key = JSON.stringify([descriptor.key, child.key])
				const childTasks = members.get(key) ?? []
				if (childTasks.length === 0 && !(showEmptyGroups && subSummary.totalCount === 0)) continue
				section.children.push({
					...child,
					key,
					totalCount: subSummary.totalCount,
					tasks: childTasks,
				})
			}
		}
		sections.push(section)
	}
	return sections
}

function describeTaskQueryGroup(
	group: TaskQueryGroup,
): Pick<TaskDisplayLeafSection, 'key' | 'label' | 'status'> {
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

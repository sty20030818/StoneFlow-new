import type { TaskListItem } from '@/shared/types'

/** 单次线性扫描建立任务身份索引，供同一 collection 的命令与预览共同复用。 */
export function indexTasksById(tasks: Iterable<TaskListItem>): ReadonlyMap<string, TaskListItem> {
	const taskById = new Map<string, TaskListItem>()
	for (const task of tasks) taskById.set(task.id, task)
	return taskById
}

export type ProjectTaskStatus = 'todo' | 'done'

export type ProjectRecord = {
	id: string
	parentProjectId: string | null
	name: string
	status: string
	sortOrder: number
	children: ProjectRecord[]
}

export type ProjectExecutionTask = {
	id: string
	title: string
	note: string | null
	priority: string
	status: ProjectTaskStatus
	tags?: string[]
	dueAt: string | null
	completedAt: string | null
	createdAt: string
	updatedAt: string
}

export type ProjectExecutionView = {
	project: ProjectRecord
	childProjects: ProjectRecord[]
	tasks: ProjectExecutionTask[]
}

/**
 * 将一层 Project 树压平，供 Command、Task 创建选择器等扁平入口使用。
 */
export function flattenProjectTree(projects: ProjectRecord[]) {
	return projects.flatMap((project) => [project, ...project.children])
}

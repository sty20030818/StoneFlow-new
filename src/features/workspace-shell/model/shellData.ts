import type { TaskPriorityValue } from '@/features/task/model/taskPriority'

export type ShellTaskStatus = 'todo' | 'done'
export type ShellFocusViewKey = 'today' | 'pinned' | 'recent'

export type ShellProjectRecord = {
	id: string
	name: string
	note: string
	status: 'active' | 'draft'
	parentProjectId: string | null
	sortOrder: number
}

export type ShellTaskRecord = {
	id: string
	title: string
	note: string | null
	priority: TaskPriorityValue
	status: ShellTaskStatus
	projectId: string | null
	projectName: string | null
	pinned: boolean
	dueLabel: string | null
	completedLabel: string | null
	createdLabel: string
	updatedLabel: string
	viewKeys: ShellFocusViewKey[]
}

export type ShellTrashEntry = {
	id: string
	entityType: 'task' | 'project'
	title: string
	deletedAt: string
	deletedFrom?: string
	restoreHint: string
}

export type ShellTaskResource = {
	id: string
	type: 'doc_link' | 'local_file' | 'local_folder'
	title: string
	target: string
}

export type ShellSearchTaskItem = {
	id: string
	title: string
	note: string | null
	priority: TaskPriorityValue
	projectName: string | null
}

export type ShellSearchProjectItem = {
	id: string
	name: string
	note: string | null
	status: string
}

export const SHELL_PROJECT_RECORDS: ShellProjectRecord[] = [
	{
		id: 'shell-project-stoneflow',
		name: 'StoneFlow VNext',
		note: '承接新的数据模型和阶段化重构方案。',
		status: 'active',
		parentProjectId: null,
		sortOrder: 0,
	},
	{
		id: 'shell-project-shell',
		name: 'Workspace shell',
		note: '只保留完整 UI 壳，不承载旧业务逻辑。',
		status: 'active',
		parentProjectId: 'shell-project-stoneflow',
		sortOrder: 1,
	},
	{
		id: 'shell-project-personal',
		name: 'Personal planning',
		note: '示例个人项目，用来保留导航和筛选 UI。',
		status: 'draft',
		parentProjectId: null,
		sortOrder: 2,
	},
]

export const SHELL_TASK_RECORDS: ShellTaskRecord[] = [
	{
		id: 'task-inbox-triage',
		title: '整理今天捕获的新任务',
		note: '保留 Inbox 的归类体验，但先停掉真实写库与分发规则。',
		priority: 'high',
		status: 'todo',
		projectId: null,
		projectName: null,
		pinned: true,
		dueLabel: 'Today',
		completedLabel: null,
		createdLabel: '今天 09:20',
		updatedLabel: '刚刚更新',
		viewKeys: ['today', 'pinned'],
	},
	{
		id: 'task-inbox-command',
		title: '把顶部搜索恢复成完整壳',
		note: '搜索结果、历史和创建入口都保留外观，但改成纯本地静态交互。',
		priority: 'medium',
		status: 'todo',
		projectId: 'shell-project-shell',
		projectName: 'Workspace shell',
		pinned: false,
		dueLabel: 'This week',
		completedLabel: null,
		createdLabel: '今天 10:05',
		updatedLabel: '5 分钟前',
		viewKeys: ['today', 'recent'],
	},
	{
		id: 'task-inbox-drawer',
		title: '让详情 Drawer 留住原来的编辑结构',
		note: '保留标题、描述、资源、状态等编辑区块，但不再连接旧任务详情链路。',
		priority: 'urgent',
		status: 'todo',
		projectId: 'shell-project-stoneflow',
		projectName: 'StoneFlow VNext',
		pinned: true,
		dueLabel: 'Today',
		completedLabel: null,
		createdLabel: '昨天 18:30',
		updatedLabel: '2 小时前',
		viewKeys: ['pinned', 'recent'],
	},
	{
		id: 'task-project-shell-board',
		title: '恢复 Project board 的任务分栏外观',
		note: 'Todo / Done 分组、折叠和底部多选条都继续保留。',
		priority: 'high',
		status: 'todo',
		projectId: 'shell-project-shell',
		projectName: 'Workspace shell',
		pinned: false,
		dueLabel: 'Tomorrow',
		completedLabel: null,
		createdLabel: '昨天 14:10',
		updatedLabel: '1 小时前',
		viewKeys: ['recent'],
	},
	{
		id: 'task-project-shell-polish',
		title: '整理 Sidebar 和 Header 的静态交互',
		note: '下拉、右键和历史入口都可以用本地状态驱动，不再走业务命令。',
		priority: 'low',
		status: 'done',
		projectId: 'shell-project-shell',
		projectName: 'Workspace shell',
		pinned: false,
		dueLabel: null,
		completedLabel: '今天完成',
		createdLabel: '前天 16:40',
		updatedLabel: '昨天 20:18',
		viewKeys: ['recent'],
	},
]

export const SHELL_TRASH_ENTRIES: ShellTrashEntry[] = [
	{
		id: 'trash-task-shell-copy',
		entityType: 'task',
		title: '旧 Focus 任务复制链路',
		deletedAt: '2026-04-29T10:20:00.000Z',
		deletedFrom: 'Views',
		restoreHint: '这里只保留回收站卡片和恢复按钮外观。',
	},
	{
		id: 'trash-project-legacy',
		entityType: 'project',
		title: 'Legacy project tree',
		deletedAt: '2026-04-28T19:05:00.000Z',
		deletedFrom: 'Projects',
		restoreHint: '后续阶段会重新接入新的项目模型与删除规则。',
	},
]

export const SHELL_TASK_RESOURCES: Record<string, ShellTaskResource[]> = {
	'task-inbox-triage': [
		{
			id: 'resource-triage-spec',
			type: 'doc_link',
			title: '阶段重构文档',
			target: 'StoneFlow 前置阶段B 业务全量清理与完整UI壳保留方案',
		},
	],
	'task-inbox-command': [
		{
			id: 'resource-command-notes',
			type: 'doc_link',
			title: 'Header 交互说明',
			target: '保留搜索、历史、新建与窗口操作壳层',
		},
	],
	'task-inbox-drawer': [
		{
			id: 'resource-drawer-folder',
			type: 'local_folder',
			title: 'Drawer assets',
			target: '/Users/sty/Desktop/StoneFlow-new/src/features/task-drawer',
		},
	],
}

export const SHELL_FOCUS_VIEWS: Array<{ key: ShellFocusViewKey; name: string }> = [
	{ key: 'today', name: 'Today' },
	{ key: 'pinned', name: 'Pinned' },
	{ key: 'recent', name: 'Recent' },
]

export function getShellProjectOptions() {
	return SHELL_PROJECT_RECORDS.map((project) => ({
		id: project.id,
		name: project.name,
	}))
}

export function getShellProjectTree() {
	return SHELL_PROJECT_RECORDS.filter((project) => project.parentProjectId === null)
		.sort((left, right) => left.sortOrder - right.sortOrder)
		.map((project) => ({
			id: project.id,
			name: project.name,
			status: project.status,
			parentProjectId: project.parentProjectId,
			sortOrder: project.sortOrder,
			children: SHELL_PROJECT_RECORDS.filter(
				(candidate) => candidate.parentProjectId === project.id,
			)
				.sort((left, right) => left.sortOrder - right.sortOrder)
				.map((childProject) => ({
					id: childProject.id,
					name: childProject.name,
					status: childProject.status,
					parentProjectId: childProject.parentProjectId,
					sortOrder: childProject.sortOrder,
					children: [],
				})),
		}))
}

export function getShellInboxTasks() {
	return SHELL_TASK_RECORDS.filter((task) =>
		['task-inbox-triage', 'task-inbox-command', 'task-inbox-drawer'].includes(task.id),
	)
}

export function getShellFocusTasks(viewKey: ShellFocusViewKey) {
	return SHELL_TASK_RECORDS.filter((task) => task.viewKeys.includes(viewKey))
}

export function getShellProjectTasks(projectId: string) {
	return SHELL_TASK_RECORDS.filter((task) => task.projectId === projectId)
}

export function getShellSearchResults(query: string) {
	const normalizedQuery = query.trim().toLowerCase()

	if (!normalizedQuery) {
		return {
			tasks: [] as ShellSearchTaskItem[],
			projects: [] as ShellSearchProjectItem[],
		}
	}

	const tasks = SHELL_TASK_RECORDS.filter((task) =>
		[task.title, task.note ?? '', task.projectName ?? ''].some((value) =>
			value.toLowerCase().includes(normalizedQuery),
		),
	).map((task) => ({
		id: task.id,
		title: task.title,
		note: task.note,
		priority: task.priority,
		projectName: task.projectName,
	}))

	const projects = SHELL_PROJECT_RECORDS.filter((project) =>
		[project.name, project.note].some((value) => value.toLowerCase().includes(normalizedQuery)),
	).map((project) => ({
		id: project.id,
		name: project.name,
		note: project.note,
		status: project.status,
	}))

	return { tasks, projects }
}

export function getShellTaskRecord(taskId: string) {
	return SHELL_TASK_RECORDS.find((task) => task.id === taskId) ?? null
}

export function getShellTaskResources(taskId: string) {
	return SHELL_TASK_RESOURCES[taskId] ?? []
}

import type {
	FocusViewKey,
	ProjectOverviewItem,
	SearchProjectItem,
	SearchTaskItem,
	Space,
	TaskResource,
	TaskView,
	TrashEntry,
} from '@/shared/types'

// Mock Space
export const MOCK_SPACE: Space = {
	id: 'a0000000-0000-0000-0000-000000000001',
	name: 'Product',
	iconKey: 'rocket',
	colorKey: 'blue',
	isDefault: true,
	sortOrder: 0,
	archivedAt: null,
	deletedAt: null,
	createdAt: '2026-04-01T00:00:00.000Z',
	updatedAt: '2026-04-30T00:00:00.000Z',
}

// Mock Project
export const MOCK_PROJECT: ProjectOverviewItem = {
	id: 'b0000000-0000-0000-0000-000000000001',
	spaceId: 'a0000000-0000-0000-0000-000000000001',
	name: 'StoneFlow V2 重构',
	description: '将 StoneFlow 从旧架构迁移到 Tauri v2 + React 19 + Tailwind v4 技术栈，完成核心功能闭环。',
	dueAt: '2026-05-15',
	sortOrder: 0,
	completedAt: null,
	archivedAt: null,
	deletedAt: null,
	createdAt: '2026-04-20T10:00:00.000Z',
	updatedAt: '2026-04-30T08:00:00.000Z',
	spaceName: 'Product',
	taskCount: 4,
	activeTaskCount: 3,
}

export const TASK_RECORDS: TaskView[] = [
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
	// StoneFlow V2 项目的任务
	{
		id: 'task-v2-sidebar',
		title: '完成 Sidebar 导航与 Space 切换',
		note: '确保 Sidebar 能正确显示 Space 列表，切换 Space 后 Project 列表联动更新。',
		priority: 'high',
		status: 'todo',
		projectId: 'b0000000-0000-0000-0000-000000000001',
		projectName: 'StoneFlow V2 重构',
		pinned: true,
		dueLabel: 'Tomorrow',
		completedLabel: null,
		createdLabel: '2026-04-25T09:00:00.000Z',
		updatedLabel: '2026-04-30T06:00:00.000Z',
		viewKeys: ['today', 'pinned'],
	},
	{
		id: 'task-v2-project-crud',
		title: '落地 Project CRUD 全链路',
		note: '创建、编辑、完成、重开、归档、删除，全部接通 Tauri IPC。',
		priority: 'urgent',
		status: 'todo',
		projectId: 'b0000000-0000-0000-0000-000000000001',
		projectName: 'StoneFlow V2 重构',
		pinned: true,
		dueLabel: 'Today',
		completedLabel: null,
		createdLabel: '2026-04-26T14:30:00.000Z',
		updatedLabel: '2026-04-30T07:30:00.000Z',
		viewKeys: ['today', 'pinned', 'recent'],
	},
	{
		id: 'task-v2-task-board',
		title: 'Project 内任务看板接入 mock 数据',
		note: 'Todo / Done 分组，折叠，优先级/状态选择器，右键菜单。',
		priority: 'medium',
		status: 'todo',
		projectId: 'b0000000-0000-0000-0000-000000000001',
		projectName: 'StoneFlow V2 重构',
		pinned: false,
		dueLabel: 'This week',
		completedLabel: null,
		createdLabel: '2026-04-28T10:15:00.000Z',
		updatedLabel: '2026-04-30T07:00:00.000Z',
		viewKeys: ['recent'],
	},
	{
		id: 'task-v2-drawer',
		title: 'Task Drawer 详情面板',
		note: '标题、描述、优先级、状态、资源链接，全部保留原有编辑结构。',
		priority: 'high',
		status: 'done',
		projectId: 'b0000000-0000-0000-0000-000000000001',
		projectName: 'StoneFlow V2 重构',
		pinned: false,
		dueLabel: null,
		completedLabel: '2026-04-30T03:00:00.000Z',
		createdLabel: '2026-04-22T16:00:00.000Z',
		updatedLabel: '2026-04-30T03:20:00.000Z',
		viewKeys: ['recent'],
	},
]

export const TRASH_ENTRIES: TrashEntry[] = [
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

export const TASK_RESOURCES: Record<string, TaskResource[]> = {
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

export const FOCUS_VIEWS: Array<{ key: FocusViewKey; name: string }> = [
	{ key: 'today', name: 'Today' },
	{ key: 'pinned', name: 'Pinned' },
	{ key: 'recent', name: 'Recent' },
]

export function getInboxTasks() {
	return TASK_RECORDS.filter((task) =>
		['task-inbox-triage', 'task-inbox-command', 'task-inbox-drawer'].includes(task.id),
	)
}

export function getFocusTasks(viewKey: FocusViewKey) {
	return TASK_RECORDS.filter((task) => task.viewKeys.includes(viewKey))
}

export function getSearchResults(query: string) {
	const normalizedQuery = query.trim().toLowerCase()

	if (!normalizedQuery) {
		return {
			tasks: [] as SearchTaskItem[],
			projects: [] as SearchProjectItem[],
		}
	}

	const tasks = TASK_RECORDS.filter((task) =>
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

	const projects: SearchProjectItem[] = []

	return { tasks, projects }
}

export function getTaskRecord(taskId: string) {
	return TASK_RECORDS.find((task) => task.id === taskId) ?? null
}

export function getTaskResources(taskId: string) {
	return TASK_RESOURCES[taskId] ?? []
}

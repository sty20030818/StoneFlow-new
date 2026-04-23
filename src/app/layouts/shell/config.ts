import type { ComponentType } from 'react'

import type { ShellDrawerKind, ShellSectionKey } from '@/app/layouts/shell/types'
import type { BadgeVariant } from '@/shared/ui/base/badge'
import {
	BriefcaseBusinessIcon,
	FolderOpenDotIcon,
	GraduationCapIcon,
	HouseIcon,
	InboxIcon,
	Layers3Icon,
	SparklesIcon,
	TargetIcon,
	Trash2Icon,
} from 'lucide-react'

type ShellIcon = ComponentType<{ className?: string }>

type ShellNavItem = {
	key: ShellSectionKey
	label: string
	icon: ShellIcon
	to: (spaceId: string) => string
}

export type ShellProjectLink = {
	id: string
	label: string
	badge?: string
	children?: ShellProjectLink[]
}

type ShellSpace = {
	id: string
	label: string
	icon: ShellIcon
	iconClassName: string
	iconBadgeClassName: string
}

type DrawerDetailBadge = {
	label: string
	variant?: BadgeVariant
}

type DrawerDetailSection = {
	title: string
	items: Array<{
		label: string
		value: string
	}>
}

export type DrawerDetail = {
	kind: ShellDrawerKind
	eyebrow: string
	title: string
	description: string
	icon: ShellIcon
	badges: DrawerDetailBadge[]
	sections: DrawerDetailSection[]
}

export const SHELL_SPACES: ShellSpace[] = [
	{
		id: 'work',
		label: '工作',
		icon: BriefcaseBusinessIcon,
		iconClassName: 'text-[#5e6ad2]',
		iconBadgeClassName: 'bg-[#5e6ad2]',
	},
	{
		id: 'studio',
		label: '学习',
		icon: GraduationCapIcon,
		iconClassName: 'text-[#e58a00]',
		iconBadgeClassName: 'bg-[#e58a00]',
	},
	{
		id: 'life',
		label: '生活',
		icon: HouseIcon,
		iconClassName: 'text-[#2da44e]',
		iconBadgeClassName: 'bg-[#2da44e]',
	},
]

export const SHELL_NAV_ITEMS: ShellNavItem[] = [
	{
		key: 'inbox',
		label: 'Inbox',
		icon: InboxIcon,
		to: (spaceId) => `/space/${spaceId}/inbox`,
	},
	{
		key: 'focus',
		label: 'Views',
		icon: TargetIcon,
		to: (spaceId) => `/space/${spaceId}/focus`,
	},
	{
		key: 'trash',
		label: 'Trash',
		icon: Trash2Icon,
		to: (spaceId) => `/space/${spaceId}/trash`,
	},
]

export function resolveShellSection(pathname: string): ShellSectionKey {
	if (pathname.includes('/focus')) {
		return 'focus'
	}

	if (pathname.includes('/project/')) {
		return 'project'
	}

	if (pathname.includes('/trash')) {
		return 'trash'
	}

	if (pathname.includes('/settings')) {
		return 'settings'
	}

	return 'inbox'
}

export function getSectionLabel(section: ShellSectionKey) {
	switch (section) {
		case 'inbox':
			return 'Inbox'
		case 'focus':
			return 'Views'
		case 'project':
			return 'Projects'
		case 'trash':
			return 'Trash'
		case 'settings':
			return 'Settings'
		default:
			return 'Workspace'
	}
}

export function getSpaceLabel(spaceId: string) {
	return SHELL_SPACES.find((item) => item.id === spaceId)?.label ?? spaceId
}

export function getProjectSectionPath(spaceId: string, projectId?: string | null) {
	return projectId ? `/space/${spaceId}/project/${projectId}` : `/space/${spaceId}/inbox`
}

const taskDetails: Record<string, DrawerDetail> = {
	'task-inbox-triage': {
		kind: 'task',
		eyebrow: 'Task',
		title: '整理今天捕获的新任务',
		description: 'Inbox 的目标是快速补齐上下文，再把任务送到真正的工作区里。',
		icon: InboxIcon,
		badges: [
			{ label: 'Inbox' },
			{ label: 'P1', variant: 'outline' },
			{ label: 'Today', variant: 'secondary' },
		],
		sections: [
			{
				title: '执行上下文',
				items: [
					{ label: '所属 Space', value: '工作' },
					{ label: '下一步动作', value: '补齐优先级、项目和处理时段' },
				],
			},
			{
				title: '当前判断',
				items: [
					{ label: '处理目标', value: '让任务尽快离开 Inbox' },
					{ label: '当前阶段', value: '只验证静态壳层与详情结构' },
				],
			},
		],
	},
	'task-inbox-command': {
		kind: 'task',
		eyebrow: 'Task',
		title: '把全局入口收回 Header',
		description: '搜索、跳转与快速创建都由顶部 Header 承接，不再拆成额外条带。',
		icon: SparklesIcon,
		badges: [
			{ label: 'Header' },
			{ label: 'P2', variant: 'outline' },
			{ label: 'This Week', variant: 'secondary' },
		],
		sections: [
			{
				title: '入口约束',
				items: [
					{ label: '主要入口', value: '搜索栏 + New task' },
					{ label: '触发方式', value: '点击或 Cmd/Ctrl + K' },
				],
			},
			{
				title: '当前范围',
				items: [
					{ label: '已验证', value: '跳转与详情打开' },
					{ label: '后续承接', value: 'M2 再接真实搜索与创建' },
				],
			},
		],
	},
	'task-inbox-drawer': {
		kind: 'task',
		eyebrow: 'Task',
		title: '验证覆盖式 Drawer',
		description: '详情从右侧覆盖进入，不挤压 Main，也不做独立页面跳转。',
		icon: Layers3Icon,
		badges: [
			{ label: 'Drawer' },
			{ label: 'P2', variant: 'outline' },
			{ label: 'Static', variant: 'secondary' },
		],
		sections: [
			{
				title: '布局约束',
				items: [
					{ label: '打开方式', value: '右侧覆盖进入' },
					{ label: '主内容区', value: '保持可见，不发生重排' },
				],
			},
			{
				title: '详情分区',
				items: [
					{ label: '摘要区', value: '标题、优先级、上下文' },
					{ label: '内容区', value: '资源、动作、历史与备注' },
				],
			},
		],
	},
	'task-focus-deep-work': {
		kind: 'task',
		eyebrow: 'Task',
		title: '收口 M1-C 的壳层密度',
		description: 'Focus 是高密度工作台，不是另一套产品页面。',
		icon: TargetIcon,
		badges: [
			{ label: 'Focus' },
			{ label: 'P1', variant: 'outline' },
			{ label: 'Now', variant: 'secondary' },
		],
		sections: [
			{
				title: '执行视图',
				items: [
					{ label: '当前分组', value: 'Focus' },
					{ label: '视图目标', value: '只保留立即需要处理的内容' },
				],
			},
			{
				title: '验收目标',
				items: [
					{ label: '主要判断', value: '结构顺手、密度克制、桌面感稳定' },
					{ label: '后续承接', value: 'M2 再接真实数据' },
				],
			},
		],
	},
	'task-focus-upcoming': {
		kind: 'task',
		eyebrow: 'Task',
		title: '为 Upcoming 留出时间视图',
		description: 'Upcoming 应该按时间逼近顺序表达，而不是复制普通列表页。',
		icon: TargetIcon,
		badges: [
			{ label: 'Upcoming' },
			{ label: 'P2', variant: 'outline' },
			{ label: 'Plan', variant: 'secondary' },
		],
		sections: [
			{
				title: '页面语义',
				items: [
					{ label: '排序原则', value: '按时间，而不是按项目' },
					{ label: '交互目标', value: '快速知道接下来该做什么' },
				],
			},
			{
				title: '静态阶段',
				items: [
					{ label: '当前内容', value: '只展示布局骨架与上下文' },
					{ label: '数据来源', value: '后续由本地数据查询驱动' },
				],
			},
		],
	},
	'task-focus-review': {
		kind: 'task',
		eyebrow: 'Task',
		title: '保留完成回看入口',
		description: '最近添加与高优先级都属于 Focus 的内部切片，不必再拆更多路由。',
		icon: TargetIcon,
		badges: [
			{ label: 'Review' },
			{ label: 'P3', variant: 'outline' },
			{ label: 'Later', variant: 'secondary' },
		],
		sections: [
			{
				title: '结构判断',
				items: [
					{ label: '页面角色', value: 'Focus 内部切片' },
					{ label: '路由策略', value: '保持局部 tabs，不扩更多 URL' },
				],
			},
			{
				title: '设计约束',
				items: [
					{ label: '信息密度', value: '高密度但不做网页后台卡片墙' },
					{ label: '状态表达', value: '轻量、克制、可快速扫描' },
				],
			},
		],
	},
	'task-project-shell-refactor': {
		kind: 'task',
		eyebrow: 'Task',
		title: '重组 Header / Sidebar / Footer',
		description: '这轮要验证的是整窗框架，而不是再拼更多局部组件。',
		icon: FolderOpenDotIcon,
		badges: [
			{ label: 'Layout' },
			{ label: 'P1', variant: 'outline' },
			{ label: 'Shell', variant: 'secondary' },
		],
		sections: [
			{
				title: '核心部件',
				items: [
					{ label: '顶部', value: 'Header 承接搜索、新建与窗口控制' },
					{ label: '底部', value: 'Footer 收口状态、Trash 与设置' },
				],
			},
			{
				title: '验收目标',
				items: [
					{ label: '结构', value: '形成完整桌面框架闭环' },
					{ label: '视觉', value: '更像桌面软件，而不是网页后台' },
				],
			},
		],
	},
	'task-project-sidebar-polish': {
		kind: 'task',
		eyebrow: 'Task',
		title: '把 Sidebar 做成连续导航带',
		description: 'Sidebar 要与 Header、Footer 的左区形成连续关系，而不是独立浮块。',
		icon: FolderOpenDotIcon,
		badges: [
			{ label: 'Sidebar' },
			{ label: 'P2', variant: 'outline' },
			{ label: 'Nav', variant: 'secondary' },
		],
		sections: [
			{
				title: '结构约束',
				items: [
					{ label: '上接 Header', value: '左区宽度严格对齐' },
					{ label: '下接 Footer', value: '左下角承接状态与次级动作' },
				],
			},
			{
				title: '内容结构',
				items: [
					{ label: '一级', value: 'Spaces + 主导航' },
					{ label: '二级', value: 'Projects' },
				],
			},
		],
	},
	'task-project-drawer-sections': {
		kind: 'task',
		eyebrow: 'Task',
		title: '把 Drawer 的分区做清楚',
		description: 'Drawer 应该是轻量、精密、默认覆盖式的详情层。',
		icon: FolderOpenDotIcon,
		badges: [
			{ label: 'Drawer' },
			{ label: 'P2', variant: 'outline' },
			{ label: 'Sections', variant: 'secondary' },
		],
		sections: [
			{
				title: '主要分区',
				items: [
					{ label: '摘要', value: '标题、状态、优先级、上下文' },
					{ label: '内容', value: '资源、动作、历史与元信息' },
				],
			},
			{
				title: '交互原则',
				items: [
					{ label: '打开反馈', value: '短促、干净、轻遮罩' },
					{ label: '布局原则', value: '默认覆盖，不挤压 Main' },
				],
			},
		],
	},
	'task-trash-appframe': {
		kind: 'task',
		eyebrow: 'Task',
		title: '清理旧壳层命名',
		description: '这一轮的目标是把早期壳层命名清掉，回到更自然的 layout 语义。',
		icon: Trash2Icon,
		badges: [
			{ label: 'Cleanup' },
			{ label: 'P2', variant: 'outline' },
			{ label: 'Copy', variant: 'secondary' },
		],
		sections: [
			{
				title: '需要替换的内容',
				items: [
					{ label: '旧语气', value: 'Desktop 前缀与共享壳层目录' },
					{ label: '新语气', value: 'Shell Layout / Header / Footer / Drawer' },
				],
			},
			{
				title: '影响范围',
				items: [
					{ label: '组件', value: '布局系统与四个主页面' },
					{ label: '结果', value: '主结构开始更像产品本身' },
				],
			},
		],
	},
	'task-command-capture': {
		kind: 'task',
		eyebrow: 'Task',
		title: '从 Header 的搜索栏进入静态草稿',
		description: '这一条用于验证 Header 与 Drawer 的最小闭环。',
		icon: SparklesIcon,
		badges: [
			{ label: 'Header' },
			{ label: 'P1', variant: 'outline' },
			{ label: 'Preview', variant: 'secondary' },
		],
		sections: [
			{
				title: '入口链路',
				items: [
					{ label: '触发', value: '点击搜索栏或 Cmd/Ctrl + K' },
					{ label: '结果', value: '统一打开同一个 Command 面板' },
				],
			},
			{
				title: '本阶段目标',
				items: [
					{ label: '验证点', value: 'Header -> Drawer 的静态闭环' },
					{ label: '限制', value: '不接真实创建与搜索' },
				],
			},
		],
	},
}

const projectDetails: Record<string, DrawerDetail> = {
	'stoneflow-v1': {
		kind: 'project',
		eyebrow: 'Project',
		title: 'StoneFlow V1',
		description: 'V1 目标是做成可长期自用的本地优先个人执行系统。',
		icon: FolderOpenDotIcon,
		badges: [
			{ label: 'Active', variant: 'primary' },
			{ label: '6 tasks', variant: 'outline' },
			{ label: 'Current Milestone', variant: 'secondary' },
		],
		sections: [
			{
				title: '项目摘要',
				items: [
					{ label: '当前阶段', value: 'M1-C · App Shell 与路由静态骨架' },
					{ label: '状态', value: '进行中' },
				],
			},
			{
				title: '执行上下文',
				items: [
					{ label: '下一个里程碑', value: 'M1-D · Rust 数据底座与迁移基础设施' },
					{ label: '当前重点', value: '先让整窗框架真正稳定下来' },
				],
			},
		],
	},
	'product-design': {
		kind: 'project',
		eyebrow: 'Project',
		title: '产品设计',
		description: '承接产品结构、交互和界面表达的主设计项目。',
		icon: Layers3Icon,
		badges: [
			{ label: 'Design', variant: 'secondary' },
			{ label: 'Active', variant: 'primary' },
		],
		sections: [
			{
				title: '当前关注',
				items: [
					{ label: '重点', value: '壳层结构与布局关系' },
					{ label: '当前产出', value: '主框架 HTML 稿与布局调整' },
				],
			},
		],
	},
	engineering: {
		kind: 'project',
		eyebrow: 'Project',
		title: '工程开发',
		description: '承接前端架构、Tauri 壳层和本地数据底座实现。',
		icon: FolderOpenDotIcon,
		badges: [
			{ label: 'Code', variant: 'secondary' },
			{ label: 'Active', variant: 'primary' },
		],
		sections: [
			{
				title: '当前关注',
				items: [
					{ label: '重点', value: 'layout 目录归位与窗口框架重构' },
					{ label: '下一步', value: '补齐最终桌面验证' },
				],
			},
		],
	},
}

export function getDrawerDetail(
	kind: ShellDrawerKind | null,
	id: string | null,
): DrawerDetail | null {
	if (!kind || !id) {
		return null
	}

	if (kind === 'task') {
		return taskDetails[id] ?? null
	}

	return projectDetails[id] ?? null
}

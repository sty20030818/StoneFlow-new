import {
	BoxIcon,
	FolderIcon,
	InboxIcon,
	Layers2Icon,
	ListTodoIcon,
	Settings2Icon,
	TargetIcon,
	Trash2Icon,
} from 'lucide-react'

import { getSectionLabel } from '@/app/layouts/shell/config'
import type { ShellRoute } from '@/app/navigation/shellRoute'
import { openProjectDetail, openSection } from '@/app/navigation/intents'
import { resolveShellRouteScope } from '@/app/navigation/scope'
import type { ShellSectionKey } from '@/app/navigation/shellRoute'
import type { ProjectDetail } from '@/features/project/model/types'
import type { TaskDetail } from '@/shared/types'
import type { BreadcrumbNode } from '@/shared/ui/AppBreadcrumb'

type BreadcrumbContext = {
	route: ShellRoute
	projectDetail?: Pick<ProjectDetail, 'id' | 'name'> | null
	taskDetail?: Pick<TaskDetail, 'id' | 'title' | 'projectId' | 'projectName' | 'inboxAt'> | null
	viewName?: string | null
}

const SECTION_BREADCRUMB_PRESETS = {
	inbox: {
		key: 'inbox',
		label: '收件箱',
		icon: InboxIcon,
	},
	tasks: {
		key: 'tasks',
		label: '所有任务',
		icon: ListTodoIcon,
	},
	projects: {
		key: 'projects',
		label: '项目总览',
		icon: BoxIcon,
	},
	noProject: {
		key: 'no-project',
		label: '独立事项',
		icon: TargetIcon,
	},
	archive: {
		key: 'archive',
		icon: BoxIcon,
	},
	trash: {
		key: 'trash',
		icon: Trash2Icon,
	},
	views: {
		key: 'views',
		icon: Layers2Icon,
	},
	settings: {
		key: 'settings',
		label: '设置',
		icon: Settings2Icon,
	},
} as const

export function resolveBreadcrumb({
	projectDetail,
	route,
	taskDetail,
	viewName,
}: BreadcrumbContext): BreadcrumbNode[] {
	switch (route.kind) {
		case 'shell-section':
			return [toSectionBreadcrumb(route.section, route)]
		case 'view':
			return resolveViewBreadcrumb(route, viewName)
		case 'project':
			return resolveProjectBreadcrumb(route, projectDetail)
		case 'task':
			return resolveTaskBreadcrumb(route, taskDetail)
		default:
			return []
	}
}

function resolveViewBreadcrumb(route: ShellRoute, viewName?: string | null): BreadcrumbNode[] {
	const root = {
		...toSectionBreadcrumb('views', route),
		current: !viewName,
	}

	if (!route.viewId || !viewName) {
		return [root]
	}

	return [
		root,
		{
			key: `view:${route.viewId}`,
			label: viewName,
			current: true,
			truncate: true,
		},
	]
}

function resolveProjectBreadcrumb(
	route: ShellRoute,
	projectDetail?: Pick<ProjectDetail, 'id' | 'name'> | null,
): BreadcrumbNode[] {
	const projectId = projectDetail?.id ?? route.projectId ?? 'unknown-project'

	return [
		{
			...toSectionBreadcrumb('projects', route),
			current: false,
			to: openSection(resolveRouteScope(route), 'projects', route.spaceId),
		},
		{
			key: `project:${projectId}`,
			label: projectDetail?.name?.trim() || '项目详情',
			icon: FolderIcon,
			current: true,
			truncate: true,
		},
	]
}

function resolveTaskBreadcrumb(
	route: ShellRoute,
	taskDetail?: Pick<TaskDetail, 'id' | 'title' | 'projectId' | 'projectName' | 'inboxAt'> | null,
): BreadcrumbNode[] {
	const taskId = taskDetail?.id ?? route.taskId ?? 'unknown-task'
	const taskLabel = taskDetail?.title?.trim() || '任务详情'
	const scope = resolveRouteScope(route)

	if (taskDetail?.projectId) {
		return [
			{
				...toSectionBreadcrumb('projects', route),
				current: false,
				to: openSection(scope, 'projects', route.spaceId),
			},
			{
				key: `project:${taskDetail.projectId}`,
				label: taskDetail.projectName?.trim() || '项目详情',
				icon: FolderIcon,
				to: openProjectDetail(taskDetail.projectId, {
					scope,
					fallbackSpaceId: route.spaceId,
				}),
				truncate: true,
			},
			{
				key: `task:${taskId}`,
				label: taskLabel,
				icon: ListTodoIcon,
				current: true,
				truncate: true,
			},
		]
	}

	if (taskDetail?.inboxAt) {
		return [
			{
				...toSectionBreadcrumb('inbox', route),
				current: false,
				to: openSection(scope, 'inbox', route.spaceId),
			},
			{
				key: `task:${taskId}`,
				label: taskLabel,
				icon: ListTodoIcon,
				current: true,
				truncate: true,
			},
		]
	}

	return [
		{
			...toSectionBreadcrumb('noProject', route),
			current: false,
			to: openSection(scope, 'no-project', route.spaceId),
		},
		{
			key: `task:${taskId}`,
			label: taskLabel,
			icon: ListTodoIcon,
			current: true,
			truncate: true,
		},
	]
}

function toSectionBreadcrumb(
	section: ShellSectionKey,
	route: Pick<ShellRoute, 'scope' | 'spaceId'>,
): BreadcrumbNode {
	const preset = SECTION_BREADCRUMB_PRESETS[section]
	return {
		key: preset.key,
		label: getSectionLabel(section),
		icon: preset.icon,
		current: true,
		to: openSection(resolveRouteScope(route), normalizeSectionTarget(section), route.spaceId),
	}
}

function resolveRouteScope(route: Pick<ShellRoute, 'scope' | 'spaceId'>) {
	return resolveShellRouteScope(route)
}

function normalizeSectionTarget(
	section: ShellSectionKey,
): 'inbox' | 'tasks' | 'views' | 'projects' | 'archive' | 'trash' | 'settings' | 'no-project' {
	return section === 'noProject' ? 'no-project' : section
}

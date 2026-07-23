// CommandMenu 纯函数辅助逻辑（占位文案、筛选元数据、任务放置分组、图标解析等）。

import {
	ArrowRightIcon,
	CheckCircle2Icon,
	CompassIcon,
	CommandIcon,
	FolderIcon,
	FolderOpenIcon,
	FolderPlusIcon,
	LayoutGridIcon,
	ListTodoIcon,
	PanelLeftIcon,
	PlusIcon,
	SearchIcon,
	SquarePlusIcon,
	Trash2Icon,
	type LucideProps,
} from 'lucide-react'
import type { ComponentType, ReactNode } from 'react'

import {
	buildTaskPlacementGroups,
	getTaskPlacementTargetValue,
	resolveTaskPlacementTarget,
	type TaskPlacementGroup,
} from '@/features/metadata-fields'
import type { PageDateFilterValue, PageFilterKind } from '@/features/filter'
import type { CommandContext, CommandId } from '@/features/command/core'
import type { SearchProjectItem, Space } from '@/shared/types'

import { getCommandMenuPlacementLeading } from './command-menu-option-visuals'
import { isCommandMenuTaskPropertyMode, type CommandMenuMode } from './command-menu-types'
import type { CommandMenuProject } from './CommandMenu'

export type CommandRowSelectionIndicator = 'checked' | 'mixed' | null

export function getCommandMenuPlaceholder(mode: CommandMenuMode, filterKind: PageFilterKind) {
	switch (mode) {
		case 'task-picker':
			return '搜索任务…'
		case 'project-picker':
			return '搜索项目…'
		case 'task-placement-picker':
			return '移动到项目或独立事项...'
		case 'task-priority-picker':
			return '选择优先级…'
		case 'task-status-picker':
			return '选择状态…'
		case 'task-date-picker':
			return '选择截止时间…'
		case 'filter-picker':
			return getFilterPickerPlaceholder(mode, filterKind)
		default:
			return '输入命令 或 搜索 …'
	}
}

export function getCommandMenuEmptyText(mode: CommandMenuMode, query: string) {
	if (mode === 'filter-picker') {
		return query.trim() ? '没有匹配的筛选项' : '没有可用筛选项'
	}

	if (isCommandMenuTaskPropertyMode(mode)) {
		return '没有可用选项'
	}

	if (!query.trim()) {
		return mode === 'task-picker'
			? '输入关键词搜索任务'
			: mode === 'project-picker' || mode === 'task-placement-picker'
				? '输入关键词搜索项目'
				: '没有可用命令'
	}

	return mode === 'task-picker'
		? '没有匹配的任务'
		: mode === 'project-picker' || mode === 'task-placement-picker'
			? '没有匹配的项目'
			: '没有匹配的命令'
}

export function getSelectedTaskPrioritys(context: CommandContext) {
	const values = new Set<string>()
	for (const entity of context.selection.entities) {
		if (entity.type === 'task' && entity.priority != null) {
			values.add(String(entity.priority))
		}
	}
	return values
}

export function getSelectedTaskStatusValues(context: CommandContext) {
	const values = new Set<string>()
	for (const entity of context.selection.entities) {
		if (entity.type === 'task' && entity.status) {
			values.add(entity.status)
		}
	}
	return values
}

export function getSelectedTaskPlacementValues(context: CommandContext) {
	const values = new Set<string>()
	for (const entity of context.selection.entities) {
		if (entity.type !== 'task') {
			continue
		}

		if (!entity.spaceId) {
			continue
		}

		values.add(
			getTaskPlacementTargetValue(
				resolveTaskPlacementTarget({
					spaceId: entity.spaceId,
					projectId: entity.projectId,
					
				}),
			),
		)
	}
	return values
}

export function getSelectionIndicatorForValue(
	values: Set<string>,
	value: string,
): CommandRowSelectionIndicator {
	if (!values.has(value)) {
		return null
	}
	return values.size === 1 ? 'checked' : 'mixed'
}

export function getFilterPickerPlaceholder(mode: CommandMenuMode, filterKind: PageFilterKind) {
	if (mode !== 'filter-picker') {
		return '输入命令 或 搜索 …'
	}

	switch (filterKind) {
		case 'priority':
			return '筛选优先级…'
		case 'status':
			return '筛选状态…'
		case 'date':
			return '筛选截止时间…'
		case 'project':
			return '搜索项目筛选…'
		default:
			return '选择筛选维度…'
	}
}

export function getFilterDateOptions(): Array<{ label: string; value: PageDateFilterValue }> {
	return [
		{ label: '不过滤截止时间', value: 'none' },
		{ label: '今天', value: 'today' },
		{ label: '明天', value: 'tomorrow' },
		{ label: '本周', value: 'thisWeek' },
		{ label: '已逾期', value: 'overdue' },
		{ label: '有截止时间', value: 'hasDate' },
		{ label: '无截止时间', value: 'noDate' },
	]
}

export function formatPriorityMeta(context: CommandContext) {
	return context.view.priorityFilterValues.length > 0
		? `已选 P${context.view.priorityFilterValues.join(', P')}`
		: '未筛选'
}

export function formatStatusMeta(context: CommandContext) {
	return context.view.statusFilterValues.length > 0
		? `已选 ${context.view.statusFilterValues.join(' / ')}`
		: '未筛选'
}

export function formatDateMeta(context: CommandContext) {
	return context.view.dateFilterValue === 'none' ? '未筛选' : context.view.dateFilterValue
}

export function formatProjectMeta(context: CommandContext, projects: CommandMenuProject[]) {
	if (!context.view.projectFilterId) {
		return context.view.standaloneOnly ? '仅独立事项' : '未筛选'
	}

	const project = projects.find((item) => item.id === context.view.projectFilterId)
	return project?.label ?? '已选项目'
}

export function resolveTaskPlacementCurrentSpaceId(context: CommandContext) {
	if (context.space.currentSpaceId) {
		return context.space.currentSpaceId
	}

	// 合并 filter + map + filter 为单次遍历
	const selectionSpaceIds = new Set<string>()
	for (const entity of context.selection.entities) {
		if (entity.type === 'task' && entity.spaceId) {
			selectionSpaceIds.add(entity.spaceId)
		}
	}

	return selectionSpaceIds.size === 1 ? (Array.from(selectionSpaceIds)[0] ?? null) : null
}

export type CommandTaskPlacementGroup = TaskPlacementGroup & {
	items: Array<
		TaskPlacementGroup['items'][number] & {
			leading: ReactNode
		}
	>
}

export function buildCommandTaskPlacementGroups({
	context,
	projects,
	spaces,
}: {
	context: CommandContext
	projects: SearchProjectItem[]
	spaces: Space[]
}): CommandTaskPlacementGroup[] {
	return buildTaskPlacementGroups({
		mode: 'global',
		currentSpaceId: resolveTaskPlacementCurrentSpaceId(context),
		spaces,
		projects,
	}).map(
		(group): CommandTaskPlacementGroup => ({
			...group,
			items: group.items.map((item) => ({
				...item,
				leading: getCommandMenuPlacementLeading(item.target.kind),
			})),
		}),
	)
}

export function resolveCommandIcon(commandId: CommandId): ComponentType<LucideProps> {
	if (commandId.startsWith('new.')) {
		if (commandId.includes('project')) {
			return FolderPlusIcon
		}
		if (commandId.includes('view')) {
			return SquarePlusIcon
		}
		return PlusIcon
	}

	if (commandId.startsWith('navigation.')) {
		if (commandId.includes('project')) {
			return LayoutGridIcon
		}
		if (commandId.includes('settings')) {
			return CommandIcon
		}
		return ArrowRightIcon
	}

	if (commandId.startsWith('open.')) {
		if (commandId.includes('project')) {
			return FolderOpenIcon
		}
		if (commandId.includes('space')) {
			return CompassIcon
		}
		return SearchIcon
	}

	if (commandId.startsWith('task.')) {
		if (commandId.includes('complete')) {
			return CheckCircle2Icon
		}
		return ListTodoIcon
	}

	if (commandId.startsWith('project.')) {
		return FolderIcon
	}

	if (commandId.startsWith('layout.')) {
		return PanelLeftIcon
	}

	if (commandId.startsWith('system.')) {
		return CommandIcon
	}

	if (commandId === 'general.close') {
		return Trash2Icon
	}

	return CommandIcon
}

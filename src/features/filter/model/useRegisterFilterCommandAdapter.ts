/**
 * 将 ListFilterSession + Display.showCompleted 注册为命令宿主可读的页筛选 controller。
 * 投影仅保留：是否有筛选、完成可见、toggle/clear 能力；打开菜单写回 FilterQuery 真源。
 */
import { useMemo } from 'react'

import type { TaskPriority, TaskStatus } from '@/shared/types'

import {
	FILTER_PROJECT_NONE_VALUE,
	isFilterQueryEmpty,
	normalizeFilterQuery,
	type FilterQuery,
} from '../core'
import { emitFilterUiEvent } from './filterUiEvents'
import type { PageFilterController } from './PageFilterProvider'
import { useRegisterPageFilterController } from './PageFilterProvider'
import type { ListFilterSession } from './useListFilterSession'

export type RegisterFilterCommandAdapterInput = {
	session: ListFilterSession
	showCompleted: boolean
	onToggleCompleted: () => void
}

/**
 * 从 effective FilterQuery 派生命令/工具条所需的扁平投影（只读）。
 * 列表 pills 等 UI 可复用；不构成第二套状态真源。
 */
export function filterQueryToCommandProjection(query: FilterQuery): {
	priorityValues: TaskPriority[]
	statusValues: TaskStatus[]
	dateValue: string
	projectId: string | null
	standaloneOnly: boolean
} {
	const normalized = normalizeFilterQuery(query)
	const status = normalized.clauses.find((c) => c.field === 'status' && c.op === 'is')
	const priority = normalized.clauses.find((c) => c.field === 'priority' && c.op === 'is')
	const due = normalized.clauses.find((c) => c.field === 'due' && c.op === 'is')
	const project = normalized.clauses.find((c) => c.field === 'project' && c.op === 'is')

	const projectValues = project?.values ?? []
	const standaloneOnly = projectValues.includes(FILTER_PROJECT_NONE_VALUE)
	const projectId =
		!standaloneOnly && projectValues[0] && projectValues[0] !== FILTER_PROJECT_NONE_VALUE
			? projectValues[0]
			: null

	return {
		statusValues: (status?.values ?? []).filter(isTaskStatus),
		priorityValues: (priority?.values ?? [])
			.map(Number)
			.filter((n): n is TaskPriority => n >= 0 && n <= 4) as TaskPriority[],
		dateValue: due?.values[0] ?? 'none',
		projectId,
		standaloneOnly,
	}
}

function isTaskStatus(value: string): value is TaskStatus {
	return (
		value === 'todo' ||
		value === 'doing' ||
		value === 'waiting' ||
		value === 'done' ||
		value === 'canceled'
	)
}

export function useRegisterFilterCommandAdapter(input: RegisterFilterCommandAdapterInput) {
	const { session, showCompleted, onToggleCompleted } = input

	const controller = useMemo<PageFilterController>(() => {
		const hasActiveFilters = !isFilterQueryEmpty(session.effective) || session.dirty
		return {
			state: {
				hasActiveFilters,
				showCompleted,
			},
			capabilities: {
				supportsToggleCompleted: true,
				supportsClearAll: true,
			},
			actions: {
				openFilterMenu: () => {
					emitFilterUiEvent({ type: 'open-menu' })
				},
				toggleCompleted: onToggleCompleted,
				clearAll: () => {
					session.clearTemp()
				},
			},
		}
	}, [onToggleCompleted, session, showCompleted])

	useRegisterPageFilterController(controller)
}

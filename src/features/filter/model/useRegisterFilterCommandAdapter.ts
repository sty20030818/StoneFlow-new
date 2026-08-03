/**
 * 将 ListFilterSession + Display.showCompleted 注册为命令宿主可读的页筛选 controller。
 * 命令板元数据与 clear/toggle 走 FilterQuery 真源，不再维护独立扁平筛选状态。
 */
import { useMemo } from 'react'

import type { ProjectOption } from '@/features/project'
import type { TaskPriority, TaskStatus } from '@/shared/types'

import {
	createFilterClause,
	isFilterQueryEmpty,
	normalizeFilterQuery,
	type FilterField,
	type FilterQuery,
} from '../core'
import type { PageFilterApplyInput, PageFilterController, PageFilterKind } from './PageFilterProvider'
import { useRegisterPageFilterController } from './PageFilterProvider'
import type { ListFilterSession } from './useListFilterSession'

export type RegisterFilterCommandAdapterInput = {
	session: ListFilterSession
	showCompleted: boolean
	onToggleCompleted: () => void
	supportsProject: boolean
	projects?: ProjectOption[]
	/** 当前命令菜单筛选维度（壳层维护） */
	currentFilterKind?: PageFilterKind
}

/**
 * 从 effective FilterQuery 派生命令上下文所需的扁平投影（只读展示）。
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
	const standaloneOnly = projectValues.includes('__none__')
	const projectId =
		!standaloneOnly && projectValues[0] && projectValues[0] !== '__none__'
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

function setFieldClause(
	query: FilterQuery,
	field: FilterField,
	op: 'is' | 'is_not',
	values: string[],
): FilterQuery {
	const rest = query.clauses.filter((c) => c.field !== field)
	if (values.length === 0) {
		return normalizeFilterQuery({ clauses: rest })
	}
	return normalizeFilterQuery({
		clauses: [...rest, createFilterClause(field, op, values)],
	})
}

function applyInputToQuery(query: FilterQuery, input: PageFilterApplyInput): FilterQuery {
	switch (input.kind) {
		case 'priority':
			return setFieldClause(
				query,
				'priority',
				'is',
				input.values.map((v) => String(v)),
			)
		case 'status':
			return setFieldClause(query, 'status', 'is', input.values)
		case 'date':
			return input.value === 'none'
				? setFieldClause(query, 'due', 'is', [])
				: setFieldClause(query, 'due', 'is', [input.value])
		case 'project':
			return input.projectId
				? setFieldClause(query, 'project', 'is', [input.projectId])
				: setFieldClause(query, 'project', 'is', [])
		case 'standaloneOnly':
			return input.enabled
				? setFieldClause(query, 'project', 'is', ['__none__'])
				: setFieldClause(query, 'project', 'is', [])
		case 'showCompleted':
			// 完成可见性在 Display；此处忽略，由 onToggleCompleted 处理
			return query
		default:
			return query
	}
}

export function useRegisterFilterCommandAdapter(input: RegisterFilterCommandAdapterInput) {
	const {
		session,
		showCompleted,
		onToggleCompleted,
		supportsProject,
		projects = [],
		currentFilterKind = 'root',
	} = input

	const projection = useMemo(
		() => filterQueryToCommandProjection(session.effective),
		[session.effective],
	)

	const controller = useMemo<PageFilterController>(() => {
		const hasActiveFilters = !isFilterQueryEmpty(session.effective) || session.dirty
		return {
			state: {
				priorityValues: projection.priorityValues,
				statusValues: projection.statusValues,
				dateValue: projection.dateValue as PageFilterController['state']['dateValue'],
				projectId: projection.projectId,
				standaloneOnly: projection.standaloneOnly,
				showCompleted,
				hasActiveFilters,
			},
			capabilities: {
				supportsPriority: true,
				supportsStatus: true,
				supportsDate: true,
				supportsProject,
				supportsToggleCompleted: true,
				supportsClearAll: true,
			},
			currentFilterKind,
			availableProjects: supportsProject ? projects : [],
			actions: {
				openFilterPicker: () => {
					// 打开菜单由 emitFilterUiEvent / PageFilterButton 处理
				},
				applyFilter: (applyInput) => {
					if (applyInput.kind === 'showCompleted') {
						onToggleCompleted()
						return
					}
					const next = applyInputToQuery(session.effective, applyInput)
					session.replaceEffective(next)
				},
				toggleCompleted: onToggleCompleted,
				clearAll: () => {
					// 只清临时筛选；View 定义 base 由重新进入 View 恢复
					session.clearTemp()
				},
			},
		}
	}, [
		currentFilterKind,
		onToggleCompleted,
		projection,
		projects,
		session,
		showCompleted,
		supportsProject,
	])

	useRegisterPageFilterController(controller)
}

import { useCallback, useMemo, useState } from 'react'

import {
	hasTaskDate,
	isTaskCompleted,
	resolveTaskDateValue,
	type PageDateFilterValue,
	type PageFilterCapabilities,
	type PageFilterController,
	type PageFilterKind,
} from '@/features/filter'
import type { ProjectOption } from '@/features/project'
import type { TaskListItem, TaskStatus } from '@/shared/types'

import type { TaskPriorityValue } from '../model/taskPriority'

// 模块级空数组常量，避免调用方未传 projects 时每次渲染都创建新的默认值引用
const EMPTY_PROJECTS: ProjectOption[] = []

/** 已由 list/view 查询下推的字段，客户端 matches 跳过，避免与 totalCount 双滤 */
export type TaskPageServerDrivenFilter =
	| 'status'
	| 'showCompleted'
	| 'standalone'
	| 'project'
	| 'priority'
	| 'date'

type UseTaskPageFilterControllerOptions = {
	tasks: TaskListItem[]
	projects?: ProjectOption[]
	capabilities: PageFilterCapabilities
	initialStandaloneOnly?: boolean
	initialFilterKind?: PageFilterKind
	initialShowCompleted?: boolean
	/** 服务端已保证的过滤；客户端不再套用 */
	serverDrivenFilters?: readonly TaskPageServerDrivenFilter[]
}

export function useTaskPageFilterController({
	tasks,
	projects = EMPTY_PROJECTS,
	capabilities,
	initialStandaloneOnly = false,
	initialFilterKind = 'root',
	initialShowCompleted = true,
	serverDrivenFilters = [],
}: UseTaskPageFilterControllerOptions) {
	const serverDriven = useMemo(() => new Set(serverDrivenFilters), [serverDrivenFilters])
	const [priorityValues, setPriorityValues] = useState<TaskPriorityValue[]>([])
	const [statusValues, setStatusValues] = useState<TaskStatus[]>([])
	const [dateValue, setDateValue] = useState<PageDateFilterValue>('none')
	const [projectId, setProjectId] = useState<string | null>(null)
	const [standaloneOnly, setStandaloneOnly] = useState(initialStandaloneOnly)
	const [showCompleted, setShowCompleted] = useState(initialShowCompleted)
	const [currentFilterKind, setCurrentFilterKind] = useState<PageFilterKind>(initialFilterKind)

	const filteredTasks = useMemo(() => {
		const today = startOfLocalDay(new Date())
		const tomorrow = addLocalDays(today, 1)
		const endOfWeek = getEndOfLocalWeek(today)
		// 用 Set 承载筛选值，避免循环内重复 array.includes 扫描
		const priorityValueSet = new Set(priorityValues)
		const statusValueSet = new Set(statusValues)

		function matchesFilters(task: TaskListItem) {
			if (!serverDriven.has('showCompleted') && !showCompleted && isTaskCompleted(task.status)) {
				return false
			}

			if (!serverDriven.has('standalone') && standaloneOnly && task.projectId !== null) {
				return false
			}

			if (!serverDriven.has('project') && projectId && task.projectId !== projectId) {
				return false
			}

			if (
				!serverDriven.has('priority') &&
				priorityValueSet.size > 0 &&
				!priorityValueSet.has(task.priority)
			) {
				return false
			}

			if (
				!serverDriven.has('status') &&
				statusValueSet.size > 0 &&
				!statusValueSet.has(task.status)
			) {
				return false
			}

			if (serverDriven.has('date') || dateValue === 'none') {
				return true
			}

			if (dateValue === 'hasDate') {
				return hasTaskDate(task)
			}

			if (dateValue === 'noDate') {
				return !hasTaskDate(task)
			}

			const rawDate = resolveTaskDateValue(task)
			if (!rawDate) {
				return false
			}

			const targetDate = startOfLocalDay(new Date(rawDate))
			if (Number.isNaN(targetDate.getTime())) {
				return false
			}

			switch (dateValue) {
				case 'today':
					return isSameLocalDay(targetDate, today)
				case 'tomorrow':
					return isSameLocalDay(targetDate, tomorrow)
				case 'thisWeek':
					return targetDate >= today && targetDate <= endOfWeek
				case 'overdue':
					return targetDate < today
				default:
					return true
			}
		}

		// 合并两次 filter 为单次遍历
		const result: TaskListItem[] = []
		for (const task of tasks) {
			if (task.archivedAt === null && matchesFilters(task)) {
				result.push(task)
			}
		}
		return result
	}, [
		dateValue,
		priorityValues,
		projectId,
		serverDriven,
		standaloneOnly,
		showCompleted,
		statusValues,
		tasks,
	])

	const hasActiveFilters =
		priorityValues.length > 0 ||
		statusValues.length > 0 ||
		dateValue !== 'none' ||
		projectId !== null ||
		standaloneOnly ||
		!showCompleted

	const clearAll = useCallback(() => {
		setPriorityValues([])
		setStatusValues([])
		setDateValue('none')
		setProjectId(null)
		setStandaloneOnly(initialStandaloneOnly)
		setShowCompleted(initialShowCompleted)
		setCurrentFilterKind('root')
	}, [initialStandaloneOnly, initialShowCompleted])

	const controller = useMemo<PageFilterController>(
		() => ({
			state: {
				priorityValues,
				statusValues,
				dateValue,
				projectId,
				standaloneOnly,
				showCompleted,
				hasActiveFilters,
			},
			capabilities,
			currentFilterKind,
			availableProjects: capabilities.supportsProject ? projects : [],
			actions: {
				openFilterPicker: (kind = 'root') => {
					setCurrentFilterKind(kind)
				},
				applyFilter: (input) => {
					switch (input.kind) {
						case 'priority':
							setPriorityValues(input.values)
							break
						case 'status':
							setStatusValues(input.values)
							break
						case 'date':
							setDateValue(input.value)
							break
						case 'project':
							setProjectId(input.projectId)
							break
						case 'standaloneOnly':
							setStandaloneOnly(input.enabled)
							break
						case 'showCompleted':
							setShowCompleted(input.value)
							break
					}
				},
				toggleCompleted: () => {
					setShowCompleted((current) => !current)
				},
				clearAll,
			},
		}),
		[
			capabilities,
			clearAll,
			currentFilterKind,
			dateValue,
			hasActiveFilters,
			priorityValues,
			projectId,
			standaloneOnly,
			projects,
			showCompleted,
			statusValues,
		],
	)

	return {
		controller,
		filteredTasks,
	}
}

function startOfLocalDay(date: Date) {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function addLocalDays(date: Date, days: number) {
	const next = new Date(date)
	next.setDate(next.getDate() + days)
	return next
}

function getEndOfLocalWeek(date: Date) {
	const day = date.getDay()
	const daysUntilSunday = (7 - day) % 7
	return addLocalDays(date, daysUntilSunday)
}

function isSameLocalDay(left: Date, right: Date) {
	return (
		left.getFullYear() === right.getFullYear() &&
		left.getMonth() === right.getMonth() &&
		left.getDate() === right.getDate()
	)
}

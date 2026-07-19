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

type UseTaskPageFilterControllerOptions = {
	tasks: TaskListItem[]
	projects?: ProjectOption[]
	capabilities: PageFilterCapabilities
	initialProjectlessOnly?: boolean
	initialFilterKind?: PageFilterKind
	initialShowCompleted?: boolean
}

export function useTaskPageFilterController({
	tasks,
	projects = EMPTY_PROJECTS,
	capabilities,
	initialProjectlessOnly = false,
	initialFilterKind = 'root',
	initialShowCompleted = true,
}: UseTaskPageFilterControllerOptions) {
	const [priorityValues, setPriorityValues] = useState<TaskPriorityValue[]>([])
	const [statusValues, setStatusValues] = useState<TaskStatus[]>([])
	const [dateValue, setDateValue] = useState<PageDateFilterValue>('none')
	const [projectId, setProjectId] = useState<string | null>(null)
	const [projectlessOnly, setProjectlessOnly] = useState(initialProjectlessOnly)
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
			if (!showCompleted && isTaskCompleted(task.status)) {
				return false
			}

			if (projectlessOnly && task.projectId !== null) {
				return false
			}

			if (projectId && task.projectId !== projectId) {
				return false
			}

			if (priorityValueSet.size > 0 && !priorityValueSet.has(task.priority)) {
				return false
			}

			if (statusValueSet.size > 0 && !statusValueSet.has(task.status)) {
				return false
			}

			if (dateValue === 'none') {
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
	}, [dateValue, priorityValues, projectId, projectlessOnly, showCompleted, statusValues, tasks])

	const hasActiveFilters =
		priorityValues.length > 0 ||
		statusValues.length > 0 ||
		dateValue !== 'none' ||
		projectId !== null ||
		projectlessOnly ||
		!showCompleted

	const clearAll = useCallback(() => {
		setPriorityValues([])
		setStatusValues([])
		setDateValue('none')
		setProjectId(null)
		setProjectlessOnly(initialProjectlessOnly)
		setShowCompleted(initialShowCompleted)
		setCurrentFilterKind('root')
	}, [initialProjectlessOnly, initialShowCompleted])

	const controller = useMemo<PageFilterController>(
		() => ({
			state: {
				priorityValues,
				statusValues,
				dateValue,
				projectId,
				projectlessOnly,
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
						case 'projectlessOnly':
							setProjectlessOnly(input.enabled)
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
			projectlessOnly,
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

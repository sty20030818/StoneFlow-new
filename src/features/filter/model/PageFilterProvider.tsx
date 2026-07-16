import {
	createContext,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
	type PropsWithChildren,
} from 'react'

import type { ProjectOption } from '@/features/project/model/types'
import type { TaskPriorityValue } from '@/features/task'
import type { TaskListItem, TaskStatus } from '@/shared/types'

export type PageFilterKind = 'root' | 'priority' | 'status' | 'date' | 'project'

export type PageDateFilterValue =
	| 'none'
	| 'today'
	| 'tomorrow'
	| 'thisWeek'
	| 'overdue'
	| 'hasDate'
	| 'noDate'

export type PageFilterState = {
	priorityValues: TaskPriorityValue[]
	statusValues: TaskStatus[]
	dateValue: PageDateFilterValue
	projectId: string | null
	projectlessOnly: boolean
	showCompleted: boolean
	hasActiveFilters: boolean
}

export type PageFilterCapabilities = {
	supportsPriority: boolean
	supportsStatus: boolean
	supportsDate: boolean
	supportsProject: boolean
	supportsToggleCompleted: boolean
	supportsClearAll: boolean
}

export type PageFilterApplyInput =
	| { kind: 'priority'; values: TaskPriorityValue[] }
	| { kind: 'status'; values: TaskStatus[] }
	| { kind: 'date'; value: PageDateFilterValue }
	| { kind: 'project'; projectId: string | null }
	| { kind: 'projectlessOnly'; enabled: boolean }
	| { kind: 'showCompleted'; value: boolean }

export type PageFilterController = {
	state: PageFilterState
	capabilities: PageFilterCapabilities
	currentFilterKind: PageFilterKind
	availableProjects: ProjectOption[]
	actions: {
		openFilterPicker: (kind?: PageFilterKind) => void
		applyFilter: (input: PageFilterApplyInput) => void
		toggleCompleted: () => void
		clearAll: () => void
	}
}

const EMPTY_CAPABILITIES: PageFilterCapabilities = {
	supportsPriority: false,
	supportsStatus: false,
	supportsDate: false,
	supportsProject: false,
	supportsToggleCompleted: false,
	supportsClearAll: false,
}

const EMPTY_STATE: PageFilterState = {
	priorityValues: [],
	statusValues: [],
	dateValue: 'none',
	projectId: null,
	projectlessOnly: false,
	showCompleted: true,
	hasActiveFilters: false,
}

const EMPTY_CONTROLLER: PageFilterController = {
	state: EMPTY_STATE,
	capabilities: EMPTY_CAPABILITIES,
	currentFilterKind: 'root',
	availableProjects: [],
	actions: {
		openFilterPicker: () => {},
		applyFilter: () => {},
		toggleCompleted: () => {},
		clearAll: () => {},
	},
}

type PageFilterRegistration = PageFilterController

type PageFilterActions = {
	registerController: (token: symbol, controller: PageFilterRegistration) => void
	clearControllerRegistration: (token: symbol) => void
}

const PageFilterStateContext = createContext<PageFilterController | null>(null)
const PageFilterActionsContext = createContext<PageFilterActions | null>(null)

export function PageFilterProvider({ children }: PropsWithChildren) {
	const [controller, setController] = useState<PageFilterController>(EMPTY_CONTROLLER)
	const activeTokenRef = useRef<symbol | null>(null)

	const actions = useMemo<PageFilterActions>(
		() => ({
			registerController: (token, nextController) => {
				activeTokenRef.current = token
				setController(nextController)
			},
			clearControllerRegistration: (token) => {
				if (activeTokenRef.current !== token) {
					return
				}

				activeTokenRef.current = null
				setController(EMPTY_CONTROLLER)
			},
		}),
		[],
	)

	return (
		<PageFilterActionsContext.Provider value={actions}>
			<PageFilterStateContext.Provider value={controller}>
				{children}
			</PageFilterStateContext.Provider>
		</PageFilterActionsContext.Provider>
	)
}

export function usePageFilterContext() {
	return useContext(PageFilterStateContext) ?? EMPTY_CONTROLLER
}

export function useRegisterPageFilterController(controller: PageFilterRegistration) {
	const actions = useContext(PageFilterActionsContext)
	const tokenRef = useRef<symbol | null>(null)

	if (!tokenRef.current) {
		tokenRef.current = Symbol('page-filter-registration')
	}

	useEffect(() => {
		if (!actions) {
			return
		}

		const token = tokenRef.current!
		actions.registerController(token, controller)
		return () => {
			actions.clearControllerRegistration(token)
		}
	}, [actions, controller])
}

export function isTaskCompleted(status: TaskStatus) {
	return status === 'done' || status === 'canceled'
}

export function hasTaskDate(task: TaskListItem) {
	return Boolean(task.dueAt || task.scheduledAt || task.reminderAt)
}

export function resolveTaskDateValue(task: TaskListItem) {
	return task.dueAt ?? task.scheduledAt ?? task.reminderAt
}

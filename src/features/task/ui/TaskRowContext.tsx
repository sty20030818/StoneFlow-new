import { createContext, useContext } from 'react'

import type { TaskPriorityValue } from '@/features/task/model/taskPriority'
import type { TaskListItem, TaskStatus } from '@/shared/types'

/**
 * TaskRow 共享上下文，消除 TaskBoard → Section → Row 的逐层 props drilling。
 * 拆分为 state（只读）和 actions（回调）两部分，便于按需订阅。
 */
type TaskRowContextState = {
	activeTaskId: string | null
	pendingTaskId: string | null
	selectedTaskIdSet: Set<string>
	projectOptions?: Array<{ id: string; name: string }>
}

type TaskRowContextActions = {
	onToggleTaskSelection: (taskId: string) => void
	onUpdateTaskPriority: (task: TaskListItem, priority: TaskPriorityValue) => Promise<void>
	onUpdateTaskStatus: (task: TaskListItem, status: TaskStatus) => Promise<void>
	onToggleTaskStatus: (task: TaskListItem) => Promise<void>
	onArchiveTask?: (task: TaskListItem) => Promise<void>
	onDeleteTask?: (task: TaskListItem) => Promise<void>
	onOpenTask: (taskId: string) => void
	onSelectProject?: (task: TaskListItem, projectId: string) => void
	onSelectNoProject?: (task: TaskListItem) => void
}

type TaskRowContextValue = TaskRowContextState & TaskRowContextActions

const TaskRowContext = createContext<TaskRowContextValue | null>(null)

export function TaskRowProvider({
	children,
	value,
}: {
	children: React.ReactNode
	value: TaskRowContextValue
}) {
	return <TaskRowContext.Provider value={value}>{children}</TaskRowContext.Provider>
}

export function useTaskRowContext() {
	const ctx = useContext(TaskRowContext)
	if (!ctx) {
		throw new Error('useTaskRowContext must be used within TaskRowProvider')
	}
	return ctx
}

export type { TaskRowContextValue, TaskRowContextState, TaskRowContextActions }

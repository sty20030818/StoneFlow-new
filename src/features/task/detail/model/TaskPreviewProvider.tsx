import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
	type PropsWithChildren,
} from 'react'

import { listTaskLinks } from '@/features/task/api/taskLinks'
import type { TaskListItem, TaskLink } from '@/shared/types'

export type TaskPreviewAnchorReason = 'keyboard' | 'pointer'
type TaskPreviewCloseDelayState = 'idle' | 'pending'

type TaskPreviewSource = {
	tasks: TaskListItem[]
	focusedTaskId: string | null
	activeTaskId: string | null
}

type TaskPreviewLinkSummary = {
	items: Array<Pick<TaskLink, 'id' | 'title'>>
	remainingCount: number
}

type TaskPreviewState = {
	open: boolean
	targetTaskId: string | null
	closeDelayState: TaskPreviewCloseDelayState
	lastAnchorReason: TaskPreviewAnchorReason | null
	hoveredTaskId: string | null
	hoverSource: TaskPreviewAnchorReason | null
	isPointerInsidePreview: boolean
	linkSummary: TaskPreviewLinkSummary | null
}

type TaskPreviewContextValue = {
	state: TaskPreviewState
	source: TaskPreviewSource | null
	openPreview: (taskId: string, source: TaskPreviewAnchorReason) => void
	closePreview: () => void
	scheduleClosePreview: () => void
	cancelScheduledClose: () => void
	syncPreviewTarget: (taskId: string, source: TaskPreviewAnchorReason) => void
	setHoveredTask: (taskId: string | null, source: TaskPreviewAnchorReason | null) => void
	setPreviewPointerInside: (inside: boolean) => void
	registerSource: (token: symbol, source: TaskPreviewSource) => void
	clearSourceRegistration: (token: symbol) => void
}

const TASK_PREVIEW_CLOSE_DELAY_MS = 180
const TASK_PREVIEW_LINK_SUMMARY_LIMIT = 3

const TaskPreviewContext = createContext<TaskPreviewContextValue | null>(null)

export function TaskPreviewProvider({ children }: PropsWithChildren) {
	const [state, setState] = useState<TaskPreviewState>({
		open: false,
		targetTaskId: null,
		closeDelayState: 'idle',
		lastAnchorReason: null,
		hoveredTaskId: null,
		hoverSource: null,
		isPointerInsidePreview: false,
		linkSummary: null,
	})
	const [source, setSource] = useState<TaskPreviewSource | null>(null)
	const closeTimerRef = useRef<number | null>(null)
	const activeSourceTokenRef = useRef<symbol | null>(null)

	const cancelScheduledClose = useCallback(() => {
		if (closeTimerRef.current !== null) {
			window.clearTimeout(closeTimerRef.current)
			closeTimerRef.current = null
		}
		setState((current) =>
			current.closeDelayState === 'idle'
				? current
				: {
						...current,
						closeDelayState: 'idle',
				  },
		)
	}, [])

	const closePreview = useCallback(() => {
		if (closeTimerRef.current !== null) {
			window.clearTimeout(closeTimerRef.current)
			closeTimerRef.current = null
		}
		setState((current) => {
			if (
				!current.open &&
				current.targetTaskId === null &&
				current.closeDelayState === 'idle' &&
				current.lastAnchorReason === null &&
				current.linkSummary === null
			) {
				return current
			}

			return {
				...current,
				open: false,
				targetTaskId: null,
				closeDelayState: 'idle',
				lastAnchorReason: null,
				linkSummary: null,
			}
		})
	}, [])

	const openPreview = useCallback(
		(taskId: string, source: TaskPreviewAnchorReason) => {
			cancelScheduledClose()
			setState((current) => {
				if (current.open && current.targetTaskId === taskId) {
					return {
						...current,
						open: false,
						targetTaskId: null,
						closeDelayState: 'idle',
						lastAnchorReason: null,
						linkSummary: null,
					}
				}

				return {
					...current,
					open: true,
					targetTaskId: taskId,
					closeDelayState: 'idle',
					lastAnchorReason: source,
					linkSummary: null,
				}
			})
		},
		[cancelScheduledClose],
	)

	const scheduleClosePreview = useCallback(() => {
		setState((current) => {
			if (!current.open || current.closeDelayState === 'pending' || current.isPointerInsidePreview) {
				return current
			}

			return {
				...current,
				closeDelayState: 'pending',
			}
		})

		if (closeTimerRef.current !== null) {
			return
		}

		closeTimerRef.current = window.setTimeout(() => {
			closeTimerRef.current = null
			setState((current) => {
				if (
					!current.open ||
					current.isPointerInsidePreview ||
					hasValidTask(source?.tasks ?? [], current.hoveredTaskId) ||
					hasValidTask(source?.tasks ?? [], source?.focusedTaskId ?? null)
				) {
					return {
						...current,
						closeDelayState: 'idle',
					}
				}

				return {
					...current,
					open: false,
					targetTaskId: null,
					closeDelayState: 'idle',
					lastAnchorReason: null,
					linkSummary: null,
				}
			})
		}, TASK_PREVIEW_CLOSE_DELAY_MS)
	}, [source])

	const syncPreviewTarget = useCallback(
		(taskId: string, source: TaskPreviewAnchorReason) => {
			cancelScheduledClose()
			setState((current) => {
				if (!current.open && current.targetTaskId !== taskId) {
					return current
				}
				if (current.targetTaskId === taskId && current.lastAnchorReason === source) {
					return current
				}

				return {
					...current,
					targetTaskId: taskId,
					lastAnchorReason: source,
					closeDelayState: 'idle',
					linkSummary: current.targetTaskId === taskId ? current.linkSummary : null,
				}
			})
		},
		[cancelScheduledClose],
	)

	const setHoveredTask = useCallback(
		(taskId: string | null, source: TaskPreviewAnchorReason | null) => {
			setState((current) => ({
				...current,
				hoveredTaskId: taskId,
				hoverSource: source,
			}))
		},
		[],
	)

	const setPreviewPointerInside = useCallback(
		(inside: boolean) => {
			if (inside) {
				cancelScheduledClose()
			}

			setState((current) => ({
				...current,
				isPointerInsidePreview: inside,
			}))
		},
		[cancelScheduledClose],
	)

	const registerSource = useCallback((token: symbol, source: TaskPreviewSource) => {
		activeSourceTokenRef.current = token
		setSource((current) => (areSameTaskPreviewSource(current, source) ? current : source))
	}, [])

	const clearSourceRegistration = useCallback((token: symbol) => {
		if (activeSourceTokenRef.current !== token) {
			return
		}

		activeSourceTokenRef.current = null
		setSource(null)
		setState((current) => ({
			...current,
			hoveredTaskId: null,
			hoverSource: null,
			open: false,
			targetTaskId: null,
			closeDelayState: 'idle',
			lastAnchorReason: null,
			linkSummary: null,
		}))
	}, [])

	useEffect(() => {
		if (!state.open) {
			return
		}

		const tasks = source?.tasks ?? []
		if (tasks.length === 0) {
			closePreview()
			return
		}

		if (state.targetTaskId && !hasValidTask(tasks, state.targetTaskId)) {
			closePreview()
			return
		}

		const nextTarget = resolvePreviewTarget({
			activeTaskId: source?.activeTaskId ?? null,
			focusedTaskId: source?.focusedTaskId ?? null,
			hoveredTaskId: state.hoveredTaskId,
			taskIds: tasks.map((task) => task.id),
		})

		if (nextTarget) {
			cancelScheduledClose()
			if (nextTarget !== state.targetTaskId) {
				setState((current) => ({
					...current,
					targetTaskId: nextTarget,
					lastAnchorReason: current.hoveredTaskId ? 'pointer' : 'keyboard',
					linkSummary: null,
				}))
			}
			return
		}

		if (!state.isPointerInsidePreview) {
			scheduleClosePreview()
		}
	}, [
		cancelScheduledClose,
		closePreview,
		scheduleClosePreview,
		source,
		state.hoveredTaskId,
		state.isPointerInsidePreview,
		state.open,
		state.targetTaskId,
	])

	useEffect(() => {
		if (!state.open || !state.targetTaskId) {
			return
		}

		let cancelled = false
		setState((current) => ({
			...current,
			linkSummary: null,
		}))

		void listTaskLinks({ taskId: state.targetTaskId })
			.then((items) => {
				if (cancelled) {
					return
				}

				const summaryItems = items.slice(0, TASK_PREVIEW_LINK_SUMMARY_LIMIT).map((item) => ({
					id: item.id,
					title: item.title,
				}))
				setState((current) => {
					if (current.targetTaskId !== state.targetTaskId) {
						return current
					}

					return {
						...current,
						linkSummary: {
							items: summaryItems,
							remainingCount: Math.max(0, items.length - summaryItems.length),
						},
					}
				})
			})
			.catch(() => {
				if (cancelled) {
					return
				}
				setState((current) => {
					if (current.targetTaskId !== state.targetTaskId) {
						return current
					}

					return {
						...current,
						linkSummary: null,
					}
				})
			})

		return () => {
			cancelled = true
		}
	}, [state.open, state.targetTaskId])

	useEffect(() => {
		return () => {
			if (closeTimerRef.current !== null) {
				window.clearTimeout(closeTimerRef.current)
			}
		}
	}, [])

	const value = useMemo<TaskPreviewContextValue>(
		() => ({
			state,
			source,
			openPreview,
			closePreview,
			scheduleClosePreview,
			cancelScheduledClose,
			syncPreviewTarget,
			setHoveredTask,
			setPreviewPointerInside,
			registerSource,
			clearSourceRegistration,
		}),
		[
			cancelScheduledClose,
			clearSourceRegistration,
			closePreview,
			openPreview,
			registerSource,
			scheduleClosePreview,
			setHoveredTask,
			setPreviewPointerInside,
			source,
			state,
			syncPreviewTarget,
		],
	)

	return <TaskPreviewContext.Provider value={value}>{children}</TaskPreviewContext.Provider>
}

export function useTaskPreviewContext() {
	const context = useContext(TaskPreviewContext)
	if (!context) {
		throw new Error('useTaskPreviewContext must be used within TaskPreviewProvider')
	}

	return context
}

export function useRegisterTaskPreviewSource(source: TaskPreviewSource) {
	const { registerSource, clearSourceRegistration } = useTaskPreviewContext()
	const tokenRef = useRef<symbol | null>(null)

	if (!tokenRef.current) {
		tokenRef.current = Symbol('task-preview-source')
	}

	useEffect(() => {
		const token = tokenRef.current!
		registerSource(token, source)
	}, [registerSource, source])

	useEffect(() => {
		const token = tokenRef.current!

		return () => {
			clearSourceRegistration(token)
		}
	}, [clearSourceRegistration])
}

function resolvePreviewTarget({
	taskIds,
	hoveredTaskId,
	focusedTaskId,
	activeTaskId,
}: {
	taskIds: string[]
	hoveredTaskId: string | null
	focusedTaskId: string | null
	activeTaskId: string | null
}) {
	if (hasValidTask(taskIds, hoveredTaskId)) {
		return hoveredTaskId
	}

	if (hasValidTask(taskIds, focusedTaskId)) {
		return focusedTaskId
	}

	if (hasValidTask(taskIds, activeTaskId)) {
		return activeTaskId
	}

	return null
}

function hasValidTask(taskIds: string[] | TaskListItem[], taskId: string | null | undefined) {
	if (!taskId) {
		return false
	}

	if (taskIds.length === 0) {
		return false
	}

	if (typeof taskIds[0] === 'string') {
		return (taskIds as string[]).includes(taskId)
	}

	return (taskIds as TaskListItem[]).some((task) => task.id === taskId)
}

function areSameTaskPreviewSource(
	current: TaskPreviewSource | null,
	next: TaskPreviewSource | null,
) {
	if (current === next) {
		return true
	}

	if (!current || !next) {
		return false
	}

	if (
		current.focusedTaskId !== next.focusedTaskId ||
		current.activeTaskId !== next.activeTaskId ||
		current.tasks.length !== next.tasks.length
	) {
		return false
	}

	return current.tasks.every((task, index) => task.id === next.tasks[index]?.id)
}

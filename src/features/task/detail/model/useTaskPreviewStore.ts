import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { listTaskLinks } from '@/features/task/api/taskLinks'

import {
	areSameTaskPreviewSource,
	hasValidTask,
	resolvePreviewTarget,
} from './taskPreviewHelpers'
import {
	INITIAL_TASK_PREVIEW_STATE,
	TASK_PREVIEW_CLOSE_DELAY_MS,
	TASK_PREVIEW_LINK_SUMMARY_LIMIT,
	type TaskPreviewAnchorReason,
	type TaskPreviewContextValue,
	type TaskPreviewSource,
	type TaskPreviewState,
} from './taskPreviewTypes'

/**
 * Preview 开合 / 目标同步 / source 注册 / links 摘要。
 */
export function useTaskPreviewStore(): TaskPreviewContextValue {
	const [state, setState] = useState<TaskPreviewState>(INITIAL_TASK_PREVIEW_STATE)
	const [source, setSource] = useState<TaskPreviewSource | null>(null)
	const [sourceSnapshot, setSourceSnapshot] = useState<TaskPreviewSource | null>(null)
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
		(taskId: string, reason: TaskPreviewAnchorReason) => {
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
					lastAnchorReason: reason,
					linkSummary: null,
				}
			})
		},
		[cancelScheduledClose],
	)

	const scheduleClosePreview = useCallback(() => {
		setState((current) => {
			if (
				!current.open ||
				current.closeDelayState === 'pending' ||
				current.isPointerInsidePreview
			) {
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
		(taskId: string, reason: TaskPreviewAnchorReason) => {
			cancelScheduledClose()
			setState((current) => {
				if (!current.open && current.targetTaskId !== taskId) {
					return current
				}
				if (current.targetTaskId === taskId && current.lastAnchorReason === reason) {
					return current
				}

				return {
					...current,
					targetTaskId: taskId,
					lastAnchorReason: reason,
					closeDelayState: 'idle',
					linkSummary: current.targetTaskId === taskId ? current.linkSummary : null,
				}
			})
		},
		[cancelScheduledClose],
	)

	const setHoveredTask = useCallback(
		(taskId: string | null, reason: TaskPreviewAnchorReason | null) => {
			setState((current) => ({
				...current,
				hoveredTaskId: taskId,
				hoverSource: reason,
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

	const registerSource = useCallback((token: symbol, nextSource: TaskPreviewSource) => {
		activeSourceTokenRef.current = token
		setSource((current) => (areSameTaskPreviewSource(current, nextSource) ? current : nextSource))
		if (nextSource.tasks.length > 0) {
			setSourceSnapshot((current) =>
				areSameTaskPreviewSource(current, nextSource) ? current : nextSource,
			)
		}
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

	return useMemo(
		() => ({
			state,
			source,
			sourceSnapshot,
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
			sourceSnapshot,
			source,
			state,
			syncPreviewTarget,
		],
	)
}

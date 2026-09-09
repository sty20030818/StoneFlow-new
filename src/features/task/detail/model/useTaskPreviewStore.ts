import { useEffect, useMemo, useReducer } from 'react'

import { listTaskLinks } from '@/features/task/api/taskLinks'

import { areSameTaskPreviewSource, hasValidTask, resolvePreviewTarget } from './taskPreviewHelpers'
import {
	INITIAL_TASK_PREVIEW_STATE,
	TASK_PREVIEW_CLOSE_DELAY_MS,
	TASK_PREVIEW_LINK_SUMMARY_LIMIT,
	type TaskPreviewAnchorReason,
	type TaskPreviewContextValue,
	type TaskPreviewLinkSummary,
	type TaskPreviewSource,
	type TaskPreviewState,
} from './taskPreviewTypes'

type PreviewStore = {
	state: TaskPreviewState
	source: TaskPreviewSource | null
	sourceSnapshot: TaskPreviewSource | null
	sourceToken: symbol | null
}

type PreviewEvent =
	| { type: 'open'; taskId: string; reason: TaskPreviewAnchorReason }
	| { type: 'close' | 'close-timeout' }
	| { type: 'hover'; taskId: string | null; reason: TaskPreviewAnchorReason | null }
	| { type: 'pointer'; inside: boolean }
	| { type: 'register'; token: symbol; source: TaskPreviewSource }
	| { type: 'unregister'; token: symbol }
	| { type: 'links'; taskId: string; summary: TaskPreviewLinkSummary | null }

/** 目标跟随在输入事件中一次归约；Effect 只拥有计时器和链接读取。 */
export function useTaskPreviewStore(): TaskPreviewContextValue {
	const [{ state, source, sourceSnapshot }, dispatch] = useReducer(reducePreview, {
		state: INITIAL_TASK_PREVIEW_STATE,
		source: null,
		sourceSnapshot: null,
		sourceToken: null,
	})
	const actions = useMemo(
		() => ({
			openPreview: (taskId: string, reason: TaskPreviewAnchorReason) =>
				dispatch({ type: 'open', taskId, reason }),
			closePreview: () => dispatch({ type: 'close' }),
			setHoveredTask: (taskId: string | null, reason: TaskPreviewAnchorReason | null) =>
				dispatch({ type: 'hover', taskId, reason }),
			setPreviewPointerInside: (inside: boolean) => dispatch({ type: 'pointer', inside }),
			registerSource: (token: symbol, source: TaskPreviewSource) =>
				dispatch({ type: 'register', token, source }),
			clearSourceRegistration: (token: symbol) => dispatch({ type: 'unregister', token }),
		}),
		[],
	)

	useEffect(() => {
		if (state.closeDelayState !== 'pending') return
		const timer = window.setTimeout(
			() => dispatch({ type: 'close-timeout' }),
			TASK_PREVIEW_CLOSE_DELAY_MS,
		)
		return () => window.clearTimeout(timer)
	}, [state.closeDelayState])

	useEffect(() => {
		if (!state.open || !state.targetTaskId) return
		const taskId = state.targetTaskId
		let cancelled = false
		void listTaskLinks({ taskId })
			.then((items) => {
				if (cancelled) return
				const summaryItems = items
					.slice(0, TASK_PREVIEW_LINK_SUMMARY_LIMIT)
					.map(({ id, title }) => ({ id, title }))
				dispatch({
					type: 'links',
					taskId,
					summary: {
						items: summaryItems,
						remainingCount: Math.max(0, items.length - summaryItems.length),
					},
				})
			})
			.catch(() => {
				// 摘要读取失败不阻断预览，保留未读取状态，不伪装成空列表。
				if (!cancelled) dispatch({ type: 'links', taskId, summary: null })
			})
		return () => {
			cancelled = true
		}
	}, [state.open, state.targetTaskId])

	return useMemo(
		() => ({ state, source, sourceSnapshot, ...actions }),
		[state, source, sourceSnapshot, actions],
	)
}

function closeState(state: TaskPreviewState): TaskPreviewState {
	if (
		!state.open &&
		state.targetTaskId === null &&
		state.closeDelayState === 'idle' &&
		state.lastAnchorReason === null &&
		state.linkSummary === null
	)
		return state
	return {
		...state,
		open: false,
		targetTaskId: null,
		closeDelayState: 'idle',
		lastAnchorReason: null,
		linkSummary: null,
	}
}

function reconcileTarget(
	state: TaskPreviewState,
	source: TaskPreviewSource | null,
): TaskPreviewState {
	if (!state.open || !source || source.taskById.size === 0) return state
	if (state.targetTaskId && !hasValidTask(source.taskById, state.targetTaskId))
		return closeState(state)
	const target = resolvePreviewTarget({ ...source, hoveredTaskId: state.hoveredTaskId })
	if (target) {
		if (target === state.targetTaskId && state.closeDelayState === 'idle') return state
		return {
			...state,
			targetTaskId: target,
			closeDelayState: 'idle',
			lastAnchorReason:
				target === state.targetTaskId
					? state.lastAnchorReason
					: state.hoveredTaskId
						? 'pointer'
						: 'keyboard',
			linkSummary: target === state.targetTaskId ? state.linkSummary : null,
		}
	}
	return state.isPointerInsidePreview || state.closeDelayState === 'pending'
		? state
		: { ...state, closeDelayState: 'pending' }
}

function reducePreview(store: PreviewStore, event: PreviewEvent): PreviewStore {
	let { state, source, sourceSnapshot, sourceToken } = store
	switch (event.type) {
		case 'open':
			state =
				state.open && state.targetTaskId === event.taskId
					? closeState(state)
					: reconcileTarget(
							{
								...state,
								open: true,
								targetTaskId: event.taskId,
								closeDelayState: 'idle',
								lastAnchorReason: event.reason,
								linkSummary: null,
							},
							source,
						)
			break
		case 'close':
			state = closeState(state)
			break
		case 'hover':
			if (state.hoveredTaskId === event.taskId && state.hoverSource === event.reason) return store
			state = reconcileTarget(
				{ ...state, hoveredTaskId: event.taskId, hoverSource: event.reason },
				source,
			)
			break
		case 'pointer':
			if (state.isPointerInsidePreview === event.inside) return store
			state = reconcileTarget(
				{
					...state,
					isPointerInsidePreview: event.inside,
					closeDelayState: event.inside ? 'idle' : state.closeDelayState,
				},
				source,
			)
			break
		case 'register':
			sourceToken = event.token
			if (!areSameTaskPreviewSource(source, event.source)) {
				source = event.source
				state = reconcileTarget(state, source)
			}
			if (event.source.taskById.size > 0 && !areSameTaskPreviewSource(sourceSnapshot, event.source))
				sourceSnapshot = event.source
			break
		case 'unregister':
			if (sourceToken !== event.token) return store
			sourceToken = null
			source = null
			state = { ...closeState(state), hoveredTaskId: null, hoverSource: null }
			break
		case 'close-timeout':
			if (state.closeDelayState !== 'pending') return store
			state =
				!state.open ||
				state.isPointerInsidePreview ||
				hasValidTask(source?.taskById, state.hoveredTaskId) ||
				hasValidTask(source?.taskById, source?.focusedTaskId)
					? { ...state, closeDelayState: 'idle' }
					: closeState(state)
			break
		case 'links':
			if (!state.open || state.targetTaskId !== event.taskId || state.linkSummary === event.summary)
				return store
			state = { ...state, linkSummary: event.summary }
			break
	}
	return state === store.state &&
		source === store.source &&
		sourceSnapshot === store.sourceSnapshot &&
		sourceToken === store.sourceToken
		? store
		: { state, source, sourceSnapshot, sourceToken }
}

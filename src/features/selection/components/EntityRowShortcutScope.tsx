import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

import { useLatestRef } from '@/shared/lib/useLatestRef'

type EntityRowShortcutScopeProps = {
	children: (state: EntityRowShortcutState) => ReactNode
	ids: string[]
	focusedId?: string | null
	selectedIdSet?: Set<string>
	onToggleSelection?: (id: string) => void
	onSetFocusedId?: (id: string | null) => void
	onMoveFocus?: (
		delta: number,
		options?: {
			preserveAnchor?: boolean
			selectRange?: boolean
			startFromId?: string | null
			resetAnchorToStart?: boolean
		},
	) => string | null
	onClearSelection?: () => void
	onSelectAll?: (ids: string[]) => void
}

export type EntityRowShortcutState = {
	hoveredId: string | null
	hoverSource: 'pointer' | 'keyboard' | null
	onRowHover: (id: string | null) => void
	onRowFocus: (id: string | null) => void
}

type ShiftToggleSession = {
	active: boolean
	cursorId: string | null
	direction: -1 | 1 | null
	lastToggledId: string | null
}

type RowInputMode = 'keyboard' | 'pointer'

const EMPTY_SHIFT_TOGGLE_SESSION: ShiftToggleSession = {
	active: false,
	cursorId: null,
	direction: null,
	lastToggledId: null,
}

export function EntityRowShortcutScope({
	children,
	ids,
	focusedId: externalFocusedId = null,
	selectedIdSet,
	onToggleSelection,
	onSetFocusedId,
	onMoveFocus,
	onClearSelection,
	onSelectAll,
}: EntityRowShortcutScopeProps) {
	const [focusId, setFocusId] = useState<string | null>(externalFocusedId)
	const [hoverSource, setHoverSource] = useState<'pointer' | 'keyboard' | null>(
		externalFocusedId ? 'keyboard' : null,
	)
	const shiftToggleSessionRef = useRef<ShiftToggleSession>(EMPTY_SHIFT_TOGGLE_SESSION)
	const inputModeRef = useRef<RowInputMode>(externalFocusedId ? 'keyboard' : 'pointer')
	const hoverSourceRef = useRef<'pointer' | 'keyboard' | null>(
		externalFocusedId ? 'keyboard' : null,
	)
	// 以下 4 个回调只在 keydown 处理函数内部触发，不影响副作用的订阅逻辑本身，
	// 用 useLatestRef 读取最新值，避免每次父组件重渲染都重新绑定 keydown 监听。
	const onClearSelectionRef = useLatestRef(onClearSelection)
	const onMoveFocusRef = useLatestRef(onMoveFocus)
	const onSelectAllRef = useLatestRef(onSelectAll)
	const onToggleSelectionRef = useLatestRef(onToggleSelection)

	useEffect(() => {
		if (externalFocusedId === null) {
			if (hoverSourceRef.current === 'pointer') {
				return
			}
			hoverSourceRef.current = null
			setHoverSource(null)
			setFocusId(null)
			return
		}

		if (hoverSourceRef.current === 'pointer') {
			return
		}

		hoverSourceRef.current = 'keyboard'
		setHoverSource('keyboard')
		setFocusId(externalFocusedId)
	}, [externalFocusedId])

	useEffect(() => {
		if (focusId && !ids.includes(focusId)) {
			hoverSourceRef.current = null
			setHoverSource(null)
			setFocusId(null)
			onSetFocusedId?.(null)
		}
	}, [focusId, ids, onSetFocusedId])

	const updateHoveredRow = useCallback(
		(id: string | null, source: RowInputMode | null, options: { syncExternal?: boolean } = {}) => {
			inputModeRef.current = source ?? 'pointer'
			hoverSourceRef.current = source
			setHoverSource(source)
			setFocusId(id)
			if (options.syncExternal !== false) {
				onSetFocusedId?.(id)
			}
		},
		[onSetFocusedId],
	)

	useEffect(() => {
		function handleKeyDown(event: KeyboardEvent) {
			if (isBlockedByHigherLayer() || isEditableEventTarget(event.target)) {
				return
			}

			if (event.defaultPrevented || event.isComposing) {
				return
			}

			if (
				(event.metaKey || event.ctrlKey) &&
				!event.altKey &&
				!event.shiftKey &&
				event.key.toLowerCase() === 'a'
			) {
				event.preventDefault()
				shiftToggleSessionRef.current = EMPTY_SHIFT_TOGGLE_SESSION
				onSelectAllRef.current?.(ids)
				updateHoveredRow(null, null)
				return
			}

			if (event.key === 'Escape' && selectedIdSet && selectedIdSet.size > 0) {
				event.preventDefault()
				onClearSelectionRef.current?.()
				shiftToggleSessionRef.current = EMPTY_SHIFT_TOGGLE_SESSION
				return
			}

			if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') {
				return
			}

			const moveFocus = onMoveFocusRef.current
			if (!moveFocus) {
				return
			}

			event.preventDefault()
			const delta = event.key === 'ArrowDown' ? 1 : -1
			const toggleSelection = onToggleSelectionRef.current
			if (event.shiftKey && toggleSelection) {
				const nextSession = handleShiftToggleNavigation({
					delta,
					focusedId: focusId,
					ids,
					shiftToggleSession: shiftToggleSessionRef.current,
					onToggleSelection: toggleSelection,
					setFocusId: (id, options) => {
						updateHoveredRow(id, 'keyboard', options)
					},
				})
				shiftToggleSessionRef.current = nextSession
				return
			}

			const nextId = moveFocus(delta, {
				preserveAnchor: false,
				selectRange: false,
			})
			shiftToggleSessionRef.current = EMPTY_SHIFT_TOGGLE_SESSION
			updateHoveredRow(nextId, 'keyboard', { syncExternal: false })
		}

		window.addEventListener('keydown', handleKeyDown)
		return () => window.removeEventListener('keydown', handleKeyDown)
		// useLatestRef 返回的 ref 对象稳定；列入 deps 仅满足静态检查，不会导致反复订阅
	}, [
		focusId,
		ids,
		onClearSelectionRef,
		onMoveFocusRef,
		onSelectAllRef,
		onToggleSelectionRef,
		selectedIdSet,
		updateHoveredRow,
	])

	const state = useMemo<EntityRowShortcutState>(
		() => ({
			hoveredId: focusId,
			hoverSource,
			onRowHover: (id) => {
				if (!id) {
					if (hoverSourceRef.current === 'pointer') {
						updateHoveredRow(null, null)
					}
					return
				}
				if (inputModeRef.current === 'keyboard' && hoverSourceRef.current === 'pointer') {
					return
				}
				shiftToggleSessionRef.current = EMPTY_SHIFT_TOGGLE_SESSION
				updateHoveredRow(id, 'pointer')
			},
			onRowFocus: (id) => {
				if (!id) {
					return
				}
				shiftToggleSessionRef.current = EMPTY_SHIFT_TOGGLE_SESSION
				updateHoveredRow(id, 'keyboard')
			},
		}),
		[focusId, hoverSource, updateHoveredRow],
	)

	return <>{children(state)}</>
}

function handleShiftToggleNavigation({
	delta,
	focusedId,
	ids,
	shiftToggleSession,
	onToggleSelection,
	setFocusId,
}: {
	delta: -1 | 1
	focusedId: string | null
	ids: string[]
	shiftToggleSession: ShiftToggleSession
	onToggleSelection: (id: string) => void
	setFocusId: (id: string | null, options?: { syncExternal?: boolean }) => void
}): ShiftToggleSession {
	if (ids.length === 0) {
		setFocusId(null)
		return EMPTY_SHIFT_TOGGLE_SESSION
	}

	const cursorId = resolveShiftToggleCursorId({
		delta,
		focusedId,
		ids,
		shiftToggleSession,
	})
	if (!cursorId) {
		return EMPTY_SHIFT_TOGGLE_SESSION
	}

	if (
		shiftToggleSession.active &&
		shiftToggleSession.direction === delta &&
		shiftToggleSession.lastToggledId === cursorId &&
		isSelectionBoundary(ids, cursorId, delta)
	) {
		setFocusId(cursorId)
		return shiftToggleSession
	}

	onToggleSelection(cursorId)
	setFocusId(cursorId)

	return {
		active: true,
		cursorId: getAdjacentId(ids, cursorId, delta),
		direction: delta,
		lastToggledId: cursorId,
	}
}

function resolveShiftToggleCursorId({
	delta,
	focusedId,
	ids,
	shiftToggleSession,
}: {
	delta: -1 | 1
	focusedId: string | null
	ids: string[]
	shiftToggleSession: ShiftToggleSession
}) {
	if (!shiftToggleSession.active) {
		return getValidId(ids, focusedId) ?? ids[0] ?? null
	}

	if (shiftToggleSession.direction !== delta && getValidId(ids, shiftToggleSession.lastToggledId)) {
		return shiftToggleSession.lastToggledId
	}

	return (
		getValidId(ids, shiftToggleSession.cursorId) ?? getValidId(ids, focusedId) ?? ids[0] ?? null
	)
}

function getAdjacentId(ids: string[], id: string, delta: -1 | 1) {
	const index = ids.indexOf(id)
	if (index < 0) {
		return ids[0] ?? null
	}

	const nextIndex = Math.min(Math.max(index + delta, 0), ids.length - 1)
	return ids[nextIndex] ?? null
}

function getValidId(ids: string[], id: string | null) {
	return id && ids.includes(id) ? id : null
}

function isSelectionBoundary(ids: string[], id: string, delta: -1 | 1) {
	const index = ids.indexOf(id)
	return (delta < 0 && index === 0) || (delta > 0 && index === ids.length - 1)
}

function isBlockedByHigherLayer() {
	return Boolean(
		document.querySelector(
			'[cmdk-root], [data-slot="dialog-content"], [data-slot="dropdown-menu-content"], [data-slot="context-menu-content"]',
		),
	)
}

function isEditableEventTarget(target: EventTarget | null) {
	if (typeof HTMLElement === 'undefined' || !(target instanceof HTMLElement)) {
		return false
	}

	if (target.isContentEditable) {
		return true
	}

	const tagName = target.tagName
	return tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT'
}

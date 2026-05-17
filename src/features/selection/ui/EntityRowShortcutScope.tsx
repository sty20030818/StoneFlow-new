import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

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
}

export type EntityRowShortcutState = {
	onRowHover: (id: string | null) => void
	onRowFocus: (id: string | null) => void
}

type ShiftToggleSession = {
	active: boolean
	cursorId: string | null
	direction: -1 | 1 | null
	lastToggledId: string | null
}

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
}: EntityRowShortcutScopeProps) {
	const [focusId, setFocusId] = useState<string | null>(externalFocusedId)
	const shiftToggleSessionRef = useRef<ShiftToggleSession>(EMPTY_SHIFT_TOGGLE_SESSION)

	useEffect(() => {
		setFocusId(externalFocusedId)
	}, [externalFocusedId])

	useEffect(() => {
		function handleKeyDown(event: KeyboardEvent) {
			if (isBlockedByHigherLayer() || isEditableEventTarget(event.target)) {
				return
			}

			if (event.key === 'Escape' && selectedIdSet && selectedIdSet.size > 0) {
				event.preventDefault()
				onClearSelection?.()
				shiftToggleSessionRef.current = EMPTY_SHIFT_TOGGLE_SESSION
				return
			}

			if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') {
				return
			}

			if (event.defaultPrevented || event.isComposing || !onMoveFocus) {
				return
			}

			event.preventDefault()
			const delta = event.key === 'ArrowDown' ? 1 : -1
			if (event.shiftKey && onToggleSelection) {
				const nextSession = handleShiftToggleNavigation({
					delta,
					focusedId: focusId,
					ids,
					shiftToggleSession: shiftToggleSessionRef.current,
					onToggleSelection,
					setLocalFocusId: setFocusId,
				})
				shiftToggleSessionRef.current = nextSession
				return
			}

			const nextId = onMoveFocus(delta, {
				preserveAnchor: false,
				selectRange: false,
			})
			shiftToggleSessionRef.current = EMPTY_SHIFT_TOGGLE_SESSION
			setFocusId(nextId)
		}

		window.addEventListener('keydown', handleKeyDown)
		return () => window.removeEventListener('keydown', handleKeyDown)
	}, [focusId, ids, onClearSelection, onMoveFocus, onToggleSelection, selectedIdSet])

	const state = useMemo<EntityRowShortcutState>(
		() => ({
			onRowHover: (id) => {
				if (!id) {
					return
				}
				shiftToggleSessionRef.current = EMPTY_SHIFT_TOGGLE_SESSION
				setFocusId(id)
				onSetFocusedId?.(id)
			},
			onRowFocus: (id) => {
				if (!id) {
					return
				}
				shiftToggleSessionRef.current = EMPTY_SHIFT_TOGGLE_SESSION
				setFocusId(id)
				onSetFocusedId?.(id)
			},
		}),
		[onSetFocusedId],
	)

	return <>{children(state)}</>
}

function handleShiftToggleNavigation({
	delta,
	focusedId,
	ids,
	shiftToggleSession,
	onToggleSelection,
	setLocalFocusId,
}: {
	delta: -1 | 1
	focusedId: string | null
	ids: string[]
	shiftToggleSession: ShiftToggleSession
	onToggleSelection: (id: string) => void
	setLocalFocusId: (id: string | null) => void
}): ShiftToggleSession {
	if (ids.length === 0) {
		setLocalFocusId(null)
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
		setLocalFocusId(cursorId)
		return shiftToggleSession
	}

	onToggleSelection(cursorId)
	setLocalFocusId(cursorId)

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
		getValidId(ids, shiftToggleSession.cursorId) ??
		getValidId(ids, focusedId) ??
		ids[0] ??
		null
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

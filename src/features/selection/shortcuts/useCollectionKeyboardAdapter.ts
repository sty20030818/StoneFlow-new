import {
	useCallback,
	type KeyboardEvent as ReactKeyboardEvent,
	type KeyboardEventHandler,
} from 'react'

import { shouldIgnoreKeybindingEvent } from '@/features/command'

import type {
	CollectionEntryTarget,
	CollectionKey,
	CollectionProjection,
} from '../model/collectionState'

export type CollectionKeyboardInteraction<K extends CollectionKey = CollectionKey> = {
	projection: CollectionProjection<K>
	focusedKey: K | null
	focusKey: (key: K | null) => void
	toggleSelection: (key?: K | null) => void
	selectRangeTo: (key: K) => void
	selectEligibleKeys: () => void
}

export type UseCollectionKeyboardAdapterOptions<K extends CollectionKey = CollectionKey> = {
	interaction: CollectionKeyboardInteraction<K>
	/** 只解析已注册 row 本体；不得沿祖先向上查找 row。 */
	resolveRowKey: (target: HTMLElement) => K | null
	requestFocus: (intent: CollectionEntryTarget<K>) => void
	onPeek: (key: K) => void
	onOpen: (key: K) => void
}

/**
 * 在 collection root capture 阶段补充产品键位，标准 Arrow/Home/End 继续交给 React Aria。
 */
export function useCollectionKeyboardAdapter<K extends CollectionKey>({
	interaction,
	resolveRowKey,
	requestFocus,
	onPeek,
	onOpen,
}: UseCollectionKeyboardAdapterOptions<K>): {
	onKeyDownCapture: KeyboardEventHandler<HTMLElement>
} {
	const onKeyDownCapture = useCallback<KeyboardEventHandler<HTMLElement>>(
		(event) => {
			if (shouldIgnoreKeybindingEvent(toNormalizedKeyEvent(event))) {
				return
			}

			const target = resolveOwnedTarget(event, resolveRowKey, interaction.projection.eligibleKeys)
			if (!target.owned) {
				return
			}

			if (isExplicitSelectAll(event)) {
				consumeEvent(event)
				interaction.selectEligibleKeys()
				return
			}

			const currentKey = target.rowKey ?? interaction.focusedKey
			const direction = resolveNavigationDirection(event)
			if (direction !== null) {
				const nextKey = moveKey(interaction.projection.navigableKeys, currentKey, direction)
				if (nextKey === null) {
					return
				}

				consumeEvent(event)
				if (event.shiftKey) {
					interaction.selectRangeTo(nextKey)
				} else {
					interaction.focusKey(nextKey)
				}
				requestFocus({ type: 'item', key: nextKey })
				return
			}

			if (currentKey === null || hasModifier(event)) {
				return
			}

			const key = normalizeCharacterKey(event.key)
			if (key === 'x') {
				consumeEvent(event)
				interaction.toggleSelection(currentKey)
				return
			}

			if (isSpaceKey(event.key)) {
				consumeEvent(event)
				onPeek(currentKey)
				return
			}

			if (event.key === 'Enter') {
				consumeEvent(event)
				onOpen(currentKey)
			}
		},
		[interaction, onOpen, onPeek, requestFocus, resolveRowKey],
	)

	return { onKeyDownCapture }
}

type OwnedTarget<K extends CollectionKey> = { owned: true; rowKey: K | null } | { owned: false }

function resolveOwnedTarget<K extends CollectionKey>(
	event: ReactKeyboardEvent<HTMLElement>,
	resolveRowKey: (target: HTMLElement) => K | null,
	eligibleKeys: readonly K[],
): OwnedTarget<K> {
	if (!(event.target instanceof HTMLElement)) {
		return { owned: false }
	}
	if (event.target === event.currentTarget) {
		return { owned: true, rowKey: null }
	}

	const rowKey = resolveRowKey(event.target)
	return rowKey !== null && eligibleKeys.includes(rowKey)
		? { owned: true, rowKey }
		: { owned: false }
}

function resolveNavigationDirection(event: ReactKeyboardEvent<HTMLElement>): -1 | 1 | null {
	if (event.metaKey || event.ctrlKey || event.altKey) {
		return null
	}

	const key = normalizeCharacterKey(event.key)
	if (key === 'j' || (event.shiftKey && event.key === 'ArrowDown')) {
		return 1
	}
	if (key === 'k' || (event.shiftKey && event.key === 'ArrowUp')) {
		return -1
	}
	return null
}

function moveKey<K extends CollectionKey>(
	navigableKeys: readonly K[],
	currentKey: K | null,
	direction: -1 | 1,
): K | null {
	if (navigableKeys.length === 0) {
		return null
	}

	const currentIndex = currentKey === null ? -1 : navigableKeys.indexOf(currentKey)
	if (currentIndex === -1) {
		return direction === 1 ? (navigableKeys[0] ?? null) : (navigableKeys.at(-1) ?? null)
	}

	const nextIndex = Math.min(Math.max(currentIndex + direction, 0), navigableKeys.length - 1)
	return navigableKeys[nextIndex] ?? null
}

function isExplicitSelectAll(event: ReactKeyboardEvent<HTMLElement>) {
	return (
		normalizeCharacterKey(event.key) === 'a' &&
		(event.metaKey || event.ctrlKey) &&
		!event.altKey &&
		!event.shiftKey
	)
}

function hasModifier(event: ReactKeyboardEvent<HTMLElement>) {
	return event.metaKey || event.ctrlKey || event.altKey || event.shiftKey
}

function isSpaceKey(key: string) {
	return key === ' ' || key === 'Space' || key === 'Spacebar'
}

function normalizeCharacterKey(key: string) {
	return key.length === 1 ? key.toLowerCase() : key
}

function consumeEvent(event: ReactKeyboardEvent<HTMLElement>) {
	event.preventDefault()
	event.stopPropagation()
}

function toNormalizedKeyEvent(event: ReactKeyboardEvent<HTMLElement>) {
	return {
		key: event.key,
		metaKey: event.metaKey,
		ctrlKey: event.ctrlKey,
		altKey: event.altKey,
		shiftKey: event.shiftKey,
		defaultPrevented: event.defaultPrevented,
		isComposing: event.nativeEvent.isComposing,
		target: event.target,
	}
}

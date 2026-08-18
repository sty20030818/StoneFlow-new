import {
	useCallback,
	useRef,
	type KeyboardEvent as ReactKeyboardEvent,
	type KeyboardEventHandler,
} from 'react'

import { COMMAND_IDS, shouldIgnoreKeybindingEvent, type CommandId } from '@/features/command'

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
	toggleRangeStep: (direction: -1 | 1) => K | null
	selectEligibleKeys: () => void
}

export type UseCollectionKeyboardAdapterOptions<K extends CollectionKey = CollectionKey> = {
	interaction: CollectionKeyboardInteraction<K>
	/** 只解析已注册 row 本体；不得沿祖先向上查找 row。 */
	resolveRowKey: (target: HTMLElement) => K | null
	requestFocus: (intent: CollectionEntryTarget<K>) => void
	onExecuteCommand: (commandId: CommandId, key: K) => void
	onKeyboardInteraction: () => void
}

const REPEAT_MIN_INTERVAL_MS = 40
const REPEAT_MAX_QUEUE_AGE_MS = 120

/** collection root 唯一键盘入口；避免虚拟列表的 React Aria DOM delegate 积压 repeat。 */
export function useCollectionKeyboardAdapter<K extends CollectionKey>({
	interaction,
	resolveRowKey,
	requestFocus,
	onExecuteCommand,
	onKeyboardInteraction,
}: UseCollectionKeyboardAdapterOptions<K>): {
	onKeyDownCapture: KeyboardEventHandler<HTMLElement>
} {
	const repeatRef = useRef({ key: '', lastHandledAt: -Infinity })
	const onKeyDownCapture = useCallback<KeyboardEventHandler<HTMLElement>>(
		(event) => {
			if (shouldIgnoreKeybindingEvent(toNormalizedKeyEvent(event))) {
				return
			}

			if (!isOwnedTarget(event, resolveRowKey, interaction.projection.eligibleKeys)) {
				return
			}

			const currentKey = interaction.focusedKey
			if (isExplicitSelectAll(event)) {
				consumeEvent(event)
				onKeyboardInteraction()
				interaction.selectEligibleKeys()
				return
			}

			const navigation = resolveNavigation(event)
			if (navigation !== null) {
				consumeEvent(event)
				if (shouldDropRepeat(event, repeatRef.current)) return
				onKeyboardInteraction()

				const isRangeStep = event.shiftKey && typeof navigation === 'number'
				const nextKey = isRangeStep
					? interaction.toggleRangeStep(navigation)
					: resolveNavigationKey(interaction.projection.navigableKeys, currentKey, navigation)
				if (nextKey === null) return
				if (!isRangeStep) interaction.focusKey(nextKey)
				if (nextKey === currentKey && !isRangeStep) return
				requestFocus({ type: 'item', key: nextKey })
				return
			}

			if (currentKey === null || hasModifier(event)) {
				return
			}

			const key = normalizeCharacterKey(event.key)
			if (key === 'x') {
				consumeEvent(event)
				onKeyboardInteraction()
				requestFocus({ type: 'item', key: currentKey })
				interaction.toggleSelection(currentKey)
				return
			}

			if (isSpaceKey(event.key)) {
				consumeEvent(event)
				onKeyboardInteraction()
				requestFocus({ type: 'item', key: currentKey })
				onExecuteCommand(COMMAND_IDS.taskPeek, currentKey)
				return
			}

			if (event.key === 'Enter') {
				consumeEvent(event)
				onKeyboardInteraction()
				requestFocus({ type: 'item', key: currentKey })
				onExecuteCommand(COMMAND_IDS.taskOpenDetail, currentKey)
			}
		},
		[interaction, onExecuteCommand, onKeyboardInteraction, requestFocus, resolveRowKey],
	)

	return { onKeyDownCapture }
}

function isOwnedTarget<K extends CollectionKey>(
	event: ReactKeyboardEvent<HTMLElement>,
	resolveRowKey: (target: HTMLElement) => K | null,
	eligibleKeys: readonly K[],
): boolean {
	if (!(event.target instanceof HTMLElement)) {
		return false
	}
	if (event.target === event.currentTarget) {
		return true
	}

	const rowKey = resolveRowKey(event.target)
	return rowKey !== null && eligibleKeys.includes(rowKey)
}

type Navigation = -1 | 1 | 'first' | 'last'

function resolveNavigation(event: ReactKeyboardEvent<HTMLElement>): Navigation | null {
	if (event.metaKey || event.ctrlKey || event.altKey) {
		return null
	}

	if (event.key === 'Home') return 'first'
	if (event.key === 'End') return 'last'
	if (event.key === 'ArrowDown') return 1
	if (event.key === 'ArrowUp') return -1

	const key = normalizeCharacterKey(event.key)
	if (key === 'j') return 1
	if (key === 'k') return -1
	return null
}

function resolveNavigationKey<K extends CollectionKey>(
	navigableKeys: readonly K[],
	currentKey: K | null,
	navigation: Navigation,
): K | null {
	if (navigableKeys.length === 0) {
		return null
	}
	if (navigation === 'first') return navigableKeys[0] ?? null
	if (navigation === 'last') return navigableKeys.at(-1) ?? null

	const currentIndex = currentKey === null ? -1 : navigableKeys.indexOf(currentKey)
	if (currentIndex === -1) {
		return navigation === 1 ? (navigableKeys[0] ?? null) : (navigableKeys.at(-1) ?? null)
	}

	const nextIndex = Math.min(Math.max(currentIndex + navigation, 0), navigableKeys.length - 1)
	return navigableKeys[nextIndex] ?? null
}

function shouldDropRepeat(
	event: ReactKeyboardEvent<HTMLElement>,
	state: { key: string; lastHandledAt: number },
) {
	const now = globalThis.performance?.now() ?? Date.now()
	if (!event.repeat) {
		state.key = event.key
		state.lastHandledAt = -Infinity
		return false
	}

	const eventTime = event.timeStamp
	const queueAge = eventTime > 0 && eventTime <= now ? now - eventTime : 0
	if (
		queueAge > REPEAT_MAX_QUEUE_AGE_MS ||
		(state.key === event.key && now - state.lastHandledAt < REPEAT_MIN_INTERVAL_MS)
	) {
		return true
	}

	state.key = event.key
	state.lastHandledAt = now
	return false
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

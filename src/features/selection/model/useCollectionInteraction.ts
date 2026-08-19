import {
	createElement,
	useCallback,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
	type ReactElement,
	type ReactNode,
} from 'react'
import { Item, useListState, type ItemProps, type ListState, type Selection } from 'react-stately'

import {
	createCollectionProjection,
	materializeEligibleSelection,
	type CollectionKey,
	type CollectionProjection,
	type CollectionState,
} from './collectionState'

export type CollectionInteractionItem<K extends CollectionKey> = {
	key: K
	textValue: string
}

export type UseCollectionInteractionOptions<K extends CollectionKey> = {
	eligibleKeys: readonly K[]
	navigableKeys: readonly K[]
	defaultSelectedKeys?: readonly K[]
}

export type CollectionInteraction<K extends CollectionKey> = {
	listState: ListState<CollectionInteractionItem<K>>
	projection: CollectionProjection<K>
	selectedKeys: ReadonlySet<K>
	focusedKey: K | null
	focusKey: (key: K | null) => void
	toggleSelection: (key?: K | null) => void
	toggleRangeStep: (direction: -1 | 1) => K | null
	replaceSelection: (keys: Iterable<K>) => void
	selectEligibleKeys: () => void
	clearSelection: () => void
	getSnapshot: () => CollectionState<K>
}

/**
 * 集合唯一交互 owner。React Stately 管理标准 collection/focus，选择始终受控为显式 Set。
 * Shift 手势会话只记录方向与最后切换项，不复制 selection/focus 真相。
 */
export function useCollectionInteraction<K extends CollectionKey>({
	eligibleKeys,
	navigableKeys,
	defaultSelectedKeys = [],
}: UseCollectionInteractionOptions<K>): CollectionInteraction<K> {
	const projection = useMemo(
		() => createCollectionProjection(eligibleKeys, navigableKeys),
		[eligibleKeys, navigableKeys],
	)
	const projectionRef = useRef(projection)
	projectionRef.current = projection
	const rangeToggleProjectionRef = useRef(projection)
	const rangeToggleSessionRef = useRef<{
		direction: -1 | 1
		lastToggledKey: K
	} | null>(null)
	const isRangeToggleWriteRef = useRef(false)

	const [selectedKeys, setSelectedKeys] = useState<Set<K>>(() =>
		intersectKeys(defaultSelectedKeys, projection.eligibleKeys),
	)
	const selectedKeysRef = useRef(selectedKeys)
	selectedKeysRef.current = selectedKeys

	const setExplicitSelection = useCallback((selection: Selection) => {
		if (!isRangeToggleWriteRef.current) {
			rangeToggleSessionRef.current = null
		}
		const nextKeys =
			selection === 'all'
				? materializeEligibleSelection(projectionRef.current.eligibleKeys)
				: intersectKeys(toCollectionKeys<K>(selection), projectionRef.current.eligibleKeys)
		selectedKeysRef.current = nextKeys
		setSelectedKeys(nextKeys)
	}, [])

	const items = useMemo<CollectionInteractionItem<K>[]>(
		() => projection.eligibleKeys.map((key) => ({ key, textValue: key })),
		[projection.eligibleKeys],
	)
	const disabledKeys = useMemo(() => {
		const navigableKeySet = new Set(projection.navigableKeys)
		return new Set(projection.eligibleKeys.filter((key) => !navigableKeySet.has(key)))
	}, [projection])
	const listState = useListState<CollectionInteractionItem<K>>({
		items,
		children: (item) =>
			createElement(
				Item as (
					props: Omit<ItemProps<CollectionInteractionItem<K>>, 'children'> & {
						children?: ReactNode
					},
				) => ReactElement,
				{ key: item.key, textValue: item.textValue },
				item.textValue,
			) as ReactElement<ItemProps<CollectionInteractionItem<K>>>,
		selectionMode: 'multiple',
		selectionBehavior: 'toggle',
		disabledKeys,
		disabledBehavior: 'all',
		selectedKeys,
		onSelectionChange: setExplicitSelection,
	})
	const listStateRef = useRef(listState)
	listStateRef.current = listState

	const focusedKey = asCollectionKey<K>(listState.selectionManager.focusedKey)

	useLayoutEffect(() => {
		const previousProjection = rangeToggleProjectionRef.current
		if (
			!isOrderedPrefix(previousProjection.eligibleKeys, projection.eligibleKeys) ||
			!isOrderedPrefix(previousProjection.navigableKeys, projection.navigableKeys)
		) {
			rangeToggleSessionRef.current = null
		}
		rangeToggleProjectionRef.current = projection
		const nextSelectedKeys = intersectKeys(selectedKeysRef.current, projection.eligibleKeys)
		if (!setsEqual(selectedKeysRef.current, nextSelectedKeys)) {
			selectedKeysRef.current = nextSelectedKeys
			setSelectedKeys(nextSelectedKeys)
		}
	}, [projection])

	const focusKey = useCallback((key: K | null) => {
		if (key !== null && !projectionRef.current.navigableKeys.includes(key)) return
		rangeToggleSessionRef.current = null
		listStateRef.current.selectionManager.setFocusedKey(key)
	}, [])

	const toggleSelection = useCallback((key?: K | null) => {
		const target = key ?? asCollectionKey<K>(listStateRef.current.selectionManager.focusedKey)
		if (!target || !projectionRef.current.eligibleKeys.includes(target)) return
		rangeToggleSessionRef.current = null
		listStateRef.current.selectionManager.toggleSelection(target)
	}, [])

	const getSnapshot = useCallback(
		(): CollectionState<K> => ({
			selectedKeys: new Set(selectedKeysRef.current),
			focusedKey: asCollectionKey<K>(listStateRef.current.selectionManager.focusedKey),
		}),
		[],
	)

	const toggleRangeStep = useCallback((direction: -1 | 1): K | null => {
		const navigable = projectionRef.current.navigableKeys
		if (navigable.length === 0) {
			rangeToggleSessionRef.current = null
			return null
		}

		const manager = listStateRef.current.selectionManager
		const focusedKey = asCollectionKey<K>(manager.focusedKey)
		const previousSession = rangeToggleSessionRef.current
		const session =
			previousSession &&
			previousSession.lastToggledKey === focusedKey &&
			navigable.includes(previousSession.lastToggledKey)
				? previousSession
				: null
		const fallbackKey = direction > 0 ? navigable[0] : navigable[navigable.length - 1]
		const cursorKey =
			session && session.direction !== direction
				? session.lastToggledKey
				: session
					? getAdjacentKey(navigable, session.lastToggledKey, direction)
					: focusedKey && navigable.includes(focusedKey)
						? focusedKey
						: fallbackKey

		if (!cursorKey) return null
		isRangeToggleWriteRef.current = true
		try {
			manager.toggleSelection(cursorKey)
		} finally {
			isRangeToggleWriteRef.current = false
		}
		manager.setFocusedKey(cursorKey)
		rangeToggleSessionRef.current = {
			direction,
			lastToggledKey: cursorKey,
		}
		return cursorKey
	}, [])

	const selectEligibleKeys = useCallback(() => {
		rangeToggleSessionRef.current = null
		listStateRef.current.selectionManager.setSelectedKeys(
			materializeEligibleSelection(projectionRef.current.eligibleKeys),
		)
	}, [])

	const replaceSelection = useCallback((keys: Iterable<K>) => {
		rangeToggleSessionRef.current = null
		listStateRef.current.selectionManager.setSelectedKeys(
			intersectKeys(keys, projectionRef.current.eligibleKeys),
		)
	}, [])

	const clearSelection = useCallback(() => {
		rangeToggleSessionRef.current = null
		listStateRef.current.selectionManager.clearSelection()
	}, [])

	return {
		listState,
		projection,
		selectedKeys,
		focusedKey,
		focusKey,
		toggleSelection,
		toggleRangeStep,
		replaceSelection,
		selectEligibleKeys,
		clearSelection,
		getSnapshot,
	}
}

function getAdjacentKey<K extends CollectionKey>(
	keys: readonly K[],
	key: K,
	direction: -1 | 1,
): K | null {
	const index = keys.indexOf(key)
	return index === -1 ? null : (keys[index + direction] ?? null)
}

function intersectKeys<K extends CollectionKey>(
	keys: Iterable<K>,
	eligibleKeys: readonly K[],
): Set<K> {
	const source = new Set(keys)
	return new Set(eligibleKeys.filter((key) => source.has(key)))
}

function setsEqual<K>(left: ReadonlySet<K>, right: ReadonlySet<K>) {
	return left.size === right.size && [...left].every((key) => right.has(key))
}

function isOrderedPrefix<K>(previous: readonly K[], next: readonly K[]) {
	return previous.length <= next.length && previous.every((key, index) => key === next[index])
}

function asCollectionKey<K extends CollectionKey>(key: string | number | null): K | null {
	return typeof key === 'string' ? (key as K) : null
}

function toCollectionKeys<K extends CollectionKey>(keys: Iterable<string | number>): K[] {
	return [...keys].filter((key): key is string => typeof key === 'string') as K[]
}

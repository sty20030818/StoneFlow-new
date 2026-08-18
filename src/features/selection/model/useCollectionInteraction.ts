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
	resetRangeAnchorBeforeRange,
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
	rangeAnchorKey: K | null
	focusKey: (key: K | null, options?: { preserveRangeAnchor?: boolean }) => void
	toggleSelection: (key?: K | null) => void
	selectRangeTo: (key: K) => void
	selectEligibleKeys: () => void
	clearSelection: () => void
	getSnapshot: () => CollectionState<K>
}

/**
 * 集合唯一交互 owner。React Stately 管理标准 collection/focus，选择始终受控为显式 Set。
 * range anchor 是上游公开 manager 未暴露的唯一产品交互元数据，不复制 selection/focus。
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

	const [selectedKeys, setSelectedKeys] = useState<Set<K>>(() =>
		intersectKeys(defaultSelectedKeys, projection.eligibleKeys),
	)
	const selectedKeysRef = useRef(selectedKeys)
	selectedKeysRef.current = selectedKeys

	const setExplicitSelection = useCallback((selection: Selection) => {
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

	const [rangeAnchorKey, setRangeAnchorState] = useState<K | null>(null)
	const rangeAnchorRef = useRef<K | null>(null)
	const preserveRangeAnchorRef = useRef(false)
	const focusedKey = asCollectionKey<K>(listState.selectionManager.focusedKey)
	const previousFocusedKeyRef = useRef(focusedKey)

	const setRangeAnchorKey = useCallback((key: K | null) => {
		rangeAnchorRef.current = key
		setRangeAnchorState(key)
	}, [])

	useLayoutEffect(() => {
		const nextSelectedKeys = intersectKeys(selectedKeysRef.current, projection.eligibleKeys)
		if (!setsEqual(selectedKeysRef.current, nextSelectedKeys)) {
			selectedKeysRef.current = nextSelectedKeys
			setSelectedKeys(nextSelectedKeys)
		}
	}, [projection])

	useLayoutEffect(() => {
		const previousFocusedKey = previousFocusedKeyRef.current
		if (focusedKey === previousFocusedKey) return

		const projectionMovedFocus =
			previousFocusedKey !== null && !projection.navigableKeys.includes(previousFocusedKey)
		const shouldPreserveAnchor = preserveRangeAnchorRef.current || projectionMovedFocus
		preserveRangeAnchorRef.current = false
		if (!shouldPreserveAnchor) {
			setRangeAnchorKey(focusedKey)
		}

		previousFocusedKeyRef.current = focusedKey
	}, [focusedKey, projection, setRangeAnchorKey])

	const focusKey = useCallback(
		(key: K | null, options: { preserveRangeAnchor?: boolean } = {}) => {
			if (key !== null && !projectionRef.current.navigableKeys.includes(key)) return
			preserveRangeAnchorRef.current =
				(options.preserveRangeAnchor ?? false) &&
				listStateRef.current.selectionManager.focusedKey !== key
			listStateRef.current.selectionManager.setFocusedKey(key)
			if (!options.preserveRangeAnchor) {
				setRangeAnchorKey(key)
			}
		},
		[setRangeAnchorKey],
	)

	const toggleSelection = useCallback((key?: K | null) => {
		const target = key ?? asCollectionKey<K>(listStateRef.current.selectionManager.focusedKey)
		if (!target || !projectionRef.current.eligibleKeys.includes(target)) return
		listStateRef.current.selectionManager.toggleSelection(target)
	}, [])

	const getSnapshot = useCallback(
		(): CollectionState<K> => ({
			selectedKeys: new Set(selectedKeysRef.current),
			focusedKey: asCollectionKey<K>(listStateRef.current.selectionManager.focusedKey),
			rangeAnchorKey: rangeAnchorRef.current,
		}),
		[],
	)

	const selectRangeTo = useCallback(
		(targetKey: K) => {
			const navigable = projectionRef.current.navigableKeys
			if (!navigable.includes(targetKey)) return
			const state = resetRangeAnchorBeforeRange(getSnapshot(), navigable)
			const anchorKey = state.rangeAnchorKey ?? targetKey
			const previousEndpoint =
				state.focusedKey !== null && navigable.includes(state.focusedKey)
					? state.focusedKey
					: anchorKey
			const selectedKeys = new Set(state.selectedKeys)
			for (const key of getKeyRange(navigable, anchorKey, previousEndpoint)) {
				selectedKeys.delete(key)
			}
			for (const key of getKeyRange(navigable, anchorKey, targetKey)) {
				selectedKeys.add(key)
			}

			setRangeAnchorKey(anchorKey)
			preserveRangeAnchorRef.current =
				listStateRef.current.selectionManager.focusedKey !== targetKey
			listStateRef.current.selectionManager.setSelectedKeys(selectedKeys)
			listStateRef.current.selectionManager.setFocusedKey(targetKey)
		},
		[getSnapshot, setRangeAnchorKey],
	)

	const selectEligibleKeys = useCallback(() => {
		listStateRef.current.selectionManager.setSelectedKeys(
			materializeEligibleSelection(projectionRef.current.eligibleKeys),
		)
	}, [])

	const clearSelection = useCallback(() => {
		listStateRef.current.selectionManager.clearSelection()
	}, [])

	return {
		listState,
		projection,
		selectedKeys,
		focusedKey,
		rangeAnchorKey,
		focusKey,
		toggleSelection,
		selectRangeTo,
		selectEligibleKeys,
		clearSelection,
		getSnapshot,
	}
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

function getKeyRange<K extends CollectionKey>(keys: readonly K[], from: K, to: K) {
	const fromIndex = keys.indexOf(from)
	const toIndex = keys.indexOf(to)
	if (fromIndex === -1 || toIndex === -1) return []
	return keys.slice(Math.min(fromIndex, toIndex), Math.max(fromIndex, toIndex) + 1)
}

function asCollectionKey<K extends CollectionKey>(key: string | number | null): K | null {
	return typeof key === 'string' ? (key as K) : null
}

function toCollectionKeys<K extends CollectionKey>(keys: Iterable<string | number>): K[] {
	return [...keys].filter((key): key is string => typeof key === 'string') as K[]
}

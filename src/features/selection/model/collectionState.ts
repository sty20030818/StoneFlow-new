/**
 * 集合 key 必须来自持久实体 ID。收窄为 string，避免把数组索引误作稳定身份。
 */
export type CollectionKey = string

/**
 * React Stately owner 的纯数据快照；本模块不创建第二份可写交互状态。
 */
export type CollectionState<K extends CollectionKey = CollectionKey> = Readonly<{
	selectedKeys: ReadonlySet<K>
	focusedKey: K | null
	rangeAnchorKey: K | null
}>

export type CollectionProjection<K extends CollectionKey = CollectionKey> = Readonly<{
	eligibleKeys: readonly K[]
	navigableKeys: readonly K[]
}>

export type CollectionEntryTarget<K extends CollectionKey = CollectionKey> =
	| { type: 'item'; key: K }
	| { type: 'root' }

export type CollectionFocusIntent<
	K extends CollectionKey = CollectionKey,
	G extends CollectionKey = CollectionKey,
> =
	| CollectionEntryTarget<K>
	| {
			type: 'group-trigger'
			groupKey: G
			reentry: CollectionEntryTarget<K>
	  }

export type CollectionTransition<
	K extends CollectionKey = CollectionKey,
	G extends CollectionKey = CollectionKey,
> = Readonly<{
	state: CollectionState<K>
	focusIntent: CollectionFocusIntent<K, G> | null
}>

export type CollectionProjectionChangeReason = 'filter' | 'delete' | 'incremental-load'

export function createCollectionProjection<K extends CollectionKey>(
	eligibleKeys: readonly K[],
	navigableKeys: readonly K[],
): CollectionProjection<K> {
	assertUniqueKeys(eligibleKeys, 'eligibleKeys')
	assertUniqueKeys(navigableKeys, 'navigableKeys')
	assertOrderedSubset(eligibleKeys, navigableKeys)

	return {
		eligibleKeys: [...eligibleKeys],
		navigableKeys: [...navigableKeys],
	}
}

/** Cmd/Ctrl+A 必须物化按键当下的显式 key 集合，不能使用 `all` sentinel。 */
export function materializeEligibleSelection<K extends CollectionKey>(
	eligibleKeys: readonly K[],
): Set<K> {
	return new Set(eligibleKeys)
}

export function reconcileCollectionProjection<K extends CollectionKey>(
	state: CollectionState<K>,
	previous: CollectionProjection<K>,
	next: CollectionProjection<K>,
	reason: CollectionProjectionChangeReason,
): CollectionTransition<K> {
	const nextEligibleKeySet = new Set(next.eligibleKeys)
	if (reason === 'incremental-load') {
		assertIncrementalProjection(previous.eligibleKeys, nextEligibleKeySet)
	}

	const selectedKeys = intersectKeys(state.selectedKeys, nextEligibleKeySet)
	const nextNavigableKeySet = new Set(next.navigableKeys)
	const focusedKey =
		state.focusedKey === null || nextNavigableKeySet.has(state.focusedKey)
			? state.focusedKey
			: findAdjacentKey(state.focusedKey, previous.navigableKeys, next.navigableKeys)
	const nextState =
		selectedKeys === state.selectedKeys && focusedKey === state.focusedKey
			? state
			: {
					selectedKeys,
					focusedKey,
					rangeAnchorKey: state.rangeAnchorKey,
				}

	const shouldRestoreDeletedFocus =
		reason === 'delete' && state.focusedKey !== null && focusedKey !== state.focusedKey

	return {
		state: nextState,
		focusIntent: shouldRestoreDeletedFocus ? toEntryTarget(focusedKey) : null,
	}
}

export function reconcileCollapsedGroup<
	K extends CollectionKey,
	G extends CollectionKey = CollectionKey,
>(
	state: CollectionState<K>,
	previous: CollectionProjection<K>,
	next: CollectionProjection<K>,
	input: {
		groupKey: G
		collapsedKeys: ReadonlySet<K>
	},
): CollectionTransition<K, G> {
	if (state.focusedKey === null || !input.collapsedKeys.has(state.focusedKey)) {
		return { state, focusIntent: null }
	}

	const reentryKey = findKeyAfterCollapsedGroup(
		previous.navigableKeys,
		next.navigableKeys,
		input.collapsedKeys,
	)
	const reentry = toEntryTarget(reentryKey)

	return {
		state: {
			selectedKeys: state.selectedKeys,
			focusedKey: reentryKey,
			rangeAnchorKey: state.rangeAnchorKey,
		},
		focusIntent: {
			type: 'group-trigger',
			groupKey: input.groupKey,
			reentry,
		},
	}
}

/** anchor 只在下一次范围操作开始前修复，投影变化本身不提前改写它。 */
export function resetRangeAnchorBeforeRange<K extends CollectionKey>(
	state: CollectionState<K>,
	navigableKeys: readonly K[],
): CollectionState<K> {
	const navigableKeySet = new Set(navigableKeys)
	if (state.rangeAnchorKey !== null && navigableKeySet.has(state.rangeAnchorKey)) {
		return state
	}

	const rangeAnchorKey =
		state.focusedKey !== null && navigableKeySet.has(state.focusedKey) ? state.focusedKey : null
	if (rangeAnchorKey === state.rangeAnchorKey) {
		return state
	}

	return {
		selectedKeys: state.selectedKeys,
		focusedKey: state.focusedKey,
		rangeAnchorKey,
	}
}

function assertUniqueKeys<K extends CollectionKey>(keys: readonly K[], name: string) {
	const seenKeys = new Set<K>()
	for (const key of keys) {
		if (seenKeys.has(key)) {
			throw new Error(`${name} 包含重复 key：${key}`)
		}
		seenKeys.add(key)
	}
}

function assertOrderedSubset<K extends CollectionKey>(
	eligibleKeys: readonly K[],
	navigableKeys: readonly K[],
) {
	let eligibleIndex = 0
	for (const navigableKey of navigableKeys) {
		while (eligibleIndex < eligibleKeys.length && eligibleKeys[eligibleIndex] !== navigableKey) {
			eligibleIndex += 1
		}
		if (eligibleIndex === eligibleKeys.length) {
			throw new Error('navigableKeys 必须是 eligibleKeys 的有序子集')
		}
		eligibleIndex += 1
	}
}

function assertIncrementalProjection<K extends CollectionKey>(
	previousEligibleKeys: readonly K[],
	nextEligibleKeySet: ReadonlySet<K>,
) {
	for (const key of previousEligibleKeys) {
		if (!nextEligibleKeySet.has(key)) {
			throw new Error('incremental-load 不得移除已有 eligible key')
		}
	}
}

function intersectKeys<K extends CollectionKey>(
	selectedKeys: ReadonlySet<K>,
	eligibleKeys: ReadonlySet<K>,
): ReadonlySet<K> {
	for (const key of selectedKeys) {
		if (!eligibleKeys.has(key)) {
			return new Set([...selectedKeys].filter((selectedKey) => eligibleKeys.has(selectedKey)))
		}
	}
	return selectedKeys
}

function findAdjacentKey<K extends CollectionKey>(
	focusedKey: K,
	previousNavigableKeys: readonly K[],
	nextNavigableKeys: readonly K[],
): K | null {
	const nextNavigableKeySet = new Set(nextNavigableKeys)
	const focusedIndex = previousNavigableKeys.indexOf(focusedKey)
	if (focusedIndex === -1) {
		return nextNavigableKeys[0] ?? null
	}

	for (let index = focusedIndex + 1; index < previousNavigableKeys.length; index += 1) {
		const key = previousNavigableKeys[index]
		if (key !== undefined && nextNavigableKeySet.has(key)) {
			return key
		}
	}

	for (let index = focusedIndex - 1; index >= 0; index -= 1) {
		const key = previousNavigableKeys[index]
		if (key !== undefined && nextNavigableKeySet.has(key)) {
			return key
		}
	}

	return nextNavigableKeys[0] ?? null
}

function findKeyAfterCollapsedGroup<K extends CollectionKey>(
	previousNavigableKeys: readonly K[],
	nextNavigableKeys: readonly K[],
	collapsedKeys: ReadonlySet<K>,
): K | null {
	let lastCollapsedIndex = -1
	for (let index = 0; index < previousNavigableKeys.length; index += 1) {
		const key = previousNavigableKeys[index]
		if (key !== undefined && collapsedKeys.has(key)) {
			lastCollapsedIndex = index
		}
	}

	const nextNavigableKeySet = new Set(nextNavigableKeys)
	for (let index = lastCollapsedIndex + 1; index < previousNavigableKeys.length; index += 1) {
		const key = previousNavigableKeys[index]
		if (key !== undefined && nextNavigableKeySet.has(key)) {
			return key
		}
	}

	return null
}

function toEntryTarget<K extends CollectionKey>(key: K | null): CollectionEntryTarget<K> {
	return key === null ? { type: 'root' } : { type: 'item', key }
}

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
}>

export type CollectionProjection<K extends CollectionKey = CollectionKey> = Readonly<{
	eligibleKeys: readonly K[]
	eligibleIndexByKey: ReadonlyMap<K, number>
	navigableKeys: readonly K[]
	navigableIndexByKey: ReadonlyMap<K, number>
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
	const nextEligibleKeys = [...eligibleKeys]
	const nextNavigableKeys = [...navigableKeys]
	const eligibleIndexByKey = createUniqueKeyIndex(nextEligibleKeys, 'eligibleKeys')
	const navigableIndexByKey = createUniqueKeyIndex(nextNavigableKeys, 'navigableKeys')
	assertOrderedSubset(nextEligibleKeys, nextNavigableKeys)

	return {
		eligibleKeys: nextEligibleKeys,
		eligibleIndexByKey,
		navigableKeys: nextNavigableKeys,
		navigableIndexByKey,
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
	if (reason === 'incremental-load') {
		assertIncrementalProjection(previous.eligibleKeys, next.eligibleIndexByKey)
	}

	const selectedKeys = intersectKeys(state.selectedKeys, next.eligibleIndexByKey)
	const focusedKey =
		state.focusedKey === null || next.navigableIndexByKey.has(state.focusedKey)
			? state.focusedKey
			: findAdjacentKey(state.focusedKey, previous, next)
	const nextState =
		selectedKeys === state.selectedKeys && focusedKey === state.focusedKey
			? state
			: {
					selectedKeys,
					focusedKey,
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

	const reentryKey = findKeyAfterCollapsedGroup(previous, next, input.collapsedKeys)
	const reentry = toEntryTarget(reentryKey)

	return {
		state: {
			selectedKeys: state.selectedKeys,
			focusedKey: reentryKey,
		},
		focusIntent: {
			type: 'group-trigger',
			groupKey: input.groupKey,
			reentry,
		},
	}
}
function createUniqueKeyIndex<K extends CollectionKey>(keys: readonly K[], name: string) {
	const indexByKey = new Map<K, number>()
	for (const [index, key] of keys.entries()) {
		if (indexByKey.has(key)) {
			throw new Error(`${name} 包含重复 key：${key}`)
		}
		indexByKey.set(key, index)
	}
	return indexByKey
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
	nextEligibleIndexByKey: ReadonlyMap<K, number>,
) {
	for (const key of previousEligibleKeys) {
		if (!nextEligibleIndexByKey.has(key)) {
			throw new Error('incremental-load 不得移除已有 eligible key')
		}
	}
}

function intersectKeys<K extends CollectionKey>(
	selectedKeys: ReadonlySet<K>,
	eligibleIndexByKey: ReadonlyMap<K, number>,
): ReadonlySet<K> {
	for (const key of selectedKeys) {
		if (!eligibleIndexByKey.has(key)) {
			return new Set([...selectedKeys].filter((selectedKey) => eligibleIndexByKey.has(selectedKey)))
		}
	}
	return selectedKeys
}

function findAdjacentKey<K extends CollectionKey>(
	focusedKey: K,
	previous: CollectionProjection<K>,
	next: CollectionProjection<K>,
): K | null {
	const focusedIndex = previous.navigableIndexByKey.get(focusedKey)
	if (focusedIndex === undefined) {
		return next.navigableKeys[0] ?? null
	}

	for (let index = focusedIndex + 1; index < previous.navigableKeys.length; index += 1) {
		const key = previous.navigableKeys[index]
		if (key !== undefined && next.navigableIndexByKey.has(key)) {
			return key
		}
	}

	for (let index = focusedIndex - 1; index >= 0; index -= 1) {
		const key = previous.navigableKeys[index]
		if (key !== undefined && next.navigableIndexByKey.has(key)) {
			return key
		}
	}

	return next.navigableKeys[0] ?? null
}

function findKeyAfterCollapsedGroup<K extends CollectionKey>(
	previous: CollectionProjection<K>,
	next: CollectionProjection<K>,
	collapsedKeys: ReadonlySet<K>,
): K | null {
	let lastCollapsedIndex = -1
	for (const key of collapsedKeys) {
		const index = previous.navigableIndexByKey.get(key)
		if (index !== undefined && index > lastCollapsedIndex) {
			lastCollapsedIndex = index
		}
	}

	for (let index = lastCollapsedIndex + 1; index < previous.navigableKeys.length; index += 1) {
		const key = previous.navigableKeys[index]
		if (key !== undefined && next.navigableIndexByKey.has(key)) {
			return key
		}
	}

	return null
}

function toEntryTarget<K extends CollectionKey>(key: K | null): CollectionEntryTarget<K> {
	return key === null ? { type: 'root' } : { type: 'item', key }
}

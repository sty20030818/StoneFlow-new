import { useCallback, useMemo, useState } from 'react'

import {
	createCollectionProjection,
	reconcileCollapsedGroup,
	type CollectionFocusIntent,
	type CollectionKey,
} from './collectionState'
import { useCollectionInteraction, type CollectionInteraction } from './useCollectionInteraction'

export type CollectionGroup<K extends CollectionKey, G extends CollectionKey = CollectionKey> = {
	key: G
	itemKeys: readonly K[]
}

type UseGroupedCollectionInteractionOptions<
	K extends CollectionKey,
	G extends CollectionKey = CollectionKey,
> = {
	groups: readonly CollectionGroup<K, G>[]
	defaultOpenGroupKeys: readonly G[]
	defaultSelectedKeys?: readonly K[]
}

export type GroupedCollectionInteraction<
	K extends CollectionKey,
	G extends CollectionKey = CollectionKey,
> = {
	interaction: CollectionInteraction<K>
	openGroupKeys: ReadonlySet<G>
	focusIntent: CollectionFocusIntent<K, G> | null
	setGroupOpen: (groupKey: G, open: boolean) => void
	collapseAll: () => void
	expandAll: () => void
	consumeFocusIntent: (intent: CollectionFocusIntent<K, G>) => void
}

/**
 * 分组展开状态只决定 navigable keys；selection/focus 仍由阶段 H collection 唯一持有。
 */
export function useGroupedCollectionInteraction<
	K extends CollectionKey,
	G extends CollectionKey = CollectionKey,
>({
	groups,
	defaultOpenGroupKeys,
	defaultSelectedKeys = [],
}: UseGroupedCollectionInteractionOptions<K, G>): GroupedCollectionInteraction<K, G> {
	const [openGroupKeys, setOpenGroupKeys] = useState<Set<G>>(() => new Set(defaultOpenGroupKeys))
	const [focusIntent, setFocusIntent] = useState<CollectionFocusIntent<K, G> | null>(null)
	const eligibleKeys = useMemo(() => groups.flatMap((group) => group.itemKeys), [groups])
	const navigableKeys = useMemo(
		() => groups.flatMap((group) => (openGroupKeys.has(group.key) ? group.itemKeys : [])),
		[groups, openGroupKeys],
	)
	const interaction = useCollectionInteraction({
		eligibleKeys,
		navigableKeys,
		defaultSelectedKeys,
	})

	const applyOpenGroupKeys = useCallback(
		(nextOpenGroupKeys: Set<G>, collapsedGroupKey: G | null) => {
			let nextFocusIntent: CollectionFocusIntent<K, G> | null = null
			if (collapsedGroupKey) {
				const collapsedGroup = groups.find((group) => group.key === collapsedGroupKey)
				if (collapsedGroup) {
					const currentState = interaction.getSnapshot()
					const nextProjection = createCollectionProjection(
						eligibleKeys,
						groups.flatMap((group) => (nextOpenGroupKeys.has(group.key) ? group.itemKeys : [])),
					)
					const reconciliation = reconcileCollapsedGroup(
						currentState,
						interaction.projection,
						nextProjection,
						{
							groupKey: collapsedGroupKey,
							collapsedKeys: new Set(collapsedGroup.itemKeys),
						},
					)
					if (reconciliation.state.focusedKey !== currentState.focusedKey) {
						interaction.focusKey(reconciliation.state.focusedKey)
					}
					nextFocusIntent = reconciliation.focusIntent
				}
			}

			setFocusIntent(nextFocusIntent)
			setOpenGroupKeys(nextOpenGroupKeys)
		},
		[eligibleKeys, groups, interaction],
	)

	const setGroupOpen = useCallback(
		(groupKey: G, open: boolean) => {
			if (openGroupKeys.has(groupKey) === open) return
			const nextOpenGroupKeys = new Set(openGroupKeys)
			if (open) nextOpenGroupKeys.add(groupKey)
			else nextOpenGroupKeys.delete(groupKey)
			applyOpenGroupKeys(nextOpenGroupKeys, open ? null : groupKey)
		},
		[applyOpenGroupKeys, openGroupKeys],
	)

	const collapseAll = useCallback(() => {
		const focusedGroup = groups.find((group) =>
			interaction.focusedKey ? group.itemKeys.includes(interaction.focusedKey) : false,
		)
		applyOpenGroupKeys(new Set(), focusedGroup?.key ?? null)
	}, [applyOpenGroupKeys, groups, interaction.focusedKey])

	const expandAll = useCallback(() => {
		applyOpenGroupKeys(new Set(groups.map((group) => group.key)), null)
	}, [applyOpenGroupKeys, groups])

	const consumeFocusIntent = useCallback((consumed: CollectionFocusIntent<K, G>) => {
		setFocusIntent((current) => (current === consumed ? null : current))
	}, [])

	return {
		interaction,
		openGroupKeys,
		focusIntent,
		setGroupOpen,
		collapseAll,
		expandAll,
		consumeFocusIntent,
	}
}

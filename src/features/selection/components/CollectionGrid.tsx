import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
	type FocusEvent as ReactFocusEvent,
	type HTMLAttributes,
	type KeyboardEvent as ReactKeyboardEvent,
	type ReactNode,
	type Ref,
} from 'react'
import { mergeProps, useGridList, useGridListItem, type GridListItemAria } from 'react-aria'

import { cn } from '@/shared/lib/utils'

import { createCollectionFocusBridge } from '../model/collectionFocusBridge'
import type { CollectionFocusIntent, CollectionKey } from '../model/collectionState'
import type { CollectionInteraction } from '../model/useCollectionInteraction'
import { useCollectionKeyboardAdapter } from '../shortcuts/useCollectionKeyboardAdapter'

type CollectionGridRootProps<K extends CollectionKey, G extends CollectionKey = CollectionKey> = {
	interaction: CollectionInteraction<K>
	ariaLabel: string
	focusIntent?: CollectionFocusIntent<K, G> | null
	onFocusIntentConsumed?: (intent: CollectionFocusIntent<K, G>) => void
	onPreview?: (key: K) => void
	onActivate?: (key: K) => void
	children: (state: CollectionGridRootState<K>) => ReactNode
	className?: string
}

export type CollectionGridRootState<K extends CollectionKey> = {
	focusedKey: K | null
	focusSource: 'pointer' | 'keyboard' | null
	focusBridge: ReturnType<typeof createCollectionFocusBridge>
	onPointerFocus: (key: K) => void
	onPointerLeave: (key: K, restoreRootFocus: boolean) => void
	onContextMenuOpenChange: (key: K, open: boolean) => void
	onGroupTriggerBlur: (groupKey: CollectionKey) => void
}

/** 非虚拟列表的标准 React Aria Grid 根；不持有 selection/focus 状态。 */
export function CollectionGridRoot<
	K extends CollectionKey,
	G extends CollectionKey = CollectionKey,
>({
	interaction,
	ariaLabel,
	focusIntent = null,
	onFocusIntentConsumed,
	onPreview,
	onActivate,
	children,
	className,
}: CollectionGridRootProps<K, G>) {
	const [focusSource, setFocusSource] = useState<'pointer' | 'keyboard' | null>(null)
	const rootRef = useRef<HTMLDivElement | null>(null)
	const groupReentryRef = useRef<{
		groupKey: CollectionKey
		reentry: { type: 'item'; key: CollectionKey } | { type: 'root' }
	} | null>(null)
	const focusBridge = useMemo(
		() => createCollectionFocusBridge({ requestScroll: () => undefined }),
		[],
	)
	const { gridProps } = useGridList(
		{
			'aria-label': ariaLabel,
			disallowTypeAhead: true,
			keyboardNavigationBehavior: 'tab',
			escapeKeyBehavior: 'none',
			shouldSelectOnPressUp: true,
		},
		interaction.listState,
		rootRef,
	)
	const markKeyboardInteraction = useCallback(() => setFocusSource('keyboard'), [])
	const keyboard = useCollectionKeyboardAdapter({
		interaction,
		resolveRowKey: focusBridge.getItemKey as (target: HTMLElement) => K | null,
		requestFocus: focusBridge.requestFocus,
		onKeyboardInteraction: markKeyboardInteraction,
		onPreview,
		onActivate,
	})

	useEffect(() => {
		const root = rootRef.current
		return root ? focusBridge.registerRoot(root) : undefined
	}, [focusBridge])

	useEffect(() => {
		if (!focusIntent) return
		if (focusIntent.type === 'group-trigger') {
			groupReentryRef.current = {
				groupKey: focusIntent.groupKey,
				reentry: focusIntent.reentry,
			}
		}
		focusBridge.requestFocus(focusIntent)
		onFocusIntentConsumed?.(focusIntent)
	}, [focusBridge, focusIntent, onFocusIntentConsumed])

	const onPointerFocus = useCallback(
		(key: K) => {
			if (focusSource === 'pointer' && interaction.focusedKey === key) return
			setFocusSource('pointer')
			interaction.focusKey(key)
			focusBridge.requestFocus({ type: 'item', key })
		},
		[focusBridge, focusSource, interaction],
	)
	const onPointerLeave = useCallback(
		(key: K, restoreRootFocus: boolean) => {
			if (focusSource !== 'pointer' || interaction.focusedKey !== key) return
			interaction.focusKey(null)
			if (restoreRootFocus) rootRef.current?.focus({ preventScroll: true })
			setFocusSource(null)
		},
		[focusSource, interaction],
	)
	const onContextMenuOpenChange = useCallback(
		(key: K, open: boolean) => {
			if (open) {
				focusBridge.rememberTrigger(key)
				return
			}
			if (focusBridge.getTriggerKey() === key) {
				focusBridge.restoreTrigger({ type: 'item', key })
			}
		},
		[focusBridge],
	)
	const onGroupTriggerBlur = useCallback((groupKey: CollectionKey) => {
		if (groupReentryRef.current?.groupKey === groupKey) groupReentryRef.current = null
	}, [])
	const handleKeyDownCapture = useCallback(
		(event: ReactKeyboardEvent<HTMLDivElement>) => {
			const target = event.target
			const groupKey = target instanceof HTMLElement ? target.dataset.collectionGroupKey : undefined
			const pending = groupReentryRef.current
			const key = event.key.length === 1 ? event.key.toLowerCase() : event.key
			if (
				groupKey &&
				pending?.groupKey === groupKey &&
				!event.metaKey &&
				!event.ctrlKey &&
				!event.altKey &&
				(key === 'j' || key === 'ArrowDown')
			) {
				event.preventDefault()
				event.stopPropagation()
				markKeyboardInteraction()
				groupReentryRef.current = null
				focusBridge.requestFocus(pending.reentry)
				return
			}
			keyboard.onKeyDownCapture(event)
		},
		[focusBridge, keyboard, markKeyboardInteraction],
	)
	const handleFocusCapture = useCallback(
		(event: ReactFocusEvent<HTMLDivElement>) => {
			if (
				event.target !== event.currentTarget ||
				focusSource === 'pointer' ||
				(event.relatedTarget instanceof Node &&
					event.currentTarget.contains(event.relatedTarget)) ||
				!event.currentTarget.matches(':focus-visible')
			) {
				return
			}
			const entryKey = interaction.focusedKey ?? interaction.projection.navigableKeys[0]
			if (!entryKey) return
			markKeyboardInteraction()
			interaction.focusKey(entryKey)
			focusBridge.requestFocus({ type: 'item', key: entryKey })
		},
		[focusBridge, focusSource, interaction, markKeyboardInteraction],
	)
	const state = useMemo<CollectionGridRootState<K>>(
		() => ({
			focusedKey: interaction.focusedKey,
			focusSource,
			focusBridge,
			onPointerFocus,
			onPointerLeave,
			onContextMenuOpenChange,
			onGroupTriggerBlur,
		}),
		[
			focusBridge,
			focusSource,
			interaction.focusedKey,
			onContextMenuOpenChange,
			onGroupTriggerBlur,
			onPointerFocus,
			onPointerLeave,
		],
	)

	return (
		<div
			{...gridProps}
			ref={rootRef}
			aria-rowcount={interaction.projection.navigableKeys.length}
			className={cn('outline-none', className)}
			onFocusCapture={handleFocusCapture}
			onKeyDownCapture={handleKeyDownCapture}
		>
			{children(state)}
		</div>
	)
}

type CollectionGridRowRenderProps = {
	rowProps: HTMLAttributes<HTMLElement>
	gridCellProps: GridListItemAria['gridCellProps']
	rowRef: Ref<HTMLDivElement>
	onContextMenuOpenChange: (open: boolean) => void
}

type CollectionGridGroupTriggerRenderProps = {
	triggerRef: Ref<HTMLButtonElement>
	onBlur: () => void
}

type CollectionGridGroupTriggerProps<K extends CollectionKey> = {
	rootState: CollectionGridRootState<K>
	groupKey: CollectionKey
	children: (props: CollectionGridGroupTriggerRenderProps) => ReactNode
}

/** 把分组 toggle 注册为折叠后的真实焦点落点。 */
export function CollectionGridGroupTrigger<K extends CollectionKey>({
	rootState,
	groupKey,
	children,
}: CollectionGridGroupTriggerProps<K>) {
	const unregisterRef = useRef<(() => void) | null>(null)
	const setTriggerRef = useCallback(
		(element: HTMLButtonElement | null) => {
			unregisterRef.current?.()
			unregisterRef.current = null
			if (element) {
				unregisterRef.current = rootState.focusBridge.registerGroupTrigger(groupKey, element)
			}
		},
		[groupKey, rootState.focusBridge],
	)
	useEffect(() => () => unregisterRef.current?.(), [])

	return children({
		triggerRef: setTriggerRef,
		onBlur: () => rootState.onGroupTriggerBlur(groupKey),
	})
}

type CollectionGridRowProps<K extends CollectionKey> = {
	interaction: CollectionInteraction<K>
	rootState: CollectionGridRootState<K>
	itemKey: K
	children: (props: CollectionGridRowRenderProps) => ReactNode
}

/** 把已挂载行接到同一 listState 与 DOM focus bridge。 */
export function CollectionGridRow<K extends CollectionKey>({
	interaction,
	rootState,
	itemKey,
	children,
}: CollectionGridRowProps<K>) {
	const rowRef = useRef<HTMLDivElement | null>(null)
	const unregisterRef = useRef<(() => void) | null>(null)
	const node = interaction.listState.collection.getItem(itemKey)
	if (!node) throw new Error(`Collection 缺少实体：${itemKey}`)
	const { rowProps, gridCellProps } = useGridListItem(
		{ node, shouldSelectOnPressUp: true },
		interaction.listState,
		rowRef,
	)
	const setRowRef = useCallback(
		(element: HTMLDivElement | null) => {
			unregisterRef.current?.()
			unregisterRef.current = null
			rowRef.current = element
			if (element) unregisterRef.current = rootState.focusBridge.registerItem(itemKey, element)
		},
		[itemKey, rootState.focusBridge],
	)
	useEffect(() => () => unregisterRef.current?.(), [])

	return children({
		rowProps: mergeProps(rowProps, {
			onPointerMove: () => rootState.onPointerFocus(itemKey),
			onPointerLeave: () =>
				rootState.onPointerLeave(itemKey, rowRef.current === document.activeElement),
		}),
		gridCellProps,
		rowRef: setRowRef,
		onContextMenuOpenChange: (open) => rootState.onContextMenuOpenChange(itemKey, open),
	})
}

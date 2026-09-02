import {
	memo,
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
	type FocusEvent as ReactFocusEvent,
	type KeyboardEvent as ReactKeyboardEvent,
	type ReactNode,
	type Ref,
} from 'react'
import { mergeProps, useGridList, useGridListItem } from 'react-aria'
import { Alert, Button, Chip, Skeleton } from '@heroui/react'
import { ContextMenu, EmptyState } from '@heroui-pro/react'
import { defaultRangeExtractor, useVirtualizer, type Range } from '@tanstack/react-virtual'
import { registerTaskBoardFocusTaskId } from './taskBoardFocus'
import { useScrollAreaViewport } from '@/shared/components/AppScrollArea'
import {
	buildTaskBoardItemOffsets,
	buildTaskBoardVirtualLayout,
	listTaskBoardStickyIndexes,
	resolveTaskBoardAnchorScrollTop,
	type TaskBoardFlatItem,
} from '@/features/task/model/taskBoardModel'
import { useTaskBoardSticky } from '@/features/task/hooks/useTaskBoardSticky'

import {
	createCollectionFocusBridge,
	useCollectionKeyboardAdapter,
	type CollectionEntryTarget,
	type CollectionFocusIntent,
	type CollectionInteraction,
} from '@/features/selection'
import {
	BoardRowSlot,
	BoardSectionContextMenu,
	BoardSectionHeader,
	COLLECTION_ROW_HEIGHT,
	COLLECTION_ROW_SIZE,
	COLLECTION_SECTION_HEADER_HEIGHT,
	COLLECTION_SECTION_HEADER_SIZE,
	getBoardRowSelectionPosition,
} from '@/shared/components/board'
import { useDialogStore } from '@/features/shell-dialogs'
import type { TaskDisplayPropertyKey } from '@/features/display-options'
import { type TaskPriorityValue } from '@/features/task/model/taskPriority'
import {
	TaskRowAdapter,
	TaskRowAriaFrameProvider,
	type TaskRowAdapterProps,
} from '@/features/task/components/TaskRowAdapter'
import { buildTaskBoardCollection } from '@/features/task/model/taskBoardCollection'
import { TaskStatusIndicator } from '@/features/task/model/indicators/TaskStatusIndicator'
import { useTaskContextMenuBulkActions } from '@/features/task/components/useTaskContextMenuBulkActions'
import { useTaskRowCommandShortcuts } from '@/features/task/shortcuts/useTaskRowCommandShortcuts'
import { COMMAND_IDS, useCommandRuntimeContext, type CommandId } from '@/features/command'
import { buildTaskCommandContext } from '@/features/task/commands/buildTaskCommandContext'
import type { TaskPlacementTarget } from '@/features/metadata-fields'
import type { TaskListItem, TaskStatus } from '@/shared/types'
import { ListTodoIcon, PlusIcon, TriangleIcon } from 'lucide-react'
import { ActionTooltip, OverflowTooltip } from '@/shared/components/tooltip'
import { cn } from '@/shared/lib/utils'
import { useLatestRef } from '@/shared/lib/useLatestRef'

type TaskBoardPaginationSource = {
	sourceKey: string
	loadedPageCount: number
	totalCount?: number
}

export type TaskBoardPagination = TaskBoardPaginationSource &
	(
		| {
				state: 'exhausted'
		  }
		| {
				state: 'idle' | 'loading'
				fetchNextPage: () => Promise<unknown>
		  }
		| {
				state: 'error'
				error: string
				fetchNextPage: () => Promise<unknown>
		  }
	)

const TASK_BOARD_PAGINATION_SENTINEL_KEY = 'task-board-pagination-sentinel'

export type TaskBoardProps = {
	tasks: TaskListItem[]
	flatItems: readonly TaskBoardFlatItem[]
	collectionInteraction: CollectionInteraction<string>
	focusIntent: CollectionFocusIntent<string, string> | null
	onFocusIntentConsumed: (intent: CollectionFocusIntent<string, string>) => void
	status?: 'idle' | 'loading' | 'ready' | 'error'
	createProjectId?: string | null
	activeTaskId?: string | null
	pendingTaskId: string | null
	emptyTitle?: string
	emptyDescription?: string
	emptyActionLabel?: string
	onEmptyAction: () => void
	onRetry: () => void | Promise<unknown>
	onSectionOpenChange: (groupKey: string, status: TaskStatus, open: boolean) => void
	onCollapseAll: () => void
	onExpandAll: () => void
	onUpdateTaskPriority: (task: TaskListItem, priority: TaskPriorityValue) => Promise<void>
	onUpdateTaskStatus: (task: TaskListItem, status: TaskStatus) => Promise<void>
	onUpdateTaskDueDate?: (task: TaskListItem, dueAt: string | null) => Promise<void>
	onUpdateTaskScheduledAt?: (task: TaskListItem, plannedAt: string | null) => Promise<void>
	onUpdateTaskReminderAt?: (task: TaskListItem, remindAt: string | null) => Promise<void>
	onToggleTaskStatus: (task: TaskListItem) => Promise<void>
	suppressFocusIndicator?: boolean
	projectOptions?: Array<{ id: string; name: string; spaceId: string }>
	spaces?: Array<{
		id: string
		name: string
		iconKey?: string
		colorKey?: string
	}>
	onSelectPlacement?: (task: TaskListItem, target: TaskPlacementTarget) => void
	showProjectCellOptions?: boolean
	showSpaceLabel?: boolean
	visibleProperties?: TaskDisplayPropertyKey[]
	pagination: TaskBoardPagination
}

type TaskBoardImplProps = TaskBoardProps & {
	isVirtualized: boolean
}

/**
 * 任务 Board：状态分区 sticky + 虚拟行。
 * 几何见 collectionGeometry；滚动容器来自 AppScrollArea context。
 */
export function TaskBoard(props: TaskBoardProps) {
	return <TaskBoardImpl {...props} isVirtualized />
}

/** Ticket 03 一次性普通列表候选；不进入 task 公共出口，决策后随 benchmark 删除。 */
export function TaskBoardOrdinaryCandidate(props: TaskBoardProps) {
	return <TaskBoardImpl {...props} isVirtualized={false} />
}

function TaskBoardImpl({
	tasks,
	flatItems,
	collectionInteraction,
	focusIntent,
	onFocusIntentConsumed,
	status = 'ready',
	createProjectId = null,
	activeTaskId = null,
	pendingTaskId,
	emptyTitle,
	emptyDescription,
	emptyActionLabel,
	onEmptyAction,
	onRetry,
	onSectionOpenChange,
	onCollapseAll,
	onExpandAll,
	onUpdateTaskPriority,
	onUpdateTaskStatus,
	onUpdateTaskDueDate,
	onUpdateTaskScheduledAt,
	onUpdateTaskReminderAt,
	onToggleTaskStatus,
	suppressFocusIndicator = false,
	projectOptions,
	spaces,
	onSelectPlacement,
	showProjectCellOptions = true,
	showSpaceLabel = false,
	visibleProperties,
	pagination,
	isVirtualized,
}: TaskBoardImplProps) {
	const selectedTaskIdSet = collectionInteraction.selectedKeys
	const focusedTaskId = collectionInteraction.focusedKey
	const { runtime: commandRuntime, context: commandContext } = useCommandRuntimeContext()
	const [focusSource, setFocusSource] = useState<'pointer' | 'keyboard' | null>(null)
	const focusSnapshotRef = useLatestRef({ source: focusSource, taskId: focusedTaskId })
	const markKeyboardInteraction = useCallback(() => {
		focusSnapshotRef.current = {
			source: 'keyboard',
			taskId: focusSnapshotRef.current.taskId,
		}
		setFocusSource('keyboard')
	}, [focusSnapshotRef])
	const contextMenuActions = useTaskContextMenuBulkActions()
	const openTaskCreateDialog = useDialogStore((state) => state.openTaskCreateDialog)
	const scrollViewport = useScrollAreaViewport()
	const commandSnapshotRef = useLatestRef({
		runtime: commandRuntime,
		context: commandContext,
		tasks,
	})
	const activateTask = useCallback(
		(task: TaskListItem, source: 'pointer' | 'keyboard' | null) => {
			const { runtime, context } = commandSnapshotRef.current
			const target = buildTaskCommandContext({
				baseContext: context,
				tasks: [task],
				targetTaskIds: [task.id],
				focusedTaskId: task.id,
				rowTargetId: task.id,
				rowTargetSource: source === 'keyboard' ? 'focus' : 'hover',
			})
			void runtime.project(COMMAND_IDS.taskOpenDetail, target)?.execute({ source: 'row' })
		},
		[commandSnapshotRef],
	)
	const projectContextMenuCommand = useCallback(
		(
			commandId: CommandId,
			task: TaskListItem,
			targets: TaskListItem[],
			clearSelection: boolean,
		) => {
			const { runtime, context } = commandSnapshotRef.current
			return runtime.project(
				commandId,
				buildTaskCommandContext({
					baseContext: context,
					tasks: targets,
					targetTaskIds: targets.map((item) => item.id),
					focusedTaskId: task.id,
					rowTargetId: task.id,
					rowTargetSource: 'context-menu',
					clearSelection: clearSelection ? context.selection.clearSelection : undefined,
				}),
			)
		},
		[commandSnapshotRef],
	)

	const groupedTasks = useMemo(() => {
		const map: Record<TaskStatus, TaskListItem[]> = {
			todo: [],
			doing: [],
			waiting: [],
			done: [],
			canceled: [],
		}
		for (const task of tasks) {
			map[task.status].push(task)
		}
		return map
	}, [tasks])
	const selectedTasks = useMemo(
		() => tasks.filter((task) => selectedTaskIdSet.has(task.id)),
		[selectedTaskIdSet, tasks],
	)
	const boardCollection = useMemo(
		() =>
			buildTaskBoardCollection({
				eligibleKeys: collectionInteraction.projection.eligibleKeys,
				flatItems,
			}),
		[collectionInteraction.projection.eligibleKeys, flatItems],
	)
	const setSectionSelection = useCallback(
		(taskIds: readonly string[], selected: boolean) => {
			const nextSelectedKeys = new Set(collectionInteraction.selectedKeys)
			for (const taskId of taskIds) {
				if (selected) nextSelectedKeys.add(taskId)
				else nextSelectedKeys.delete(taskId)
			}
			collectionInteraction.listState.selectionManager.setSelectedKeys(nextSelectedKeys)
		},
		[collectionInteraction.listState.selectionManager, collectionInteraction.selectedKeys],
	)

	const stickyIndexes = useMemo(
		() => (isVirtualized ? listTaskBoardStickyIndexes(flatItems) : []),
		[flatItems, isVirtualized],
	)
	const itemOffsets = useMemo(() => buildTaskBoardItemOffsets(flatItems), [flatItems])
	const virtualLayout = useMemo(
		() => (isVirtualized ? buildTaskBoardVirtualLayout(flatItems) : null),
		[flatItems, isVirtualized],
	)
	const contentHeightPx = virtualLayout?.contentHeightPx ?? 0
	const sentinelIndex = flatItems.length
	const virtualCount = virtualLayout?.virtualCount ?? 0

	const { stickyShellRef, stickyPushLayerRef, stickyActiveIndex, stickyStuck, nextStickyIndex } =
		useTaskBoardSticky({
			scrollViewport,
			stickyIndexes,
			itemOffsets,
			enabled: isVirtualized && status === 'ready',
		})

	const rowActions = useMemo(
		(): TaskRowAdapterProps['actions'] => ({
			onActivateTask: activateTask,
			projectContextMenuCommand,
			onToggleTaskSelection: collectionInteraction.toggleSelection,
			onUpdateTaskPriority,
			onUpdateTaskStatus,
			onUpdateTaskDueDate,
			onUpdateTaskScheduledAt,
			onUpdateTaskReminderAt,
			onToggleTaskStatus,
		}),
		[
			activateTask,
			collectionInteraction.toggleSelection,
			onToggleTaskStatus,
			onUpdateTaskDueDate,
			onUpdateTaskPriority,
			onUpdateTaskReminderAt,
			onUpdateTaskScheduledAt,
			onUpdateTaskStatus,
			projectContextMenuCommand,
		],
	)

	const projectBinding = useMemo(
		(): TaskRowAdapterProps['projectBinding'] => ({
			projectOptions,
			spaces,
			onSelectPlacement,
			showProjectCellOptions,
		}),
		[onSelectPlacement, projectOptions, showProjectCellOptions, spaces],
	)

	const rangeExtractor = useCallback(
		(range: Range) => {
			// 强制保留当前 + 下一个分区 header，保证顶替过程中两者同时在 DOM
			const active =
				[...stickyIndexes].reverse().find((index) => range.startIndex >= index) ??
				stickyIndexes[0] ??
				0
			const activePos = stickyIndexes.indexOf(active)
			const nextSticky =
				activePos >= 0 && activePos < stickyIndexes.length - 1
					? stickyIndexes[activePos + 1]
					: undefined
			const next = new Set(
				[active, nextSticky, ...defaultRangeExtractor(range)].filter(
					(index): index is number => typeof index === 'number',
				),
			)
			return [...next].sort((a, b) => a - b)
		},
		[stickyIndexes],
	)
	const getScrollElement = useCallback(() => scrollViewport, [scrollViewport])
	const estimateSize = useCallback(
		(index: number) =>
			index === sentinelIndex
				? COLLECTION_ROW_SIZE
				: flatItems[index]?.kind === 'header'
					? COLLECTION_SECTION_HEADER_SIZE
					: COLLECTION_ROW_SIZE,
		[flatItems, sentinelIndex],
	)
	const getItemKey = useCallback(
		(index: number) => flatItems[index]?.key ?? TASK_BOARD_PAGINATION_SENTINEL_KEY,
		[flatItems],
	)

	const virtualizer = useVirtualizer({
		enabled: isVirtualized,
		count: virtualCount,
		getScrollElement,
		estimateSize,
		getItemKey,
		overscan: 6,
		initialRect: { width: 960, height: 720 },
		rangeExtractor,
	})
	const scrollToCollectionKey = useCallback(
		(key: string) => {
			const index = boardCollection.flatIndexByKey.get(key)
			const viewport = scrollViewport
			const start = index === undefined ? undefined : itemOffsets[index]
			const item = index === undefined ? undefined : flatItems[index]
			if (!viewport || start === undefined || !item) return
			const end =
				start + (item.kind === 'header' ? COLLECTION_SECTION_HEADER_SIZE : COLLECTION_ROW_SIZE)
			const viewportStart = viewport.scrollTop + COLLECTION_SECTION_HEADER_SIZE
			const viewportEnd = viewport.scrollTop + viewport.clientHeight
			if (start >= viewportStart && end <= viewportEnd) return
			viewport.scrollTo({
				top: Math.max(
					0,
					start < viewportStart
						? start - COLLECTION_SECTION_HEADER_SIZE
						: end - viewport.clientHeight,
				),
			})
		},
		[boardCollection.flatIndexByKey, flatItems, itemOffsets, scrollViewport],
	)
	const scrollToCollectionKeyRef = useRef(scrollToCollectionKey)
	scrollToCollectionKeyRef.current = scrollToCollectionKey
	const focusBridge = useMemo(
		() =>
			createCollectionFocusBridge({
				requestScroll: (key) => scrollToCollectionKeyRef.current(key),
			}),
		[],
	)
	const requestVisibleFocus = useCallback(
		(intent: CollectionFocusIntent<string, string>) =>
			focusBridge.requestFocus(intent, { ensureVisible: true }),
		[focusBridge],
	)
	const focusCollectionStateKey = collectionInteraction.focusKey
	const navigableTaskKeys = collectionInteraction.projection.navigableKeys
	const focusCollectionKey = useCallback(
		(key: string) => {
			if (!navigableTaskKeys.includes(key)) return
			markKeyboardInteraction()
			focusCollectionStateKey(key)
			requestVisibleFocus({ type: 'item', key })
		},
		[focusCollectionStateKey, markKeyboardInteraction, navigableTaskKeys, requestVisibleFocus],
	)
	const gridRef = useRef<HTMLDivElement | null>(null)
	const emptyActionRef = useRef<HTMLButtonElement | null>(null)
	const focusTaskBoardTarget = useCallback(
		(key: string) => {
			if (navigableTaskKeys.includes(key)) {
				focusCollectionKey(key)
				return
			}
			const fallbackTarget = gridRef.current ?? emptyActionRef.current
			fallbackTarget?.focus({ preventScroll: true })
		},
		[focusCollectionKey, navigableTaskKeys],
	)
	const groupReentryRef = useRef<{
		groupKey: string
		reentry: CollectionEntryTarget<string>
	} | null>(null)
	const { gridProps } = useGridList(
		{
			'aria-label': '任务列表',
			disallowTypeAhead: true,
			isVirtualized,
			keyboardNavigationBehavior: 'tab',
			escapeKeyBehavior: 'none',
			shouldSelectOnPressUp: true,
		},
		collectionInteraction.listState,
		gridRef,
	)
	const currentListState = collectionInteraction.listState
	const currentSelectionManager = currentListState.selectionManager
	// react-stately 每次父渲染都会换 listState 外壳；Row 只在交互语义变化时接收新快照。
	const rowListState = useMemo(
		// eslint-disable-next-line react-hooks/exhaustive-deps -- listState 外壳身份不是语义依赖
		() => currentListState,
		// eslint-disable-next-line react-hooks/exhaustive-deps -- 只在 Row 读取的交互语义变化时更新
		[
			currentListState.collection,
			currentListState.disabledKeys,
			currentSelectionManager.childFocusStrategy,
			currentSelectionManager.disabledBehavior,
			currentSelectionManager.focusedKey,
			currentSelectionManager.isFocused,
			currentSelectionManager.selectedKeys,
			currentSelectionManager.selectionBehavior,
		],
	)
	const executeCollectionCommand = useCallback(
		(commandId: CommandId, taskId: string) => {
			const { runtime, context, tasks: currentTasks } = commandSnapshotRef.current
			const target = buildTaskCommandContext({
				baseContext: context,
				tasks: currentTasks,
				targetTaskIds: [taskId],
				focusedTaskId: taskId,
				rowTargetId: taskId,
				rowTargetSource: 'focus',
			})
			void runtime.project(commandId, target)?.execute({ source: 'row-shortcut' })
		},
		[commandSnapshotRef],
	)
	const isRangeStepWithinGroup = useCallback(
		(fromKey: string, toKey: string) => {
			for (const groupKeys of boardCollection.rowKeysByGroupKey.values()) {
				if (groupKeys.has(fromKey)) return groupKeys.has(toKey)
			}
			return false
		},
		[boardCollection.rowKeysByGroupKey],
	)
	const toggleRangeStep = collectionInteraction.toggleRangeStep
	const toggleBoardRangeStep = useCallback(
		(direction: -1 | 1) => toggleRangeStep(direction, isRangeStepWithinGroup),
		[isRangeStepWithinGroup, toggleRangeStep],
	)
	const keyboardInteraction = useMemo(
		() => ({
			projection: collectionInteraction.projection,
			focusedKey: focusedTaskId,
			focusKey: focusCollectionStateKey,
			toggleSelection: collectionInteraction.toggleSelection,
			toggleRangeStep: toggleBoardRangeStep,
			selectEligibleKeys: collectionInteraction.selectEligibleKeys,
		}),
		[
			collectionInteraction.projection,
			collectionInteraction.selectEligibleKeys,
			collectionInteraction.toggleSelection,
			focusCollectionStateKey,
			focusedTaskId,
			toggleBoardRangeStep,
		],
	)
	const keyboard = useCollectionKeyboardAdapter({
		interaction: keyboardInteraction,
		resolveRowKey: focusBridge.getItemKey,
		requestFocus: requestVisibleFocus,
		onKeyboardInteraction: markKeyboardInteraction,
		onPreview: (taskId) => executeCollectionCommand(COMMAND_IDS.taskPeek, taskId),
		onActivate: (taskId) => executeCollectionCommand(COMMAND_IDS.taskOpenDetail, taskId),
	})
	useTaskRowCommandShortcuts({
		tasks,
		focusedTaskId,
		selectedTaskIds: selectedTaskIdSet,
		ownsEventTarget: (target) =>
			target === gridRef.current || focusBridge.getItemKey(target) !== null,
		onClearTaskSelection: collectionInteraction.clearSelection,
		onKeyboardInteraction: markKeyboardInteraction,
	})

	useEffect(() => {
		const root = gridRef.current
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
		requestVisibleFocus(focusIntent)
		onFocusIntentConsumed(focusIntent)
	}, [focusIntent, onFocusIntentConsumed, requestVisibleFocus])

	const handleGroupTriggerKeyDown = useCallback(
		(groupKey: string, event: ReactKeyboardEvent<HTMLElement>) => {
			const pending = groupReentryRef.current
			const key = event.key.length === 1 ? event.key.toLowerCase() : event.key
			if (
				pending?.groupKey !== groupKey ||
				event.metaKey ||
				event.ctrlKey ||
				event.altKey ||
				(key !== 'j' && key !== 'ArrowDown')
			) {
				return
			}

			event.preventDefault()
			event.stopPropagation()
			markKeyboardInteraction()
			groupReentryRef.current = null
			if (pending.reentry.type === 'root') return
			requestVisibleFocus(pending.reentry)
		},
		[markKeyboardInteraction, requestVisibleFocus],
	)
	const handleRootKeyDownCapture = useCallback(
		(event: ReactKeyboardEvent<HTMLDivElement>) => {
			const target = event.target
			if (target instanceof HTMLElement) {
				const groupKey = target.dataset.collectionGroupKey
				if (groupKey) handleGroupTriggerKeyDown(groupKey, event)
			}
			if (!event.isPropagationStopped()) keyboard.onKeyDownCapture(event)
		},
		[handleGroupTriggerKeyDown, keyboard],
	)
	const handleRootFocusCapture = useCallback(
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

			const entryKey = focusedTaskId ?? navigableTaskKeys[0]
			if (entryKey) focusCollectionKey(entryKey)
		},
		[focusCollectionKey, focusSource, focusedTaskId, navigableTaskKeys],
	)
	const handleGroupTriggerBlur = useCallback((groupKey: string) => {
		if (groupReentryRef.current?.groupKey === groupKey) {
			groupReentryRef.current = null
		}
	}, [])
	const handlePointerFocusTask = useCallback(
		(taskId: string) => {
			const snapshot = focusSnapshotRef.current
			if (snapshot.source === 'pointer' && snapshot.taskId === taskId) return
			focusSnapshotRef.current = { source: 'pointer', taskId }
			setFocusSource('pointer')
			focusCollectionStateKey(taskId)
			focusBridge.requestFocus({ type: 'item', key: taskId })
		},
		[focusBridge, focusCollectionStateKey, focusSnapshotRef],
	)
	const handlePointerLeaveTask = useCallback(
		(taskId: string, restoreRootFocus: boolean) => {
			const snapshot = focusSnapshotRef.current
			if (snapshot.source !== 'pointer' || snapshot.taskId !== taskId) return
			focusSnapshotRef.current = { source: null, taskId: null }
			focusCollectionStateKey(null)
			if (restoreRootFocus) gridRef.current?.focus({ preventScroll: true })
			setFocusSource(null)
		},
		[focusCollectionStateKey, focusSnapshotRef],
	)

	const renderTaskRow = useCallback(
		(task: TaskListItem) => {
			// 未多选时不传 contextTasks，避免每帧 [task] 新数组打穿 memo
			const contextTasks = selectedTaskIdSet.has(task.id) ? selectedTasks : undefined
			const ariaRowIndex = boardCollection.rowOrdinalByKey.get(task.id)
			if (ariaRowIndex === undefined) {
				throw new Error(`TaskBoard collection 缺少任务序号：${task.id}`)
			}
			const isFocused = focusedTaskId === task.id
			return (
				<TaskBoardGridRow
					actions={rowActions}
					ariaRowIndex={ariaRowIndex}
					contextMenuActions={contextMenuActions}
					contextTasks={contextTasks}
					focusBridge={focusBridge}
					focusSource={isFocused ? focusSource : null}
					isActive={activeTaskId === task.id}
					isFocused={isFocused}
					isPending={pendingTaskId === task.id}
					isSelected={selectedTaskIdSet.has(task.id)}
					isVirtualized={isVirtualized}
					listState={rowListState}
					onPointerFocusTask={handlePointerFocusTask}
					onPointerLeaveTask={handlePointerLeaveTask}
					projectBinding={projectBinding}
					showSpaceLabel={showSpaceLabel}
					suppressFocusIndicator={suppressFocusIndicator}
					task={task}
					visibleProperties={visibleProperties}
				/>
			)
		},
		[
			activeTaskId,
			boardCollection.rowOrdinalByKey,
			contextMenuActions,
			focusBridge,
			focusSource,
			focusedTaskId,
			handlePointerFocusTask,
			handlePointerLeaveTask,
			isVirtualized,
			pendingTaskId,
			projectBinding,
			rowListState,
			rowActions,
			selectedTaskIdSet,
			showSpaceLabel,
			selectedTasks,
			suppressFocusIndicator,
			visibleProperties,
		],
	)

	const virtualItems = virtualizer.getVirtualItems()
	const appendAnchorRef = useRef<{
		key: string
		offsetPx: number
		scrollTop: number
		loadedPageCount: number
	} | null>(null)
	const fetchInFlightRef = useRef<Promise<unknown> | null>(null)
	const captureAppendAnchor = useCallback(() => {
		if (!isVirtualized) return
		const viewport = scrollViewport
		if (!viewport) return
		const firstVisibleItem = virtualItems.find(
			(item) =>
				item.index < sentinelIndex &&
				item.end > viewport.scrollTop &&
				flatItems[item.index] !== undefined,
		)
		const key = firstVisibleItem ? flatItems[firstVisibleItem.index]?.key : undefined
		if (!firstVisibleItem || !key) return
		appendAnchorRef.current = {
			key,
			offsetPx: viewport.scrollTop - firstVisibleItem.start,
			scrollTop: viewport.scrollTop,
			loadedPageCount: pagination.loadedPageCount,
		}
	}, [
		flatItems,
		isVirtualized,
		pagination.loadedPageCount,
		scrollViewport,
		sentinelIndex,
		virtualItems,
	])
	const requestNextPage = useCallback(() => {
		if (
			pagination.state === 'exhausted' ||
			pagination.state === 'loading' ||
			fetchInFlightRef.current
		) {
			return
		}

		captureAppendAnchor()
		const request = Promise.resolve().then(pagination.fetchNextPage)
		fetchInFlightRef.current = request
		void request
			.finally(() => {
				if (fetchInFlightRef.current === request) fetchInFlightRef.current = null
			})
			.catch(() => undefined)
	}, [captureAppendAnchor, pagination])
	const ordinarySentinelRef = useRef<HTMLDivElement | null>(null)
	const [ordinarySentinelIntersection, setOrdinarySentinelIntersection] = useState<{
		sourceKey: string
		isVisible: boolean
	} | null>(null)
	useEffect(() => {
		const sentinel = ordinarySentinelRef.current
		if (
			isVirtualized ||
			!scrollViewport ||
			!sentinel ||
			status !== 'ready' ||
			typeof IntersectionObserver === 'undefined'
		) {
			return
		}

		const observer = new IntersectionObserver(
			(entries) =>
				setOrdinarySentinelIntersection({
					sourceKey: pagination.sourceKey,
					isVisible: entries.some((entry) => entry.isIntersecting),
				}),
			{ root: scrollViewport },
		)
		observer.observe(sentinel)
		return () => observer.disconnect()
	}, [isVirtualized, pagination.sourceKey, scrollViewport, status])
	const sentinelMounted = isVirtualized
		? virtualItems.some((item) => item.index === sentinelIndex)
		: ordinarySentinelIntersection?.sourceKey === pagination.sourceKey &&
			ordinarySentinelIntersection.isVisible
	const sentinelEnteredRef = useRef(false)
	const resetPaginationSession = useCallback(() => {
		sentinelEnteredRef.current = false
		fetchInFlightRef.current = null
		appendAnchorRef.current = null
	}, [])

	useLayoutEffect(() => resetPaginationSession(), [pagination.sourceKey, resetPaginationSession])

	useEffect(() => {
		if (!sentinelMounted) {
			sentinelEnteredRef.current = false
			return
		}
		if (status !== 'ready') {
			resetPaginationSession()
			return
		}
		if (sentinelEnteredRef.current) return
		sentinelEnteredRef.current = true
		if (pagination.state === 'idle') requestNextPage()
	}, [pagination.state, requestNextPage, resetPaginationSession, sentinelMounted, status])

	useLayoutEffect(() => {
		if (!isVirtualized) {
			appendAnchorRef.current = null
			return
		}
		const anchor = appendAnchorRef.current
		if (!anchor) return
		if (pagination.loadedPageCount <= anchor.loadedPageCount) {
			if (pagination.state === 'error' || pagination.state === 'exhausted') {
				appendAnchorRef.current = null
			}
			return
		}

		appendAnchorRef.current = null
		const viewport = scrollViewport
		if (!viewport || Math.abs(viewport.scrollTop - anchor.scrollTop) > 1) return
		const nextScrollTop = resolveTaskBoardAnchorScrollTop(
			anchor,
			boardCollection.flatIndexByKey,
			itemOffsets,
		)
		if (nextScrollTop !== null) viewport.scrollTop = nextScrollTop
	}, [
		boardCollection.flatIndexByKey,
		isVirtualized,
		itemOffsets,
		pagination.loadedPageCount,
		pagination.state,
		scrollViewport,
	])

	const stickyHeaderItem = flatItems[stickyActiveIndex]
	const stickyHeader = stickyHeaderItem?.kind === 'header' ? stickyHeaderItem : null

	useLayoutEffect(() => {
		registerTaskBoardFocusTaskId(focusTaskBoardTarget)
		return () => {
			registerTaskBoardFocusTaskId(null)
		}
	}, [focusTaskBoardTarget])

	if (status === 'idle' || status === 'loading') {
		return <TaskBoardLoadingState />
	}

	if (status === 'error') {
		return (
			<Alert role='alert' status='danger'>
				<Alert.Indicator />
				<Alert.Content>
					<Alert.Title>读取任务失败</Alert.Title>
					<Alert.Description>任务数据暂时无法读取，请稍后重试。</Alert.Description>
				</Alert.Content>
				<Button onPress={() => void onRetry()} size='sm' type='button' variant='danger-soft'>
					重试
				</Button>
			</Alert>
		)
	}

	if (status === 'ready' && tasks.length === 0 && emptyTitle) {
		return (
			<TaskBoardEmptyState
				actionRef={emptyActionRef}
				actionLabel={emptyActionLabel}
				description={emptyDescription}
				icon={<ListTodoIcon />}
				onAction={onEmptyAction}
				title={emptyTitle}
			/>
		)
	}
	const hideListHeaderIndex = stickyStuck ? stickyActiveIndex : -1
	const renderHeader = (
		item: Extract<TaskBoardFlatItem, { kind: 'header' }>,
		registerTrigger: boolean,
	) => (
		<StatusSectionHeader
			count={item.count}
			createProjectId={createProjectId}
			groupKey={item.key}
			label={item.label}
			onCollapseAll={onCollapseAll}
			onExpandAll={onExpandAll}
			onGroupTriggerBlur={handleGroupTriggerBlur}
			onOpenChange={
				item.status ? (open) => onSectionOpenChange(item.key, item.status!, open) : undefined
			}
			onSetSectionSelection={setSectionSelection}
			open={item.open}
			openTaskCreateDialog={openTaskCreateDialog}
			registerGroupTrigger={registerTrigger ? focusBridge.registerGroupTrigger : undefined}
			selectedTaskIdSet={selectedTaskIdSet}
			status={item.status}
			tasks={item.status ? groupedTasks[item.status] : []}
		/>
	)
	const renderItemContent = (item: TaskBoardFlatItem, index: number, registerTrigger = true) => {
		if (item.kind === 'header') return renderHeader(item, registerTrigger)

		const previousItem = flatItems[index - 1]
		const nextItem = flatItems[index + 1]
		const selectionPosition = getBoardRowSelectionPosition(
			item.task.id,
			previousItem?.kind === 'row' ? previousItem.task.id : undefined,
			nextItem?.kind === 'row' ? nextItem.task.id : undefined,
			selectedTaskIdSet,
		)
		return (
			<BoardRowSlot selectionPosition={selectionPosition}>{renderTaskRow(item.task)}</BoardRowSlot>
		)
	}

	return (
		<>
			<span aria-live='polite' className='sr-only' role='status'>
				{buildTaskBoardPaginationStatus(pagination, tasks.length)}
			</span>
			{/* 两个一次性候选共享完整 controller，只让布局方式成为变量。 */}
			<div
				{...gridProps}
				ref={gridRef}
				aria-rowcount={
					pagination.state === 'exhausted'
						? collectionInteraction.projection.navigableKeys.length
						: -1
				}
				className='@container/task-list relative w-full outline-none'
				data-board-root='true'
				data-task-board-engine={isVirtualized ? 'virtual' : 'ordinary'}
				onFocusCapture={handleRootFocusCapture}
				onKeyDownCapture={handleRootKeyDownCapture}
			>
				{/* 零高度 sticky 壳（不占文档流高度）+ 定高裁剪层。 */}
				{isVirtualized && stickyHeader ? (
					<div
						ref={stickyShellRef}
						aria-hidden={!stickyStuck || undefined}
						className='sticky top-0 z-20'
						data-task-board-sticky-header='true'
						inert={!stickyStuck || undefined}
						style={{
							height: 0,
							visibility: stickyStuck ? 'visible' : 'hidden',
							pointerEvents: stickyStuck ? 'auto' : 'none',
						}}
					>
						<div
							style={{
								height: COLLECTION_SECTION_HEADER_HEIGHT,
								overflow: 'hidden',
								position: 'relative',
							}}
						>
							<div
								ref={stickyPushLayerRef}
								style={{
									willChange: 'transform',
									backfaceVisibility: 'hidden',
								}}
							>
								{renderHeader(stickyHeader, stickyStuck)}
							</div>
						</div>
					</div>
				) : null}
				{isVirtualized ? (
					<div
						className='relative w-full'
						data-task-board-extent={contentHeightPx}
						data-task-board-virtual='sections'
						style={{ height: contentHeightPx, minHeight: contentHeightPx }}
					>
						{virtualItems.map(({ index, start, size, key }) => {
							const item = flatItems[index]
							if (index === sentinelIndex) {
								return (
									<div
										data-index={index}
										data-task-board-sentinel='true'
										data-task-board-sentinel-state={pagination.state}
										key={String(key)}
										role='presentation'
										style={{
											position: 'absolute',
											top: 0,
											left: 0,
											width: '100%',
											height: size,
											transform: `translateY(${start}px)`,
										}}
									>
										<TaskBoardPaginationSentinel
											pagination={pagination}
											onFetchNextPage={requestNextPage}
										/>
									</div>
								)
							}
							if (!item) return null
							const isHiddenStickySource = item.kind === 'header' && index === hideListHeaderIndex
							// 下一个即将顶替的 header 提高层级，保证从下方盖过被顶走的浮层
							const isIncomingSticky =
								item.kind === 'header' && nextStickyIndex === index && stickyStuck

							return (
								<div
									aria-hidden={isHiddenStickySource || undefined}
									data-index={index}
									data-sticky={stickyStuck && index === stickyActiveIndex ? 'true' : undefined}
									inert={isHiddenStickySource || undefined}
									key={String(key)}
									role={item.kind === 'header' ? 'presentation' : undefined}
									style={{
										// 全部 absolute：scrollHeight 只由外层 height 决定
										position: 'absolute',
										transform: `translateY(${start}px)`,
										opacity: isHiddenStickySource ? 0 : 1,
										pointerEvents: isHiddenStickySource ? 'none' : undefined,
										zIndex: isIncomingSticky ? 3 : item.kind === 'header' ? 1 : 0,
										top: 0,
										left: 0,
										width: '100%',
										height: size,
										// header 不用 content-visibility，避免吸顶切换时闪一下
										...(item.kind === 'header'
											? {}
											: {
													contentVisibility: 'auto' as const,
													containIntrinsicSize: size,
												}),
									}}
								>
									{renderItemContent(item, index, !isHiddenStickySource)}
								</div>
							)
						})}
					</div>
				) : (
					<div className='relative w-full' data-task-board-ordinary='sections'>
						{flatItems.map((item, index) => (
							<div
								data-index={index}
								key={item.key}
								role={item.kind === 'header' ? 'presentation' : undefined}
								style={{
									height:
										item.kind === 'header' ? COLLECTION_SECTION_HEADER_SIZE : COLLECTION_ROW_SIZE,
									...(item.kind === 'header'
										? { position: 'sticky' as const, top: 0, zIndex: 2 }
										: {
												contentVisibility: 'auto' as const,
												containIntrinsicSize: COLLECTION_ROW_SIZE,
											}),
								}}
							>
								{renderItemContent(item, index)}
							</div>
						))}
						<div
							ref={ordinarySentinelRef}
							data-index={sentinelIndex}
							data-task-board-sentinel='true'
							data-task-board-sentinel-state={pagination.state}
							role='presentation'
							style={{ height: COLLECTION_ROW_SIZE }}
						>
							<TaskBoardPaginationSentinel
								onFetchNextPage={requestNextPage}
								pagination={pagination}
							/>
						</div>
					</div>
				)}
			</div>
		</>
	)
}

function TaskBoardPaginationSentinel({
	pagination,
	onFetchNextPage,
}: {
	pagination: TaskBoardPagination
	onFetchNextPage: () => void
}) {
	switch (pagination.state) {
		case 'idle':
			return (
				<div className='flex h-full items-center justify-center'>
					<Button onPress={onFetchNextPage} size='sm' type='button' variant='ghost'>
						加载更多任务
					</Button>
				</div>
			)
		case 'loading':
			return (
				<div className='flex h-full items-center justify-center'>
					<Chip size='sm' variant='secondary'>
						加载更多…
					</Chip>
				</div>
			)
		case 'error':
			return (
				<div className='flex h-full items-center justify-center gap-2 text-xs text-danger'>
					<span className='max-w-80 truncate'>{pagination.error}</span>
					<Button onPress={onFetchNextPage} size='sm' type='button' variant='danger-soft'>
						重试
					</Button>
				</div>
			)
		case 'exhausted':
			return (
				<div className='flex h-full items-center justify-center text-xs text-muted'>
					已加载全部任务
				</div>
			)
	}
}

function buildTaskBoardPaginationStatus(pagination: TaskBoardPagination, loadedTaskCount: number) {
	const progress =
		typeof pagination.totalCount === 'number'
			? `${loadedTaskCount} / ${pagination.totalCount}`
			: String(loadedTaskCount)
	switch (pagination.state) {
		case 'idle':
			return `已加载 ${progress} 个任务，可继续加载更多`
		case 'loading':
			return `正在加载更多任务，已加载 ${progress} 个任务`
		case 'error':
			return `加载更多任务失败：${pagination.error}。已加载 ${progress} 个任务`
		case 'exhausted':
			return `已加载全部 ${loadedTaskCount} 个任务`
	}
}

function TaskBoardLoadingState() {
	return (
		<div aria-busy='true' aria-label='正在读取任务' className='flex min-h-0 flex-1 flex-col'>
			{Array.from({ length: 2 }).map((_, sectionIndex) => (
				<div className='flex flex-col' key={`board-loading-section-${sectionIndex}`}>
					<div className='sticky top-0 z-10' style={{ height: COLLECTION_SECTION_HEADER_SIZE }}>
						<div
							className='flex items-center gap-2 pl-3 pr-1'
							style={{ height: COLLECTION_SECTION_HEADER_HEIGHT }}
						>
							<Skeleton className='size-3' />
							<Skeleton className='h-3 w-24' />
						</div>
					</div>
					<div className='flex flex-col'>
						{Array.from({ length: sectionIndex === 0 ? 4 : 3 }).map((_, rowIndex) => (
							<div
								key={`board-loading-row-${sectionIndex}-${rowIndex}`}
								style={{ height: COLLECTION_ROW_SIZE }}
							>
								<div
									className='flex min-w-0 items-center gap-3 px-3'
									style={{ height: COLLECTION_ROW_HEIGHT }}
								>
									<Skeleton className='size-4 shrink-0' />
									<Skeleton className='h-3 min-w-0 flex-1' />
									<Skeleton className='h-3 w-12 shrink-0' />
								</div>
							</div>
						))}
					</div>
				</div>
			))}
		</div>
	)
}

function TaskBoardEmptyState({
	icon,
	title,
	description,
	actionLabel,
	onAction,
	actionRef,
}: {
	icon: ReactNode
	title: string
	description?: string
	actionLabel?: string
	onAction: () => void
	actionRef: Ref<HTMLButtonElement>
}) {
	return (
		<div className='flex min-h-0 min-w-0 flex-1 flex-col'>
			<EmptyState className='w-full min-w-0 flex-1 justify-center' size='md'>
				<EmptyState.Header>
					<EmptyState.Media variant='icon'>{icon}</EmptyState.Media>
					<EmptyState.Title>{title}</EmptyState.Title>
					{description ? <EmptyState.Description>{description}</EmptyState.Description> : null}
				</EmptyState.Header>
				{actionLabel ? (
					<EmptyState.Content>
						<Button ref={actionRef} onPress={onAction} type='button' variant='primary'>
							{actionLabel}
						</Button>
					</EmptyState.Content>
				) : null}
			</EmptyState>
		</div>
	)
}

type TaskBoardGridRowProps = Omit<TaskRowAdapterProps, 'rowState'> & {
	ariaRowIndex: number
	focusBridge: ReturnType<typeof createCollectionFocusBridge>
	focusSource: 'pointer' | 'keyboard' | null
	isActive: boolean
	isFocused: boolean
	isPending: boolean
	isSelected: boolean
	isVirtualized: boolean
	listState: CollectionInteraction<string>['listState']
	onPointerFocusTask: (taskId: string) => void
	onPointerLeaveTask: (taskId: string, restoreRootFocus: boolean) => void
	suppressFocusIndicator: boolean
}

const TaskBoardGridRow = memo(function TaskBoardGridRow({
	ariaRowIndex,
	focusBridge,
	focusSource,
	isActive,
	isFocused,
	isPending,
	isSelected,
	isVirtualized,
	listState,
	onPointerFocusTask,
	onPointerLeaveTask,
	suppressFocusIndicator,
	task,
	...props
}: TaskBoardGridRowProps) {
	const rowRef = useRef<HTMLDivElement | null>(null)
	const unregisterRef = useRef<(() => void) | null>(null)
	const node = listState.collection.getItem(task.id)
	if (!node) {
		throw new Error(`TaskBoard collection 缺少任务：${task.id}`)
	}
	const { rowProps, gridCellProps } = useGridListItem(
		{
			node,
			isVirtualized,
			shouldSelectOnPressUp: true,
		},
		listState,
		rowRef,
	)
	const setRowRef = useCallback(
		(element: HTMLDivElement | null) => {
			unregisterRef.current?.()
			unregisterRef.current = null
			rowRef.current = element
			if (element) {
				unregisterRef.current = focusBridge.registerItem(task.id, element)
			}
		},
		[focusBridge, task.id],
	)
	const handleContextMenuOpenChange = useCallback(
		(open: boolean) => {
			if (open) {
				focusBridge.rememberTrigger(task.id)
				return
			}

			if (focusBridge.getTriggerKey() === task.id) {
				focusBridge.restoreTrigger({ type: 'item', key: task.id })
			}
		},
		[focusBridge, task.id],
	)
	useEffect(() => () => unregisterRef.current?.(), [])
	const rowState = useMemo(
		() => ({
			isActive,
			isFocused,
			isPending,
			isSelected,
			focusSource,
			suppressFocusIndicator,
		}),
		[focusSource, isActive, isFocused, isPending, isSelected, suppressFocusIndicator],
	)
	const ariaRowProps = mergeProps(rowProps, {
		'aria-rowindex': ariaRowIndex,
		onPointerMove: () => onPointerFocusTask(task.id),
		onPointerLeave: () => {
			const row = rowRef.current
			onPointerLeaveTask(task.id, row !== null && row === document.activeElement)
		},
	})

	return (
		<TaskRowAriaFrameProvider
			gridCellProps={gridCellProps}
			rowProps={ariaRowProps}
			setRowElement={setRowRef}
		>
			<TaskRowAdapter
				{...props}
				onContextMenuOpenChange={handleContextMenuOpenChange}
				rowState={rowState}
				task={task}
			/>
		</TaskRowAriaFrameProvider>
	)
})

function StatusSectionHeader({
	status,
	groupKey,
	label,
	count,
	open,
	createProjectId,
	onOpenChange,
	onCollapseAll,
	onExpandAll,
	onGroupTriggerBlur,
	onSetSectionSelection,
	registerGroupTrigger,
	selectedTaskIdSet,
	tasks,
	openTaskCreateDialog,
}: {
	status?: TaskStatus
	groupKey: string
	label: string
	count: number
	open: boolean
	createProjectId: string | null
	onOpenChange?: (open: boolean) => void
	onCollapseAll: () => void
	onExpandAll: () => void
	onGroupTriggerBlur: (groupKey: string) => void
	onSetSectionSelection: (taskIds: readonly string[], selected: boolean) => void
	registerGroupTrigger?: (groupKey: string, element: HTMLElement) => () => void
	selectedTaskIdSet: ReadonlySet<string>
	tasks: TaskListItem[]
	openTaskCreateDialog: (draft?: { projectId?: string | null; status?: TaskStatus }) => void
}) {
	const sectionIds = useMemo(() => tasks.map((t) => t.id), [tasks])
	const [contextMenuOpen, setContextMenuOpen] = useState(false)
	const [toggleTooltipOpen, setToggleTooltipOpen] = useState(false)
	const [createTooltipOpen, setCreateTooltipOpen] = useState(false)
	const contextMenuHadOpenedRef = useRef(false)
	const groupTriggerElementRef = useRef<HTMLButtonElement | null>(null)
	const unregisterGroupTriggerRef = useRef<(() => void) | null>(null)
	const groupTriggerRef = useCallback(
		(element: HTMLButtonElement | null) => {
			groupTriggerElementRef.current = element
			unregisterGroupTriggerRef.current?.()
			unregisterGroupTriggerRef.current = null
			if (element && registerGroupTrigger) {
				unregisterGroupTriggerRef.current = registerGroupTrigger(groupKey, element)
			}
		},
		[groupKey, registerGroupTrigger],
	)
	useEffect(() => () => unregisterGroupTriggerRef.current?.(), [])
	useEffect(() => {
		if (contextMenuOpen) {
			contextMenuHadOpenedRef.current = true
			return
		}
		if (!contextMenuHadOpenedRef.current) return

		contextMenuHadOpenedRef.current = false
		groupTriggerElementRef.current?.focus({ preventScroll: true })
	}, [contextMenuOpen])
	const selectedCount = sectionIds.filter((id) => selectedTaskIdSet.has(id)).length
	const handleSelectAll = useCallback(
		() => onSetSectionSelection(sectionIds, true),
		[onSetSectionSelection, sectionIds],
	)
	const handleDeselectAll = useCallback(
		() => onSetSectionSelection(sectionIds, false),
		[onSetSectionSelection, sectionIds],
	)

	const toggleAction =
		status && onOpenChange ? (
			<ActionTooltip
				isOpen={toggleTooltipOpen && !contextMenuOpen}
				label={open ? `折叠 ${label}` : `展开 ${label}`}
				onOpenChange={(nextOpen) => setToggleTooltipOpen(nextOpen && !contextMenuOpen)}
			>
				<Button
					ref={groupTriggerRef}
					aria-expanded={open}
					aria-label={open ? `折叠 ${label}` : `展开 ${label}`}
					data-collection-group-key={groupKey}
					isIconOnly
					onBlur={() => onGroupTriggerBlur(groupKey)}
					onPress={() => {
						setToggleTooltipOpen(false)
						onOpenChange(!open)
					}}
					size='sm'
					type='button'
					variant='ghost'
				>
					<span className='inline-flex size-3 shrink-0 items-center justify-center' data-chevron>
						<TriangleIcon
							className={cn('size-1.5 text-muted', open ? 'rotate-180' : 'rotate-90')}
							fill='currentColor'
						/>
					</span>
				</Button>
			</ActionTooltip>
		) : null
	const createAction = status ? (
		<ActionTooltip
			isOpen={createTooltipOpen && !contextMenuOpen}
			label={`在 ${label} 中创建任务`}
			onOpenChange={(nextOpen) => setCreateTooltipOpen(nextOpen && !contextMenuOpen)}
		>
			<Button
				aria-label={`在 ${label} 中创建任务`}
				isIconOnly
				onPress={() => {
					setCreateTooltipOpen(false)
					openTaskCreateDialog({ projectId: createProjectId, status })
				}}
				size='sm'
				type='button'
				variant='ghost'
			>
				<PlusIcon />
			</Button>
		</ActionTooltip>
	) : null
	const headerContent = (
		<BoardSectionHeader
			count={count}
			label={
				contextMenuOpen ? (
					<span className='min-w-0 truncate'>{label}</span>
				) : (
					<OverflowTooltip className='min-w-0' content={label}>
						{label}
					</OverflowTooltip>
				)
			}
			leading={
				toggleAction || status ? (
					<>
						{toggleAction}
						{status ? <TaskStatusIndicator status={status} /> : null}
					</>
				) : undefined
			}
			onFocus={(event) => event.stopPropagation()}
			selectedCount={selectedCount}
			trailing={createAction}
		/>
	)

	if (!onOpenChange) {
		return headerContent
	}

	return (
		<div data-board-section='true' data-state={open ? 'open' : 'closed'}>
			<ContextMenu
				onOpenChange={(nextOpen) => {
					setContextMenuOpen(nextOpen)
					if (nextOpen) {
						setToggleTooltipOpen(false)
						setCreateTooltipOpen(false)
					}
				}}
				open={contextMenuOpen}
			>
				<ContextMenu.Trigger
					onDoubleClick={() => {
						setToggleTooltipOpen(false)
						setCreateTooltipOpen(false)
						onOpenChange(!open)
					}}
				>
					{headerContent}
				</ContextMenu.Trigger>
				<BoardSectionContextMenu
					onCollapse={() => onOpenChange(false)}
					onCollapseAll={onCollapseAll}
					onDeselectAll={handleDeselectAll}
					onExpand={() => onOpenChange(true)}
					onExpandAll={onExpandAll}
					onSelectAll={handleSelectAll}
					open={open}
					selectedCount={selectedCount}
				/>
			</ContextMenu>
		</div>
	)
}

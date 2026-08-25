import {
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
import { registerTaskBoardFocusTaskId, registerTaskBoardScrollToTaskId } from './taskBoardScroll'
import { useScrollAreaViewport } from '@/shared/components/AppScrollArea'
import {
	TASK_BOARD_HEADER_HEIGHT,
	TASK_BOARD_HEADER_SIZE,
	TASK_BOARD_ITEM_GAP,
	TASK_BOARD_ROW_HEIGHT,
	TASK_BOARD_ROW_SIZE,
	buildTaskBoardExtent,
	buildTaskBoardItemOffsets,
	listTaskBoardStickyIndexes,
	measureTaskBoardFlatSize,
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
import { BoardSectionContextMenu } from '@/shared/components/board'
import type { RowSelectionGroupPosition } from '@/shared/components/row'
import { useDialogStore } from '@/features/shell-dialogs'
import type { TaskDisplayPropertyKey } from '@/features/display-options'
import { type TaskPriorityValue } from '@/features/task/model/taskPriority'
import { TaskRowAdapter, type TaskRowAdapterProps } from '@/features/task/components/TaskRowAdapter'
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

const TASK_BOARD_SELECTION_GROUP_POSITION_CLASS: Record<RowSelectionGroupPosition, string> = {
	single: 'rounded-lg',
	first: 'rounded-none rounded-t-lg',
	middle: 'rounded-none',
	last: 'rounded-none rounded-b-lg',
}

const TASK_BOARD_SECTION_HEADER_CLASS =
	'relative z-10 flex items-center gap-2 rounded-md bg-surface-secondary pl-3 pr-1'

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
	spaces?: Array<{ id: string; name: string; iconKey?: string; colorKey?: string }>
	onSelectPlacement?: (task: TaskListItem, target: TaskPlacementTarget) => void
	showProjectCellOptions?: boolean
	showSpaceLabel?: boolean
	visibleProperties?: TaskDisplayPropertyKey[]
	hasNextPage?: boolean
	isFetchingNextPage?: boolean
	onFetchNextPage?: () => void
	fetchNextPageError?: string | null
	/**
	 * 服务端过滤后任务总数（与 list/view 窗口同语义）。
	 * 续拉中：未加载行占位；已拉完：总高跟 flat（折叠变矮）。
	 */
	totalCount?: number
	/** 服务端已拉取条数（pages 展平，非折叠可见行） */
	loadedCount?: number
}

export { TASK_BOARD_ROW_SIZE } from '@/features/task/model/taskBoardModel'

/**
 * 任务 Board：状态分区 sticky + 虚拟行。
 * 几何见 taskBoardModel；滚动容器来自 AppScrollArea context。
 */
export function TaskBoard({
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
	hasNextPage = false,
	isFetchingNextPage = false,
	onFetchNextPage,
	fetchNextPageError = null,
	totalCount,
	loadedCount,
}: TaskBoardProps) {
	const selectedTaskIdSet = collectionInteraction.selectedKeys
	const focusedTaskId = collectionInteraction.focusedKey
	const { runtime: commandRuntime, context: commandContext } = useCommandRuntimeContext()
	const [focusSource, setFocusSource] = useState<'pointer' | 'keyboard' | null>(null)
	const markKeyboardInteraction = useCallback(() => {
		setFocusSource('keyboard')
	}, [])
	const contextMenuActions = useTaskContextMenuBulkActions()
	const openTaskCreateDialog = useDialogStore((state) => state.openTaskCreateDialog)
	const scrollViewportRef = useScrollAreaViewport()
	const measureRef = useRef<HTMLDivElement | null>(null)
	const spacerSizeRef = useRef(0)

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

	const stickyIndexes = useMemo(() => listTaskBoardStickyIndexes(flatItems), [flatItems])
	const itemOffsets = useMemo(() => buildTaskBoardItemOffsets(flatItems), [flatItems])
	const flatSizePx = useMemo(() => measureTaskBoardFlatSize(flatItems), [flatItems])

	const { stickyShellRef, stickyPushLayerRef, stickyActiveIndex, stickyStuck, nextStickyIndex } =
		useTaskBoardSticky({
			scrollViewportRef,
			stickyIndexes,
			itemOffsets,
			enabled: status === 'ready',
		})

	// 服务端已拉条数；缺省用 tasks.length（无客户端再滤时等价）
	const serverLoaded = loadedCount ?? tasks.length
	// totalCount 未就绪（undefined）时不锁占位；0 是合法总数
	const knownTotal = typeof totalCount === 'number' ? totalCount : null
	const { contentHeightPx, spacerSizePx } = buildTaskBoardExtent({
		flatSizePx,
		totalCount: knownTotal,
		loadedServerCount: serverLoaded,
		hasNextPage,
	})
	spacerSizeRef.current = spacerSizePx
	const virtualCount = flatItems.length + (spacerSizePx > 0 ? 1 : 0)

	const rowActions = useMemo(
		(): TaskRowAdapterProps['actions'] => ({
			onToggleTaskSelection: collectionInteraction.toggleSelection,
			onUpdateTaskPriority,
			onUpdateTaskStatus,
			onUpdateTaskDueDate,
			onUpdateTaskScheduledAt,
			onUpdateTaskReminderAt,
			onToggleTaskStatus,
		}),
		[
			collectionInteraction.toggleSelection,
			onToggleTaskStatus,
			onUpdateTaskDueDate,
			onUpdateTaskPriority,
			onUpdateTaskReminderAt,
			onUpdateTaskScheduledAt,
			onUpdateTaskStatus,
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

	const virtualizer = useVirtualizer({
		count: virtualCount,
		getScrollElement: () => scrollViewportRef?.current ?? null,
		estimateSize: (index) => {
			if (index < flatItems.length) {
				return flatItems[index]?.kind === 'header' ? TASK_BOARD_HEADER_SIZE : TASK_BOARD_ROW_SIZE
			}
			return spacerSizeRef.current
		},
		getItemKey: (index) => flatItems[index]?.key ?? `spacer:${index}`,
		measureElement: undefined,
		overscan: 6,
		initialRect: { width: 960, height: 720 },
		rangeExtractor,
	})
	const scrollToCollectionKey = useCallback(
		(key: string) => {
			const index = boardCollection.flatIndexByKey.get(key)
			if (index !== undefined) {
				virtualizer.scrollToIndex(index, { align: 'auto' })
			}
		},
		[boardCollection.flatIndexByKey, virtualizer],
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
	const focusCollectionStateKey = collectionInteraction.focusKey
	const navigableTaskKeys = collectionInteraction.projection.navigableKeys
	const focusCollectionKey = useCallback(
		(key: string) => {
			if (!navigableTaskKeys.includes(key)) return
			markKeyboardInteraction()
			focusCollectionStateKey(key)
			focusBridge.requestFocus({ type: 'item', key })
		},
		[focusBridge, focusCollectionStateKey, markKeyboardInteraction, navigableTaskKeys],
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
			isVirtualized: true,
			keyboardNavigationBehavior: 'tab',
			escapeKeyBehavior: 'none',
			shouldSelectOnPressUp: true,
		},
		collectionInteraction.listState,
		gridRef,
	)
	const executeCollectionCommand = useCallback(
		(commandId: CommandId, taskId: string) => {
			const target = buildTaskCommandContext({
				baseContext: commandContext,
				tasks,
				targetTaskIds: [taskId],
				focusedTaskId: taskId,
				rowTargetId: taskId,
				rowTargetSource: 'focus',
			})
			void commandRuntime.project(commandId, target)?.execute({ source: 'row-shortcut' })
		},
		[commandContext, commandRuntime, tasks],
	)
	const keyboard = useCollectionKeyboardAdapter({
		interaction: collectionInteraction,
		resolveRowKey: focusBridge.getItemKey,
		requestFocus: focusBridge.requestFocus,
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
		focusBridge.requestFocus(focusIntent)
		onFocusIntentConsumed(focusIntent)
	}, [focusBridge, focusIntent, onFocusIntentConsumed])

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
			focusBridge.requestFocus(pending.reentry)
		},
		[focusBridge, markKeyboardInteraction],
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
			if (focusSource === 'pointer' && focusedTaskId === taskId) return
			setFocusSource('pointer')
			collectionInteraction.focusKey(taskId)
			focusBridge.requestFocus({ type: 'item', key: taskId })
		},
		[collectionInteraction, focusBridge, focusSource, focusedTaskId],
	)
	const handlePointerLeaveTask = useCallback(
		(taskId: string, restoreRootFocus: boolean) => {
			if (focusSource !== 'pointer' || focusedTaskId !== taskId) return
			collectionInteraction.focusKey(null)
			if (restoreRootFocus) gridRef.current?.focus({ preventScroll: true })
			setFocusSource(null)
		},
		[collectionInteraction, focusSource, focusedTaskId],
	)

	const renderTaskRow = useCallback(
		(task: TaskListItem, selectionGroupPosition?: RowSelectionGroupPosition) => {
			// 未多选时不传 contextTasks，避免每帧 [task] 新数组打穿 memo
			const contextTasks = selectedTaskIdSet.has(task.id) ? selectedTasks : undefined
			return (
				<TaskBoardGridRow
					actions={rowActions}
					collectionInteraction={collectionInteraction}
					contextMenuActions={contextMenuActions}
					contextTasks={contextTasks}
					focusBridge={focusBridge}
					onPointerFocusTask={handlePointerFocusTask}
					onPointerLeaveTask={handlePointerLeaveTask}
					projectBinding={projectBinding}
					rowState={{
						isActive: activeTaskId === task.id,
						focusSource,
						isFocused: focusedTaskId === task.id,
						isPending: pendingTaskId === task.id,
						isSelected: selectedTaskIdSet.has(task.id),
						suppressFocusIndicator,
					}}
					selectionGroupPosition={selectionGroupPosition}
					showSpaceLabel={showSpaceLabel}
					task={task}
					visibleProperties={visibleProperties}
				/>
			)
		},
		[
			activeTaskId,
			collectionInteraction,
			contextMenuActions,
			focusBridge,
			focusSource,
			focusedTaskId,
			handlePointerFocusTask,
			handlePointerLeaveTask,
			pendingTaskId,
			projectBinding,
			rowActions,
			selectedTaskIdSet,
			showSpaceLabel,
			selectedTasks,
			suppressFocusIndicator,
			visibleProperties,
		],
	)

	const virtualItems = virtualizer.getVirtualItems()
	const lastVirtualIndex = virtualItems[virtualItems.length - 1]?.index ?? -1

	useEffect(() => {
		if (
			status !== 'ready' ||
			!hasNextPage ||
			!onFetchNextPage ||
			isFetchingNextPage ||
			lastVirtualIndex < 0
		) {
			return
		}
		if (lastVirtualIndex >= flatItems.length - 8 || lastVirtualIndex >= flatItems.length) {
			onFetchNextPage()
		}
	}, [flatItems.length, hasNextPage, isFetchingNextPage, lastVirtualIndex, onFetchNextPage, status])

	const stickyHeaderItem = flatItems[stickyActiveIndex]
	const stickyHeader = stickyHeaderItem?.kind === 'header' ? stickyHeaderItem : null

	useLayoutEffect(() => {
		registerTaskBoardScrollToTaskId(scrollToCollectionKey)
		registerTaskBoardFocusTaskId(focusTaskBoardTarget)
		return () => {
			registerTaskBoardScrollToTaskId(null)
			registerTaskBoardFocusTaskId(null)
		}
	}, [focusTaskBoardTarget, scrollToCollectionKey])

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

	return (
		// 虚拟列表必须由内容定高驱动 scrollHeight。
		<div
			{...gridProps}
			ref={gridRef}
			aria-rowcount={collectionInteraction.projection.navigableKeys.length}
			className='@container/task-list relative w-full outline-none'
			data-board-root='true'
			onFocusCapture={handleRootFocusCapture}
			onKeyDownCapture={handleRootKeyDownCapture}
		>
			{/* 零高度 sticky 壳（不占文档流高度）+ 定高裁剪层。 */}
			{stickyHeader ? (
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
							height: TASK_BOARD_HEADER_HEIGHT,
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
			<div
				ref={measureRef}
				className='relative w-full'
				data-task-board-extent={contentHeightPx}
				data-task-board-virtual='sections'
				style={{ height: contentHeightPx, minHeight: contentHeightPx }}
			>
				{(virtualItems.length > 0
					? virtualItems.map((row) => ({
							index: row.index,
							start: row.start,
							size: row.size,
							key: String(row.key),
						}))
					: flatItems.map((item, index) => ({
							index,
							start: itemOffsets[index] ?? 0,
							size: item.kind === 'header' ? TASK_BOARD_HEADER_SIZE : TASK_BOARD_ROW_SIZE,
							key: item.key,
						}))
				).map(({ index, start, size, key }) => {
					const item = flatItems[index]
					// 尾部 spacer：只占位，不渲染业务 UI
					if (!item && index >= flatItems.length) {
						return (
							<div
								aria-hidden
								data-index={index}
								data-task-board-spacer='true'
								key={key}
								style={{
									position: 'absolute',
									top: 0,
									left: 0,
									width: '100%',
									height: size,
									transform: `translateY(${start}px)`,
									pointerEvents: 'none',
								}}
							/>
						)
					}
					const isHiddenStickySource = item?.kind === 'header' && index === hideListHeaderIndex
					// 下一个即将顶替的 header 提高层级，保证从下方盖过被顶走的浮层
					const isIncomingSticky =
						item?.kind === 'header' && nextStickyIndex === index && stickyStuck
					const selectionGroupPosition = getTaskBoardSelectionGroupPosition(
						flatItems,
						index,
						selectedTaskIdSet,
					)

					return (
						<div
							aria-hidden={isHiddenStickySource || undefined}
							data-index={index}
							data-sticky={stickyStuck && index === stickyActiveIndex ? 'true' : undefined}
							inert={isHiddenStickySource || undefined}
							key={key}
							role={item?.kind === 'header' ? 'presentation' : undefined}
							style={{
								// 全部 absolute：scrollHeight 只由外层 height 决定
								position: 'absolute',
								transform: `translateY(${start}px)`,
								opacity: isHiddenStickySource ? 0 : 1,
								pointerEvents: isHiddenStickySource ? 'none' : undefined,
								zIndex: isIncomingSticky ? 3 : item?.kind === 'header' ? 1 : 0,
								top: 0,
								left: 0,
								width: '100%',
								height: size,
								// header 不用 content-visibility，避免吸顶切换时闪一下
								...(item?.kind === 'header'
									? {}
									: {
											contentVisibility: 'auto' as const,
											containIntrinsicSize: size,
										}),
							}}
						>
							{!item ? null : item.kind === 'header' ? (
								renderHeader(item, !isHiddenStickySource)
							) : (
								<div
									className={cn(
										selectionGroupPosition && 'overflow-hidden bg-default',
										selectionGroupPosition &&
											TASK_BOARD_SELECTION_GROUP_POSITION_CLASS[selectionGroupPosition],
									)}
									data-task-board-selection-group={selectionGroupPosition}
									style={{
										height:
											TASK_BOARD_ROW_HEIGHT +
											(selectionGroupPosition === 'first' || selectionGroupPosition === 'middle'
												? TASK_BOARD_ITEM_GAP
												: 0),
									}}
								>
									{renderTaskRow(item.task, selectionGroupPosition)}
								</div>
							)}
						</div>
					)
				})}
			</div>
			{isFetchingNextPage || fetchNextPageError ? (
				<div className='pointer-events-none absolute inset-x-0 bottom-2 z-10 flex justify-center'>
					{isFetchingNextPage ? (
						<Chip size='sm' variant='secondary'>
							加载更多…
						</Chip>
					) : null}
					{fetchNextPageError ? (
						<Alert className='pointer-events-auto w-auto max-w-xl' status='danger'>
							<Alert.Indicator />
							<Alert.Content>
								<Alert.Title>{fetchNextPageError}</Alert.Title>
							</Alert.Content>
							{onFetchNextPage ? (
								<Button onPress={onFetchNextPage} size='sm' type='button' variant='danger-soft'>
									重试
								</Button>
							) : null}
						</Alert>
					) : null}
				</div>
			) : null}
		</div>
	)
}

function TaskBoardLoadingState() {
	return (
		<div aria-busy='true' className='flex min-h-0 flex-1 flex-col gap-0.5'>
			{Array.from({ length: 2 }).map((_, sectionIndex) => (
				<div className='flex flex-col gap-0.5' key={`board-loading-section-${sectionIndex}`}>
					<div
						className='sticky top-0 z-10 flex items-center gap-2 pl-3 pr-1'
						style={{ height: TASK_BOARD_HEADER_HEIGHT }}
					>
						<Skeleton className='size-3' />
						<Skeleton className='h-3 w-24' />
					</div>
					<div className='flex flex-col gap-0.5'>
						{Array.from({ length: sectionIndex === 0 ? 4 : 3 }).map((_, rowIndex) => (
							<div
								className='flex h-11 min-w-0 items-center gap-3 px-3'
								key={`board-loading-row-${sectionIndex}-${rowIndex}`}
							>
								<Skeleton className='size-4 shrink-0' />
								<Skeleton className='h-3 min-w-0 flex-1' />
								<Skeleton className='h-3 w-12 shrink-0' />
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

type TaskBoardGridRowProps = Omit<TaskRowAdapterProps, 'gridCellProps' | 'rowProps' | 'rowRef'> & {
	collectionInteraction: CollectionInteraction<string>
	focusBridge: ReturnType<typeof createCollectionFocusBridge>
	onPointerFocusTask: (taskId: string) => void
	onPointerLeaveTask: (taskId: string, restoreRootFocus: boolean) => void
}

function TaskBoardGridRow({
	collectionInteraction,
	focusBridge,
	onPointerFocusTask,
	onPointerLeaveTask,
	rowState,
	task,
	...props
}: TaskBoardGridRowProps) {
	const rowRef = useRef<HTMLDivElement | null>(null)
	const unregisterRef = useRef<(() => void) | null>(null)
	const node = collectionInteraction.listState.collection.getItem(task.id)
	if (!node) {
		throw new Error(`TaskBoard collection 缺少任务：${task.id}`)
	}
	const { rowProps, gridCellProps } = useGridListItem(
		{
			node,
			isVirtualized: true,
			shouldSelectOnPressUp: true,
		},
		collectionInteraction.listState,
		rowRef,
	)
	const ariaRowIndex = collectionInteraction.projection.navigableKeys.indexOf(task.id) + 1
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

	return (
		<TaskRowAdapter
			{...props}
			gridCellProps={gridCellProps}
			onContextMenuOpenChange={handleContextMenuOpenChange}
			rowProps={mergeProps(rowProps, {
				'aria-rowindex': ariaRowIndex,
				onPointerMove: () => onPointerFocusTask(task.id),
				onPointerLeave: () => {
					const row = rowRef.current
					onPointerLeaveTask(task.id, row !== null && row === document.activeElement)
				},
			})}
			rowRef={setRowRef}
			rowState={rowState}
			task={task}
		/>
	)
}

function getTaskBoardSelectionGroupPosition(
	items: readonly TaskBoardFlatItem[],
	index: number,
	selectedIdSet: ReadonlySet<string>,
): RowSelectionGroupPosition | undefined {
	const item = items[index]
	if (item?.kind !== 'row' || !selectedIdSet.has(item.task.id)) {
		return undefined
	}

	const previous = items[index - 1]
	const next = items[index + 1]
	const joinsPrevious = previous?.kind === 'row' && selectedIdSet.has(previous.task.id)
	const joinsNext = next?.kind === 'row' && selectedIdSet.has(next.task.id)

	if (joinsPrevious) return joinsNext ? 'middle' : 'last'
	return joinsNext ? 'first' : 'single'
}

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

	// 不用 CSS sticky：虚拟列表的顶替由外层浮层 + pushOffset 负责，这里只保留视觉 surface
	const headerContent = (
		<>
			{status && onOpenChange ? (
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
						onPress={() => {
							setToggleTooltipOpen(false)
							onOpenChange(!open)
						}}
						onBlur={() => onGroupTriggerBlur(groupKey)}
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
			) : null}
			<div className='flex min-w-0 flex-1 items-center gap-2 px-1 text-xs font-semibold text-foreground'>
				{status ? <TaskStatusIndicator status={status} /> : null}
				{contextMenuOpen ? (
					<span className='min-w-0 truncate'>{label}</span>
				) : (
					<OverflowTooltip className='min-w-0' content={label}>
						{label}
					</OverflowTooltip>
				)}
				<Chip className='ml-1' size='sm' variant='tertiary'>
					{count}
				</Chip>
				{selectedCount > 0 ? (
					<Chip color='accent' size='sm' variant='soft'>
						已选 {selectedCount}
					</Chip>
				) : null}
			</div>
			{status ? (
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
			) : (
				<span className='pr-1' />
			)}
		</>
	)

	if (!onOpenChange) {
		return (
			<div
				className={TASK_BOARD_SECTION_HEADER_CLASS}
				data-board-section-header='true'
				style={{ height: TASK_BOARD_HEADER_HEIGHT }}
				onFocus={(event) => event.stopPropagation()}
			>
				{headerContent}
			</div>
		)
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
					className={TASK_BOARD_SECTION_HEADER_CLASS}
					data-board-section-header='true'
					style={{ height: TASK_BOARD_HEADER_HEIGHT }}
					onDoubleClick={() => {
						setToggleTooltipOpen(false)
						setCreateTooltipOpen(false)
						onOpenChange(!open)
					}}
					onFocus={(event) => event.stopPropagation()}
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

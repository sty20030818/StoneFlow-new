import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { defaultRangeExtractor, useVirtualizer, type Range } from '@tanstack/react-virtual'
import { uniq } from 'es-toolkit/array'
import { registerTaskBoardScrollToTaskId } from './taskBoardScroll'
import { useScrollAreaViewport } from '@/shared/components/AppScrollArea'
import {
	TASK_BOARD_HEADER_HEIGHT,
	TASK_BOARD_HEADER_SIZE,
	TASK_BOARD_ROW_HEIGHT,
	TASK_BOARD_ROW_SIZE,
	buildTaskBoardExtent,
	buildTaskBoardFlatItems,
	buildTaskBoardItemOffsets,
	buildTaskBoardStickyPush,
	listTaskBoardStickyIndexes,
	measureTaskBoardFlatSize,
	type TaskBoardFlatItem,
} from '@/features/task/model/taskBoardModel'

import {
	selectProjectTaskBoardOpenSections,
	useShellPreferenceStore,
} from '@/features/shell-dialogs'
import {
	BoardEmptyState,
	BoardLoadingState,
	BoardSectionContextMenu,
} from '@/shared/components/board'
import { ROW_SHELL_SECTION_HEADER_CLASS } from '@/shared/components/patterns/row-tokens'
import { useDialogStore } from '@/features/shell-dialogs'
import { useSectionSelection } from '@/features/bulk-action'
import type { TaskDisplayPropertyKey } from '@/features/display-options'
import {
	TASK_BOARD_STATUS_ORDER,
	orderTasksByTaskBoardVisualOrder,
} from '@/features/task/model/taskBoardOrder'
import { type TaskPriorityValue } from '@/features/task/model/taskPriority'
import { TaskRowShortcutScope, type TaskRowShortcutState } from '@/features/task/shortcuts'
import { TaskRowAdapter, type TaskRowAdapterProps } from '@/features/task/components/TaskRowAdapter'
import { TaskStatusIndicator } from '@/features/task/model/indicators/TaskStatusIndicator'
import { useTaskContextMenuBulkActions } from '@/features/task/components/useTaskContextMenuBulkActions'
import type { TaskPlacementTarget } from '@/features/metadata-fields'
import type { TaskListItem, TaskStatus } from '@/shared/types'
import { Button } from '@/shared/components/base/button'
import { Badge } from '@/shared/components/base/badge'
import {
	ContextMenu,
	ContextMenuTrigger,
} from '@/shared/components/base/context-menu'
import { ListTodoIcon, PlusIcon, TriangleIcon } from 'lucide-react'
import {
	entityBoardCompactBadgeClass,
	entityBoardSectionActionButtonClass,
	entityBoardSectionCountBadgeClass,
	entityBoardSectionHeadingClass,
	entityBoardSectionRightSpacerClass,
	entityBoardSectionSelectedBadgeClass,
	entityBoardSectionToggleClass,
} from '@/shared/components/patterns/entity-board'
import { StatusNotice } from '@/shared/components/StatusNotice'
import { cn } from '@/shared/lib/utils'

export type TaskBoardProps = {
	tasks: TaskListItem[]
	status?: 'idle' | 'loading' | 'ready' | 'error'
	customSections?: Array<{
		key: string
		label: string
		tasks: TaskListItem[]
	}>
	createProjectId?: string | null
	pendingTaskId: string | null
	activeTaskId: string | null
	selectedTaskIdSet: Set<string>
	focusedTaskId?: string | null
	emptyTitle?: string
	emptyDescription?: string
	emptyActionLabel?: string
	onEmptyAction: () => void
	onToggleTaskSelection: (taskId: string) => void
	onSetFocusedTask?: (taskId: string | null) => void
	onMoveTaskFocus?: (
		delta: number,
		options?: {
			preserveAnchor?: boolean
			selectRange?: boolean
			startFromId?: string | null
			resetAnchorToStart?: boolean
		},
	) => string | null
	onClearTaskSelection?: () => void
	onSelectAllTasks?: (taskIds: string[]) => void
	onUpdateTaskPriority: (task: TaskListItem, priority: TaskPriorityValue) => Promise<void>
	onUpdateTaskStatus: (task: TaskListItem, status: TaskStatus) => Promise<void>
	onUpdateTaskDueDate?: (task: TaskListItem, dueAt: string | null) => Promise<void>
	onUpdateTaskScheduledAt?: (task: TaskListItem, plannedAt: string | null) => Promise<void>
	onUpdateTaskReminderAt?: (task: TaskListItem, remindAt: string | null) => Promise<void>
	onToggleTaskStatus: (task: TaskListItem) => Promise<void>
	onArchiveTask?: (task: TaskListItem) => Promise<void>
	onDeleteTask?: (task: TaskListItem) => Promise<void>
	onOpenTask: (taskId: string) => void
	onPeekTask?: (taskId: string, source: 'keyboard' | 'pointer') => void
	statusOrder?: readonly TaskStatus[]
	hideEmptySections?: boolean
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
	status = 'ready',
	customSections,
	createProjectId = null,
	pendingTaskId,
	activeTaskId,
	selectedTaskIdSet,
	focusedTaskId = null,
	emptyTitle,
	emptyDescription,
	emptyActionLabel,
	onEmptyAction,
	onToggleTaskSelection,
	onSetFocusedTask,
	onMoveTaskFocus,
	onClearTaskSelection,
	onSelectAllTasks,
	onUpdateTaskPriority,
	onUpdateTaskStatus,
	onUpdateTaskDueDate,
	onUpdateTaskScheduledAt,
	onUpdateTaskReminderAt,
	onToggleTaskStatus,
	onArchiveTask,
	onDeleteTask,
	onOpenTask,
	onPeekTask,
	statusOrder = TASK_BOARD_STATUS_ORDER,
	hideEmptySections = true,
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
	const openSections = useShellPreferenceStore(selectProjectTaskBoardOpenSections)
	const setProjectTaskBoardOpenSections = useShellPreferenceStore(
		(state) => state.setProjectTaskBoardOpenSections,
	)
	const contextMenuActions = useTaskContextMenuBulkActions({ onClearTaskSelection })
	const openTaskCreateDialog = useDialogStore((state) => state.openTaskCreateDialog)
	const scrollViewportRef = useScrollAreaViewport()
	const measureRef = useRef<HTMLDivElement | null>(null)
	const spacerSizeRef = useRef(0)
	/** flat / sticky 几何缓存：供 scroll 帧 DOM 写 push，避免 setState 刷整表 */
	const stickyMetaRef = useRef({ stickyIndexes: [] as number[], itemOffsets: [] as number[] })
	const stickyShellRef = useRef<HTMLDivElement | null>(null)
	const stickyPushLayerRef = useRef<HTMLDivElement | null>(null)
	/** 期望吸顶的 flat index（scroll 几何） */
	const stickyActiveIndexRef = useRef(0)
	/** React 已提交到浮层的 flat index；与期望不一致时禁止写 transform，避免旧标题弹回顶部 */
	const stickyRenderedIndexRef = useRef(0)
	const stickyStuckRef = useRef(false)
	// 首屏默认吸顶（header start=0）；避免 false→true 挂载闪一下
	const [stickyActiveIndex, setStickyActiveIndex] = useState(0)
	const [stickyStuck, setStickyStuck] = useState(true)

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

	const flatItems = useMemo(
		(): TaskBoardFlatItem[] =>
			buildTaskBoardFlatItems({
				tasks,
				statusOrder,
				openSections,
				hideEmptySections,
				customSections,
			}),
		[customSections, hideEmptySections, openSections, statusOrder, tasks],
	)

	const stickyIndexes = useMemo(() => listTaskBoardStickyIndexes(flatItems), [flatItems])
	const itemOffsets = useMemo(() => buildTaskBoardItemOffsets(flatItems), [flatItems])
	const flatSizePx = useMemo(() => measureTaskBoardFlatSize(flatItems), [flatItems])
	stickyMetaRef.current = { stickyIndexes, itemOffsets }

	const taskShortcutOrder = useMemo(() => {
		if (customSections && customSections.length > 0) {
			return orderTasksByTaskBoardVisualOrder(tasks, { statusOrder, customSections })
		}
		const visibleStatuses = new Set(openSections)
		return orderTasksByTaskBoardVisualOrder(
			tasks.filter((task) => visibleStatuses.has(task.status)),
			{ statusOrder },
		)
	}, [customSections, openSections, statusOrder, tasks])

	// 服务端已拉条数；缺省用 tasks.length（无客户端再滤时等价）
	const serverLoaded = loadedCount ?? tasks.length
	const knownTotal = typeof totalCount === 'number' && totalCount > 0 ? totalCount : null
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
			onOpenTask,
			onToggleTaskSelection,
			onUpdateTaskPriority,
			onUpdateTaskStatus,
			onUpdateTaskDueDate,
			onUpdateTaskScheduledAt,
			onUpdateTaskReminderAt,
			onToggleTaskStatus,
			onArchiveTask,
			onDeleteTask,
		}),
		[
			onArchiveTask,
			onDeleteTask,
			onOpenTask,
			onToggleTaskSelection,
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

	const handleSectionOpenChange = useCallback(
		(sectionStatus: TaskStatus, open: boolean) => {
			const nextSections = open
				? uniq([...openSections, sectionStatus])
				: openSections.filter((section) => section !== sectionStatus)
			setProjectTaskBoardOpenSections(nextSections)
		},
		[openSections, setProjectTaskBoardOpenSections],
	)

	const handleCollapseAll = useCallback(() => {
		setProjectTaskBoardOpenSections([])
	}, [setProjectTaskBoardOpenSections])

	const handleExpandAll = useCallback(() => {
		const allVisible = statusOrder.filter((s) => groupedTasks[s].length > 0)
		setProjectTaskBoardOpenSections(allVisible)
	}, [groupedTasks, setProjectTaskBoardOpenSections, statusOrder])

	// shortcut handlers 稳定引用：避免每帧新建 { onHover } 导致行 memo 失效
	const shortcutHandlersRef = useRef<TaskRowShortcutState | null>(null)

	const renderTaskRow = useCallback(
		(task: TaskListItem, rowShortcutState?: TaskRowShortcutState) => {
			if (rowShortcutState) {
				shortcutHandlersRef.current = rowShortcutState
			}
			const handlers = shortcutHandlersRef.current
			// 未多选时不传 contextTasks，避免每帧 [task] 新数组打穿 memo
			const contextTasks = selectedTaskIdSet.has(task.id)
				? tasks.filter((item) => selectedTaskIdSet.has(item.id))
				: undefined
			const isKeyboardHover =
				rowShortcutState?.hoverSource === 'keyboard' && rowShortcutState.hoveredId === task.id
			return (
				<TaskRowAdapter
					actions={rowActions}
					contextMenuActions={contextMenuActions}
					contextTasks={contextTasks}
					projectBinding={projectBinding}
					rowShortcutHandlers={
						handlers
							? {
									onHover: handlers.onRowHover,
									onPointerMove: handlers.onRowPointerMove,
								}
							: undefined
					}
					rowState={{
						isActive: activeTaskId === task.id,
						isPending: pendingTaskId === task.id,
						isSelected: selectedTaskIdSet.has(task.id),
						isHovered: isKeyboardHover,
						hoverSource: isKeyboardHover ? 'keyboard' : null,
					}}
					showSpaceLabel={showSpaceLabel}
					task={task}
					visibleProperties={visibleProperties}
				/>
			)
		},
		[
			activeTaskId,
			contextMenuActions,
			pendingTaskId,
			projectBinding,
			rowActions,
			selectedTaskIdSet,
			showSpaceLabel,
			tasks,
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
	}, [
		flatItems.length,
		hasNextPage,
		isFetchingNextPage,
		lastVirtualIndex,
		onFetchNextPage,
		status,
	])

	/**
	 * 把 push/显隐写到 DOM。
	 * 关键：换分区瞬间若立刻把 transform 写成 0，而 React 仍渲染旧标题，
	 * 被顶替的那一层会从「已顶出」弹回顶部 → 闪一下。
	 * 因此仅当浮层内容 index 已与几何 active 对齐时才写 transform。
	 */
	const applyStickyDom = useCallback((scrollTop: number, forceTransform = false) => {
		const layout = buildTaskBoardStickyPush({
			stickyIndexes: stickyMetaRef.current.stickyIndexes,
			itemOffsets: stickyMetaRef.current.itemOffsets,
			scrollTop,
		})
		if (!layout) {
			return null
		}
		const contentReady =
			forceTransform || layout.activeStickyIndex === stickyRenderedIndexRef.current
		const layer = stickyPushLayerRef.current
		if (layer && contentReady) {
			layer.style.transform = `translate3d(0, ${layout.pushOffset}px, 0)`
		}
		const shell = stickyShellRef.current
		if (shell) {
			// 常挂载，只用 visibility，避免 mount/unmount 闪一下
			shell.style.visibility = layout.stuck ? 'visible' : 'hidden'
			shell.style.pointerEvents = layout.stuck ? 'auto' : 'none'
		}
		return layout
	}, [])

	// sticky push：scroll 帧只写 DOM；index/stuck 变才 setState（换标题）
	useEffect(() => {
		const scrollEl = scrollViewportRef?.current
		const readTop = () => scrollEl?.scrollTop ?? 0
		let raf = 0
		const apply = () => {
			raf = 0
			const scrollTop = readTop()
			const layout = buildTaskBoardStickyPush({
				stickyIndexes: stickyMetaRef.current.stickyIndexes,
				itemOffsets: stickyMetaRef.current.itemOffsets,
				scrollTop,
			})
			if (!layout) {
				return
			}

			const indexChanged = layout.activeStickyIndex !== stickyActiveIndexRef.current
			if (indexChanged) {
				// 先登记期望 index 并触发 React 换标题；
				// 此帧不写 transform，旧标题保持最后一次 push（通常已顶出视口）
				stickyActiveIndexRef.current = layout.activeStickyIndex
				setStickyActiveIndex(layout.activeStickyIndex)
			} else {
				applyStickyDom(scrollTop, false)
			}

			if (layout.stuck !== stickyStuckRef.current) {
				stickyStuckRef.current = layout.stuck
				setStickyStuck(layout.stuck)
				const shell = stickyShellRef.current
				if (shell) {
					shell.style.visibility = layout.stuck ? 'visible' : 'hidden'
					shell.style.pointerEvents = layout.stuck ? 'auto' : 'none'
				}
			}
		}
		apply()
		if (!scrollEl) {
			return
		}
		const onScroll = () => {
			if (raf !== 0) return
			raf = requestAnimationFrame(apply)
		}
		scrollEl.addEventListener('scroll', onScroll, { passive: true })
		return () => {
			scrollEl.removeEventListener('scroll', onScroll)
			if (raf !== 0) cancelAnimationFrame(raf)
		}
	}, [applyStickyDom, scrollViewportRef, status, flatItems.length, stickyIndexes, itemOffsets])

	const stickyHeaderItem = flatItems[stickyActiveIndex]
	const stickyHeader = stickyHeaderItem?.kind === 'header' ? stickyHeaderItem : null
	const nextStickyIndex = (() => {
		const pos = stickyIndexes.indexOf(stickyActiveIndex)
		return pos >= 0 && pos < stickyIndexes.length - 1 ? stickyIndexes[pos + 1]! : null
	})()

	// React 提交新标题后、浏览器绘制前：标记内容已就绪并写回 transform
	useLayoutEffect(() => {
		stickyRenderedIndexRef.current = stickyActiveIndex
		const scrollTop = scrollViewportRef?.current?.scrollTop ?? 0
		applyStickyDom(scrollTop, true)
	}, [applyStickyDom, stickyActiveIndex, stickyStuck, stickyHeader?.key, scrollViewportRef])

	useEffect(() => {
		const indexByTaskId = new Map<string, number>()
		for (let i = 0; i < flatItems.length; i++) {
			const item = flatItems[i]
			if (item?.kind === 'row') {
				indexByTaskId.set(item.task.id, i)
			}
		}
		registerTaskBoardScrollToTaskId((taskId) => {
			const index = indexByTaskId.get(taskId)
			if (index === undefined) {
				return
			}
			virtualizer.scrollToIndex(index, { align: 'auto' })
		})
		return () => registerTaskBoardScrollToTaskId(null)
	}, [flatItems, virtualizer])

	if (status === 'idle' || status === 'loading') {
		return <BoardLoadingState />
	}

	if (status === 'error') {
		return (
			<StatusNotice
				description='任务数据暂时无法读取，请稍后重试。'
				title='读取任务失败'
				variant='danger'
			/>
		)
	}

	if (status === 'ready' && tasks.length === 0 && emptyTitle) {
		return (
			<BoardEmptyState
				actionLabel={emptyActionLabel}
				description={emptyDescription}
				icon={<ListTodoIcon />}
				onAction={onEmptyAction}
				title={emptyTitle}
			/>
		)
	}

	return (
		<TaskRowShortcutScope
			activeTaskId={activeTaskId}
			focusedTaskId={focusedTaskId}
			onClearTaskSelection={onClearTaskSelection}
			onOpenTask={onOpenTask}
			onPeekTask={onPeekTask}
			onMoveTaskFocus={onMoveTaskFocus}
			onSelectAllTasks={onSelectAllTasks}
			onSetFocusedTask={onSetFocusedTask}
			onToggleTaskSelection={onToggleTaskSelection}
			selectedTaskIdSet={selectedTaskIdSet}
			tasks={taskShortcutOrder}
		>
			{(rowShortcutState) => {
				const renderHeader = (item: Extract<TaskBoardFlatItem, { kind: 'header' }>) => (
					<div style={{ height: TASK_BOARD_HEADER_HEIGHT }}>
						<StatusSectionHeader
							count={item.count}
							createProjectId={createProjectId}
							label={item.label}
							onCollapseAll={handleCollapseAll}
							onExpandAll={handleExpandAll}
							onOpenChange={
								item.status
									? (open) => handleSectionOpenChange(item.status!, open)
									: undefined
							}
							onToggleTaskSelection={onToggleTaskSelection}
							open={item.open}
							openTaskCreateDialog={openTaskCreateDialog}
							selectedTaskIdSet={selectedTaskIdSet}
							status={item.status}
							tasks={item.status ? groupedTasks[item.status] : []}
						/>
					</div>
				)

				// 原位 header 在吸顶时隐藏，避免与浮层双影；浮层常挂载（visibility 控显隐）
				const hideListHeaderIndex = stickyStuck ? stickyActiveIndex : -1

				return (
					// 不用 BoardRoot 的 flex-1：虚拟列表必须由内容定高驱动 scrollHeight
					<div className='relative w-full' data-board-root='true'>
						{/*
						 * 零高度 sticky 壳（不占文档流高度）+ 定高裁剪层：
						 * 顶替时 push 负向位移，旧标题在裁剪盒内被顶出，而不是滑到版心上方再闪回。
						 */}
						{stickyHeader ? (
							<div
								ref={stickyShellRef}
								className='sticky top-0 z-20'
								data-task-board-sticky-header='true'
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
											height: TASK_BOARD_HEADER_HEIGHT,
											willChange: 'transform',
											backfaceVisibility: 'hidden',
										}}
									>
										{renderHeader(stickyHeader)}
									</div>
								</div>
							</div>
						) : null}
						<div
							className='relative w-full'
							data-task-board-virtual='sections'
							data-task-board-extent={contentHeightPx}
							// 供 OverlayScrollbar 观察内容定高变化（折叠立刻改拇指，不必等滚动）
							data-scroll-extent={contentHeightPx}
							ref={measureRef}
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
								const isHiddenStickySource =
									item?.kind === 'header' && index === hideListHeaderIndex
								// 下一个即将顶替的 header 提高层级，保证从下方盖过被顶走的浮层
								const isIncomingSticky =
									item?.kind === 'header' && nextStickyIndex === index && stickyStuck

								return (
									<div
										data-index={index}
										data-sticky={
											stickyStuck && index === stickyActiveIndex ? 'true' : undefined
										}
										key={key}
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
											renderHeader(item)
										) : (
											<div style={{ height: TASK_BOARD_ROW_HEIGHT }}>
												{renderTaskRow(item.task, rowShortcutState)}
											</div>
										)}
									</div>
								)
							})}
						</div>
						{isFetchingNextPage || fetchNextPageError ? (
							<div className='pointer-events-none absolute inset-x-0 bottom-2 z-10 flex justify-center'>
								{isFetchingNextPage ? (
									<div className='rounded-full bg-card/90 px-3 py-1 text-[12px] text-sf-text-tertiary shadow-sm'>
										加载更多…
									</div>
								) : null}
								{fetchNextPageError ? (
									<div className='pointer-events-auto rounded-full bg-card/90 px-3 py-1 text-[12px] text-destructive shadow-sm'>
										{fetchNextPageError}
										{onFetchNextPage ? (
											<button
												className='ml-2 underline'
												onClick={() => onFetchNextPage()}
												type='button'
											>
												重试
											</button>
										) : null}
									</div>
								) : null}
							</div>
						) : null}
					</div>
				)
			}}
		</TaskRowShortcutScope>
	)
}

function StatusSectionHeader({
	status,
	label,
	count,
	open,
	createProjectId,
	onOpenChange,
	onCollapseAll,
	onExpandAll,
	onToggleTaskSelection,
	selectedTaskIdSet,
	tasks,
	openTaskCreateDialog,
}: {
	status?: TaskStatus
	label: string
	count: number
	open: boolean
	createProjectId: string | null
	onOpenChange?: (open: boolean) => void
	onCollapseAll: () => void
	onExpandAll: () => void
	onToggleTaskSelection: (taskId: string) => void
	selectedTaskIdSet: Set<string>
	tasks: TaskListItem[]
	openTaskCreateDialog: (draft?: { projectId?: string | null; status?: TaskStatus }) => void
}) {
	const sectionIds = useMemo(() => tasks.map((t) => t.id), [tasks])
	const { selectedCount, handleSelectAll, handleDeselectAll } = useSectionSelection({
		sectionIds,
		selectedIdSet: selectedTaskIdSet,
		onToggleSelection: onToggleTaskSelection,
	})

	// 不用 CSS sticky：虚拟列表的顶替由外层浮层 + pushOffset 负责，这里只保留视觉 surface
	const header = (
		<div
			className={cn(ROW_SHELL_SECTION_HEADER_CLASS, 'relative z-10')}
			data-board-section-header='true'
			onDoubleClick={() => onOpenChange?.(!open)}
		>
			{status && onOpenChange ? (
				<button
					aria-expanded={open}
					aria-label={`切换 ${label} 分区折叠状态`}
					className={entityBoardSectionToggleClass}
					onClick={() => onOpenChange(!open)}
					type='button'
				>
					<span className='inline-flex size-3 shrink-0 items-center justify-center' data-chevron>
						<TriangleIcon
							className={cn(
								'size-1.5 text-sf-icon-subtle transition-transform',
								open ? 'rotate-180' : 'rotate-90',
							)}
							fill='currentColor'
						/>
					</span>
				</button>
			) : null}
			<div className={entityBoardSectionHeadingClass}>
				{status ? <TaskStatusIndicator status={status} /> : null}
				<span className='truncate'>{label}</span>
				<Badge className={entityBoardSectionCountBadgeClass} variant='secondary'>
					{count}
				</Badge>
				{selectedCount > 0 ? (
					<Badge
						className={cn(entityBoardSectionSelectedBadgeClass, entityBoardCompactBadgeClass)}
						variant='secondary'
					>
						已选 {selectedCount}
					</Badge>
				) : null}
			</div>
			{status ? (
				<Button
					aria-label={`在 ${label} 中创建任务`}
					className={entityBoardSectionActionButtonClass}
					onClick={(event) => {
						event.preventDefault()
						event.stopPropagation()
						openTaskCreateDialog({ projectId: createProjectId, status })
					}}
					size='icon-xs'
					type='button'
					variant='ghost'
				>
					<PlusIcon />
				</Button>
			) : (
				<span className={entityBoardSectionRightSpacerClass} />
			)}
		</div>
	)

	if (!onOpenChange) {
		return header
	}

	return (
		<div data-board-section='true' data-state={open ? 'open' : 'closed'}>
			<ContextMenu>
				<ContextMenuTrigger asChild>{header}</ContextMenuTrigger>
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

import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { registerTaskBoardScrollToTaskId } from './taskBoardScroll'
import { groupBy, uniq } from 'es-toolkit/array'

import {
	selectProjectTaskBoardOpenSections,
	useShellPreferenceStore,
} from '@/features/shell-dialogs'
import {
	BoardEmptyState,
	BoardLoadingState,
	BoardRoot,
	BOARD_GROUP_HEADER_CLASS,
} from '@/shared/components/board'
import { useDialogStore } from '@/features/shell-dialogs'
import { useSectionSelection } from '@/features/bulk-action'
import type { TaskDisplayPropertyKey } from '@/features/display-options'
import {
	TASK_BOARD_STATUS_ORDER,
	orderTasksByTaskBoardVisualOrder,
} from '@/features/task/model/taskBoardOrder'
import { type TaskPriorityValue } from '@/features/task/model/taskPriority'
import { formatTaskStatusLabel } from '@/features/task/model/taskStatus'
import { TaskRowShortcutScope, type TaskRowShortcutState } from '@/features/task/shortcuts'
import { TaskRowAdapter, type TaskRowAdapterProps } from '@/features/task/components/TaskRowAdapter'
import { TaskStatusIndicator } from '@/features/task/model/indicators/TaskStatusIndicator'
import { useTaskContextMenuBulkActions } from '@/features/task/components/useTaskContextMenuBulkActions'
import { createTaskPlacementGroupedDropdownProps } from '@/features/metadata-fields'
import type { TaskPlacementTarget } from '@/features/metadata-fields'
import type { TaskListItem, TaskStatus } from '@/shared/types'
import { Button } from '@/shared/components/base/button'
import { Badge } from '@/shared/components/base/badge'
import { ListTodoIcon, PlusIcon, TriangleIcon } from 'lucide-react'
import {
	entityBoardCompactBadgeClass,
	entityBoardSectionActionButtonClass,
	entityBoardSectionCountBadgeClass,
	entityBoardSectionSelectedBadgeClass,
	entityBoardSectionToggleClass,
} from '@/shared/components/patterns/entity-board'
import { StatusNotice } from '@/shared/components/StatusNotice'
import { cn } from '@/shared/lib/utils'
import { ROW_SHELL_SECTION_HEADER_CLASS } from '@/shared/components/patterns/row-tokens'

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
	spaces?: Array<{ id: string; name: string }>
	onSelectPlacement?: (task: TaskListItem, target: TaskPlacementTarget) => void
	showProjectCellOptions?: boolean
	/** 所有空间列表：行内固定展示 Space 名 */
	showSpaceLabel?: boolean
	visibleProperties?: TaskDisplayPropertyKey[]
	/** keyset 续拉 */
	hasNextPage?: boolean
	isFetchingNextPage?: boolean
	onFetchNextPage?: () => void
	fetchNextPageError?: string | null
}

type FlatItem =
	| {
			kind: 'header'
			key: string
			label: string
			count: number
			status?: TaskStatus
			open: boolean
	  }
	| {
			kind: 'row'
			key: string
			task: TaskListItem
	  }

const HEADER_SIZE = 36
const ROW_SIZE = 40
const ROW_SIZE_WITH_SPACE = 52

function getMainCardScrollElement() {
	return (
		document.querySelector<HTMLElement>('[data-scroll-container-role="main-card"]') ??
		// 测试 / 无壳环境：回退到 documentElement，避免 virtualizer 0 视口
		document.documentElement
	)
}

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
	hideEmptySections = false,
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
}: TaskBoardProps) {
	const openSections = useShellPreferenceStore(selectProjectTaskBoardOpenSections)
	const setProjectTaskBoardOpenSections = useShellPreferenceStore(
		(state) => state.setProjectTaskBoardOpenSections,
	)
	const contextMenuActions = useTaskContextMenuBulkActions({ onClearTaskSelection })
	const openTaskCreateDialog = useDialogStore((state) => state.openTaskCreateDialog)
	const measureRef = useRef<HTMLDivElement | null>(null)

	const groupedTasks = useMemo(() => {
		const tasksByStatus = groupBy(tasks, (task) => task.status)

		return {
			todo: tasksByStatus.todo ?? [],
			doing: tasksByStatus.doing ?? [],
			waiting: tasksByStatus.waiting ?? [],
			done: tasksByStatus.done ?? [],
			canceled: tasksByStatus.canceled ?? [],
		} satisfies Record<TaskStatus, TaskListItem[]>
	}, [tasks])

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

	// Board 级 placement groups：每行复用，避免 O(n) build
	const placementDropdown = useMemo(() => {
		if (!projectOptions || !onSelectPlacement) {
			return null
		}
		return createTaskPlacementGroupedDropdownProps({
			mode: 'local',
			currentSpaceId: null,
			spaces: spaces ?? [],
			projects: projectOptions,
		})
	}, [onSelectPlacement, projectOptions, spaces])

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
			placementGroups: placementDropdown?.groups,
			placementMenuLabel: placementDropdown?.menuLabel,
			placementHeaderShortcut: placementDropdown?.headerShortcut,
		}),
		[
			onSelectPlacement,
			placementDropdown?.groups,
			placementDropdown?.headerShortcut,
			placementDropdown?.menuLabel,
			projectOptions,
			showProjectCellOptions,
			spaces,
		],
	)

	const flatItems = useMemo((): FlatItem[] => {
		const items: FlatItem[] = []
		if (customSections && customSections.length > 0) {
			for (const section of customSections) {
				items.push({
					kind: 'header',
					key: `h:${section.key}`,
					label: section.label,
					count: section.tasks.length,
					open: true,
				})
				for (const task of section.tasks) {
					items.push({ kind: 'row', key: task.id, task })
				}
			}
			return items
		}

		const openSectionSet = new Set(openSections)
		for (const status of statusOrder) {
			const sectionTasks = groupedTasks[status]
			if (hideEmptySections && sectionTasks.length === 0) {
				continue
			}
			const open = openSectionSet.has(status)
			items.push({
				kind: 'header',
				key: `h:${status}`,
				label: formatTaskStatusLabel(status),
				count: sectionTasks.length,
				status,
				open,
			})
			if (open) {
				for (const task of sectionTasks) {
					items.push({ kind: 'row', key: task.id, task })
				}
			}
		}
		return items
	}, [customSections, groupedTasks, hideEmptySections, openSections, statusOrder])

	const rowEstimate = showSpaceLabel ? ROW_SIZE_WITH_SPACE : ROW_SIZE

	const virtualizer = useVirtualizer({
		count: flatItems.length,
		getScrollElement: getMainCardScrollElement,
		estimateSize: (index) => (flatItems[index]?.kind === 'header' ? HEADER_SIZE : rowEstimate),
		overscan: 12,
		// jsdom / 首帧未量到高度时给合理视口，避免 0 行
		initialRect: { width: 960, height: 720 },
		// 外部滚动容器时测量挂载节点
		measureElement:
			typeof window !== 'undefined' && 'ResizeObserver' in window
				? (element) => element.getBoundingClientRect().height
				: undefined,
	})

	const handleSectionOpenChange = useCallback(
		(status: TaskStatus, open: boolean) => {
			const nextSections = open
				? uniq([...openSections, status])
				: openSections.filter((section) => section !== status)
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

	const renderTaskRow = useCallback(
		(task: TaskListItem, rowShortcutState?: TaskRowShortcutState) => {
			const contextTasks = selectedTaskIdSet.has(task.id)
				? tasks.filter((item) => selectedTaskIdSet.has(item.id))
				: [task]
			// 仅键盘 hover 走 React 状态，指针 hover 用 CSS（避免全表 re-render）
			const isKeyboardHover =
				rowShortcutState?.hoverSource === 'keyboard' && rowShortcutState.hoveredId === task.id
			return (
				<TaskRowAdapter
					actions={rowActions}
					contextMenuActions={contextMenuActions}
					contextTasks={contextTasks}
					projectBinding={projectBinding}
					rowShortcutHandlers={
						rowShortcutState
							? {
									onHover: rowShortcutState.onRowHover,
									onPointerMove: rowShortcutState.onRowPointerMove,
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

	// —— 所有 hooks 必须在任何 early return 之前（Rules of Hooks）——
	const virtualItems = virtualizer.getVirtualItems()
	const totalSize = virtualizer.getTotalSize()
	const useVirtualWindow = virtualItems.length > 0
	const lastVirtualIndex = virtualItems[virtualItems.length - 1]?.index ?? -1

	// 接近末尾续拉
	useEffect(() => {
		if (
			status !== 'ready' ||
			!hasNextPage ||
			!onFetchNextPage ||
			isFetchingNextPage ||
			lastVirtualIndex < 0 ||
			lastVirtualIndex < flatItems.length - 8
		) {
			return
		}
		onFetchNextPage()
	}, [
		flatItems.length,
		hasNextPage,
		isFetchingNextPage,
		lastVirtualIndex,
		onFetchNextPage,
		status,
	])

	// 键盘导航：先把目标行滚进虚拟窗口
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
			{(rowShortcutState) => (
				<BoardRoot>
					<div
						className='relative w-full'
						data-task-board-virtual={useVirtualWindow ? 'true' : 'fallback'}
						ref={measureRef}
						style={useVirtualWindow ? { height: totalSize } : undefined}
					>
						{(useVirtualWindow
							? virtualItems.map((virtualRow) => ({
									index: virtualRow.index,
									start: virtualRow.start,
									key: String(virtualRow.key),
								}))
							: flatItems.map((item, index) => ({
									index,
									start: 0,
									key: item.key,
								}))
						).map(({ index, start, key }) => {
							const item = flatItems[index]
							if (!item) {
								return null
							}

							return (
								<div
									data-index={index}
									key={key}
									ref={useVirtualWindow ? virtualizer.measureElement : undefined}
									style={
										useVirtualWindow
											? {
													position: 'absolute',
													top: 0,
													left: 0,
													width: '100%',
													transform: `translateY(${start}px)`,
												}
											: undefined
									}
								>
									{item.kind === 'header' ? (
										<VirtualSectionHeader
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
									) : (
										<div className='px-0 py-px'>{renderTaskRow(item.task, rowShortcutState)}</div>
									)}
								</div>
							)
						})}
					</div>
					{isFetchingNextPage ? (
						<div className='px-2 py-2 text-center text-[12px] text-sf-text-tertiary'>
							加载更多…
						</div>
					) : null}
					{fetchNextPageError ? (
						<div className='px-2 py-2 text-center text-[12px] text-destructive'>
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
				</BoardRoot>
			)}
		</TaskRowShortcutScope>
	)
}

function VirtualSectionHeader({
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
	const { selectedCount } = useSectionSelection({
		sectionIds,
		selectedIdSet: selectedTaskIdSet,
		onToggleSelection: onToggleTaskSelection,
	})

	return (
		<div
			className={cn(
				'flex items-center justify-between gap-3 px-1',
				BOARD_GROUP_HEADER_CLASS,
				ROW_SHELL_SECTION_HEADER_CLASS,
			)}
			data-board-section-header='true'
		>
			<div className='flex min-w-0 items-center gap-2'>
				{status && onOpenChange ? (
					<button
						aria-expanded={open}
						aria-label={`${open ? '折叠' : '展开'}${label}`}
						className={entityBoardSectionToggleClass}
						onClick={() => onOpenChange(!open)}
						type='button'
					>
						<TriangleIcon
							className={cn('size-3 transition-transform', open ? 'rotate-90' : '')}
							data-chevron
						/>
						<span className='sr-only'>{label}</span>
					</button>
				) : null}
				{status ? <TaskStatusIndicator status={status} /> : null}
				<span className='truncate text-sm font-semibold text-foreground'>{label}</span>
				<Badge
					className={cn(entityBoardSectionCountBadgeClass, entityBoardCompactBadgeClass)}
					variant='secondary'
				>
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
			<div className='flex items-center gap-1'>
				{onOpenChange ? (
					<>
						<button
							className='px-1 text-[11px] text-sf-text-tertiary hover:text-foreground'
							onClick={onCollapseAll}
							type='button'
						>
							全部折叠
						</button>
						<button
							className='px-1 text-[11px] text-sf-text-tertiary hover:text-foreground'
							onClick={onExpandAll}
							type='button'
						>
							全部展开
						</button>
					</>
				) : null}
				<Button
					aria-label={`在 ${label} 中创建任务`}
					className={entityBoardSectionActionButtonClass}
					onClick={(event) => {
						event.preventDefault()
						event.stopPropagation()
						openTaskCreateDialog({
							projectId: createProjectId,
							...(status ? { status } : {}),
						})
					}}
					size='icon-xs'
					type='button'
					variant='ghost'
				>
					<PlusIcon />
				</Button>
			</div>
		</div>
	)
}

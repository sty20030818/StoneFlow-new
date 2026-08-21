import { memo, useCallback, useMemo, type Ref } from 'react'
import type { GridListItemAria } from 'react-aria'

import {
	COMMAND_IDS,
	CommandShortcut,
	useCommandRuntimeContext,
	type CommandId,
} from '@/features/command'
import type { TaskPriorityValue } from '@/features/task/model/taskPriority'
import { TASK_BOARD_ROW_HEIGHT } from '@/features/task/model/taskBoardModel'
import { TaskContextMenu } from '@/features/task/components/TaskContextMenu'
import { buildTaskCommandContext } from '@/features/task/commands/buildTaskCommandContext'
import type { TaskContextMenuBulkActions } from '@/features/task/components/useTaskContextMenuBulkActions'
import type { TaskDisplayPropertyKey } from '@/features/display-options'
import {
	createTaskPlacementGroupedDropdownProps,
	getTaskPriorityMetadataDropdownProps,
	getTaskStatusMetadataDropdownProps,
	MetadataDateDropdown,
	MetadataFieldDropdown,
	MetadataFieldValue,
	MetadataPlacementDropdown,
	resolveTaskPlacementTarget,
	taskDateMetadataIcons,
	type TaskPlacementGroup,
	type TaskPlacementTarget,
} from '@/features/metadata-fields'
import { getSpaceVisual } from '@/features/space'
import type { TaskListItem, TaskStatus } from '@/shared/types'
import { RowShell, type RowSelectionGroupPosition } from '@/shared/components/row'
import { ActionTooltip } from '@/shared/components/tooltip'
import { formatShortDate } from '@/shared/lib/date'
import { TaskRowCreatedAtCell, TaskRowSelectionCell, TaskRowTitleCell } from './TaskRowCells'

export type TaskRowAdapterProps = {
	task: TaskListItem
	contextTasks?: TaskListItem[]
	rowState: {
		isActive?: boolean
		isSelected: boolean
		isPending: boolean
		isFocused: boolean
		focusSource: 'pointer' | 'keyboard' | null
		suppressFocusIndicator?: boolean
	}
	rowProps?: GridListItemAria['rowProps']
	gridCellProps?: GridListItemAria['gridCellProps']
	rowRef?: Ref<HTMLDivElement>
	selectionGroupPosition?: RowSelectionGroupPosition
	contextMenuActions?: TaskContextMenuBulkActions
	onContextMenuOpenChange?: (open: boolean) => void
	projectBinding?: {
		projectOptions?: Array<{ id: string; name: string; spaceId: string }>
		/** 含 iconKey/colorKey 时可渲染 Space 真实彩色图标 */
		spaces?: Array<{ id: string; name: string; iconKey?: string; colorKey?: string }>
		onSelectPlacement?: (task: TaskListItem, target: TaskPlacementTarget) => void
		showProjectCellOptions?: boolean
		/** Board 级预计算的 placement groups；有则不再按行 build */
		placementGroups?: TaskPlacementGroup[]
		placementMenuLabel?: string
	}
	visibleProperties?: readonly TaskDisplayPropertyKey[]
	/** 跨 Space 列表（所有空间）时固定露出 Space 名，不依赖 display 偏好 */
	showSpaceLabel?: boolean
	actions: {
		onToggleTaskSelection: (taskId: string) => void
		onUpdateTaskPriority: (task: TaskListItem, priority: TaskPriorityValue) => Promise<void>
		onUpdateTaskStatus: (task: TaskListItem, status: TaskStatus) => Promise<void>
		onUpdateTaskDueDate?: (task: TaskListItem, dueAt: string | null) => Promise<void>
		onUpdateTaskScheduledAt?: (task: TaskListItem, plannedAt: string | null) => Promise<void>
		onUpdateTaskReminderAt?: (task: TaskListItem, remindAt: string | null) => Promise<void>
		onToggleTaskStatus: (task: TaskListItem) => Promise<void>
	}
}

function taskRowAdapterPropsEqual(prev: TaskRowAdapterProps, next: TaskRowAdapterProps): boolean {
	// 滚动时父级常新建 rowState / contextTasks 对象；按字段比，避免 memo 失效卡顿
	if (prev.task !== next.task) return false
	if (prev.actions !== next.actions) return false
	if (prev.contextMenuActions !== next.contextMenuActions) return false
	if (prev.onContextMenuOpenChange !== next.onContextMenuOpenChange) return false
	if (prev.projectBinding !== next.projectBinding) return false
	if (prev.visibleProperties !== next.visibleProperties) return false
	if (prev.showSpaceLabel !== next.showSpaceLabel) return false
	if (prev.selectionGroupPosition !== next.selectionGroupPosition) return false
	if (prev.rowProps !== next.rowProps) return false
	if (prev.gridCellProps !== next.gridCellProps) return false
	if (prev.rowRef !== next.rowRef) return false
	const ps = prev.rowState
	const ns = next.rowState
	if (
		ps.isActive !== ns.isActive ||
		ps.isSelected !== ns.isSelected ||
		ps.isPending !== ns.isPending ||
		ps.isFocused !== ns.isFocused ||
		ps.focusSource !== ns.focusSource ||
		ps.suppressFocusIndicator !== ns.suppressFocusIndicator
	) {
		return false
	}
	const pc = prev.contextTasks
	const nc = next.contextTasks
	if (pc === nc) return true
	if (!pc || !nc || pc.length !== nc.length) return false
	for (let i = 0; i < pc.length; i++) {
		if (pc[i] !== nc[i]) return false
	}
	return true
}

/**
 * TaskRowAdapter 负责把任务实体语义翻译为统一 RowShell + 功能型 field cells。
 */
export const TaskRowAdapter = memo(function TaskRowAdapter({
	task,
	contextTasks,
	rowState,
	rowProps,
	gridCellProps,
	rowRef,
	selectionGroupPosition,
	contextMenuActions,
	onContextMenuOpenChange,
	projectBinding,
	visibleProperties,
	showSpaceLabel = false,
	actions,
}: TaskRowAdapterProps) {
	const {
		isActive = false,
		isSelected,
		isPending,
		isFocused,
		focusSource,
		suppressFocusIndicator,
	} = rowState
	const { runtime: commandRuntime, context: commandContext } = useCommandRuntimeContext()
	const { onClick: _reactAriaPressClick, ...ariaRowProps } = rowProps ?? {}
	const actionTargets = useMemo(
		() => (contextTasks && contextTasks.length > 0 ? contextTasks : [task]),
		[contextTasks, task],
	)
	const isDoneLike = task.status === 'done' || task.status === 'canceled'
	const hasProjectOptions = Boolean(
		projectBinding?.projectOptions && projectBinding.onSelectPlacement,
	)
	const showProjectCellOptions =
		hasProjectOptions && projectBinding?.showProjectCellOptions !== false
	const rowCommandContext = useMemo(
		() =>
			buildTaskCommandContext({
				baseContext: commandContext,
				tasks: [task],
				targetTaskIds: [task.id],
				focusedTaskId: task.id,
				rowTargetId: task.id,
				rowTargetSource: focusSource === 'keyboard' ? 'focus' : 'hover',
			}),
		[commandContext, focusSource, task],
	)
	const contextMenuCommandContext = useMemo(
		() =>
			buildTaskCommandContext({
				baseContext: commandContext,
				tasks: actionTargets,
				targetTaskIds: actionTargets.map((item) => item.id),
				focusedTaskId: task.id,
				rowTargetId: task.id,
				rowTargetSource: 'context-menu',
				clearSelection: contextTasks ? commandContext.selection.clearSelection : undefined,
			}),
		[actionTargets, commandContext, contextTasks, task.id],
	)
	const projectContextMenuCommand = useCallback(
		(commandId: CommandId) => commandRuntime.project(commandId, contextMenuCommandContext),
		[commandRuntime, contextMenuCommandContext],
	)
	// Board 级单例 options（非每行工厂）
	const priorityDropdownProps = getTaskPriorityMetadataDropdownProps()
	const statusDropdownProps = getTaskStatusMetadataDropdownProps()
	const placementDropdownProps = useMemo(() => {
		// 预计算 groups 仅在非空时采用；空数组会导致 findTaskPlacementGroupItem 失败从而隐藏按钮
		if (projectBinding?.placementGroups && projectBinding.placementGroups.length > 0) {
			return {
				menuLabel: projectBinding.placementMenuLabel ?? '移动到项目...',
				groups: projectBinding.placementGroups,
			}
		}
		const placementSpaces = projectBinding?.spaces?.some((space) => space.id === task.spaceId)
			? projectBinding.spaces
			: [{ id: task.spaceId, name: task.spaceName }, ...(projectBinding?.spaces ?? [])]
		// 必须用 task.spaceId 作为 currentSpaceId（null 会得到空 groups，归属按钮消失）
		return createTaskPlacementGroupedDropdownProps({
			mode: 'local',
			currentSpaceId: task.spaceId,
			spaces: placementSpaces,
			projects: projectBinding?.projectOptions ?? [],
		})
	}, [projectBinding, task.spaceId, task.spaceName])
	const projectValue = resolveTaskPlacementTarget({
		spaceId: task.spaceId,
		projectId: task.projectId,
	})
	// All scope 行右侧 Space 按钮：用该 Space 自己的 iconKey + colorKey
	const spaceButtonVisual = useMemo(() => {
		const matched = projectBinding?.spaces?.find((space) => space.id === task.spaceId)
		const visual = getSpaceVisual({
			iconKey: matched?.iconKey ?? 'user',
			colorKey: matched?.colorKey ?? 'blue',
		})
		const SpaceIcon = visual.icon
		return {
			label: matched?.name ?? task.spaceName,
			icon: <SpaceIcon className={`size-3.5 shrink-0 ${visual.iconClassName}`} />,
		}
	}, [projectBinding?.spaces, task.spaceId, task.spaceName])
	const visiblePropertySet = useMemo(
		() =>
			new Set(
				visibleProperties ?? ['status', 'priority', 'project', 'dueAt', 'plannedAt', 'createdAt'],
			),
		[visibleProperties],
	)
	const showStatus = visiblePropertySet.has('status')
	const showPriority = visiblePropertySet.has('priority')
	const showProject = visiblePropertySet.has('project') && showProjectCellOptions
	const showDueAt = visiblePropertySet.has('dueAt')
	const showScheduledAt = visiblePropertySet.has('plannedAt')
	const showUpdatedAt = visiblePropertySet.has('updatedAt')
	const showCreatedAt = visiblePropertySet.has('createdAt')

	return (
		<TaskContextMenu
			isBusy={isPending}
			onOpenChange={onContextMenuOpenChange}
			onSelectDueDate={
				actions.onUpdateTaskDueDate
					? (dueAt) =>
							runContextMenuTaskAction(
								actionTargets,
								contextMenuActions
									? (targets) => contextMenuActions.onSelectDueDate(targets, dueAt)
									: undefined,
								(target) => actions.onUpdateTaskDueDate!(target, dueAt),
							)
					: undefined
			}
			onSelectPlacement={
				hasProjectOptions
					? (target) =>
							runContextMenuTaskAction(
								actionTargets,
								contextMenuActions
									? (targets) => contextMenuActions.onSelectPlacement(targets, target)
									: undefined,
								(item) => projectBinding!.onSelectPlacement!(item, target),
							)
					: undefined
			}
			onSelectPriority={(priority) =>
				runContextMenuTaskAction(
					actionTargets,
					contextMenuActions
						? (targets) => contextMenuActions.onSelectPriority(targets, priority)
						: undefined,
					(target) => actions.onUpdateTaskPriority(target, priority),
				)
			}
			onSelectStatus={(status) =>
				runContextMenuTaskAction(
					actionTargets,
					contextMenuActions
						? (targets) => contextMenuActions.onSelectStatus(targets, status)
						: undefined,
					(target) => actions.onUpdateTaskStatus(target, status),
				)
			}
			placementGroups={showProjectCellOptions ? placementDropdownProps.groups : undefined}
			placementValue={projectValue}
			priority={task.priority}
			projectCommand={projectContextMenuCommand}
			selectionValues={buildTaskContextSelectionValues(actionTargets)}
			status={task.status}
			dueAt={task.dueAt}
		>
			<RowShell
				{...ariaRowProps}
				ref={rowRef}
				aria-label={`打开任务 ${task.title}`}
				className='text-[13px] leading-5'
				data-focus-suppressed={suppressFocusIndicator || undefined}
				data-shell-task-card='true'
				data-task-id={task.id}
				data-focus-source={isFocused ? focusSource : undefined}
				active={isActive}
				hovered={isFocused}
				hoverSource={focusSource}
				interactive
				pending={isPending}
				selected={isSelected}
				selectionGroupPosition={selectionGroupPosition}
				style={{ height: TASK_BOARD_ROW_HEIGHT }}
				onClick={() =>
					void commandRuntime
						.project(COMMAND_IDS.taskOpenDetail, rowCommandContext)
						?.execute({ source: 'row' })
				}
			>
				<div {...gridCellProps} className='flex min-w-0 flex-1 items-center gap-3'>
					<div className='flex min-w-0 flex-1 items-center gap-2.5'>
						<div className='flex shrink-0 items-center gap-1'>
							<TaskRowSelectionCell
								ariaLabel={`选择任务：${task.title}`}
								checked={isSelected}
								disabled={isPending}
								disabledReason='正在更新任务，暂时无法更改选择'
								label='选择任务'
								tooltipShortcut={<CommandShortcut commandId={COMMAND_IDS.taskSelect} scope='row' />}
								onCheckedChange={() => actions.onToggleTaskSelection(task.id)}
							/>
							{showPriority ? (
								<MetadataFieldDropdown
									ariaLabel={`修改优先级：${task.title}`}
									buttonAppearance='row-icon'
									compact
									disabled={isPending}
									disabledReason='正在更新任务，暂时无法修改优先级'
									fieldKey='priority'
									label='优先级'
									menuLabel={priorityDropdownProps.menuLabel}
									options={priorityDropdownProps.options}
									shortcut={{ commandId: COMMAND_IDS.taskSetPriority, scope: 'row' }}
									stopPropagation
									tooltipLabel='修改优先级'
									value={task.priority}
									onChange={(priority) => void actions.onUpdateTaskPriority(task, priority)}
								/>
							) : null}
							{showStatus ? (
								<MetadataFieldDropdown
									ariaLabel={`修改状态：${task.title}`}
									buttonAppearance='row-icon'
									compact
									disabled={isPending}
									disabledReason='正在更新任务，暂时无法修改状态'
									fieldKey='status'
									label='状态'
									menuLabel={statusDropdownProps.menuLabel}
									options={statusDropdownProps.options}
									shortcut={{ commandId: COMMAND_IDS.taskSetStatus, scope: 'row' }}
									stopPropagation
									tooltipLabel='修改状态'
									value={task.status}
									onChange={(status) => void actions.onUpdateTaskStatus(task, status)}
								/>
							) : null}
						</div>

						<div className='min-w-0 flex-1'>
							<TaskRowTitleCell doneLike={isDoneLike} title={task.title} />
						</div>
					</div>

					<div className='ml-auto flex shrink-0 items-center gap-2'>
						<div className='hidden shrink-0 items-center justify-end gap-2 @min-[560px]/task-list:flex'>
							{showDueAt ? (
								<MetadataDateDropdown
									ariaLabel={`修改截止时间：${task.title}`}
									compact
									disabled={isPending}
									disabledReason='正在更新任务，暂时无法修改截止时间'
									hideWhenEmpty
									icon={taskDateMetadataIcons.due}
									label='截止时间'
									menuAlign='end'
									shortcut={{ commandId: COMMAND_IDS.taskOpenDateMenu, scope: 'row' }}
									stopPropagation
									tooltipLabel='修改截止时间'
									value={task.dueAt}
									onChange={(value) => void actions.onUpdateTaskDueDate?.(task, value)}
								/>
							) : null}
							{showScheduledAt ? (
								<MetadataDateDropdown
									ariaLabel={`修改计划时间：${task.title}`}
									compact
									disabled={isPending}
									disabledReason='正在更新任务，暂时无法修改计划时间'
									hideWhenEmpty
									icon={taskDateMetadataIcons.scheduled}
									label='计划时间'
									menuAlign='end'
									stopPropagation
									tooltipLabel='修改计划时间'
									value={task.plannedAt}
									onChange={(value) => void actions.onUpdateTaskScheduledAt?.(task, value)}
								/>
							) : null}
							{showProject ? (
								<MetadataPlacementDropdown
									compact
									disabled={isPending}
									disabledReason='正在更新任务，暂时无法修改归属'
									groups={placementDropdownProps.groups}
									label='归属'
									menuAlign='end'
									menuLabel={placementDropdownProps.menuLabel}
									shortcutMode='clear-only'
									shortcut={{ commandId: COMMAND_IDS.taskChangePlacement, scope: 'row' }}
									stopPropagation
									value={projectValue}
									onChange={(value: TaskPlacementTarget) =>
										projectBinding?.onSelectPlacement?.(task, value)
									}
								/>
							) : null}
							{/* All scope：Space 以行右侧按钮形式展示（与归属/日期并列） */}
							{showSpaceLabel && spaceButtonVisual.label ? (
								<MetadataFieldValue
									ariaLabel={`所属空间 ${spaceButtonVisual.label}`}
									compact
									icon={spaceButtonVisual.icon}
									label={spaceButtonVisual.label}
								/>
							) : null}
							{showUpdatedAt ? <UpdatedAtCell value={task.updatedAt} /> : null}
							{showCreatedAt ? <TaskRowCreatedAtCell value={task.createdAt} /> : null}
						</div>
					</div>
				</div>
			</RowShell>
		</TaskContextMenu>
	)
}, taskRowAdapterPropsEqual)

function UpdatedAtCell({ value }: { value: string | null | undefined }) {
	if (!value) {
		return null
	}
	const formatted = formatShortDate(value)

	return (
		<ActionTooltip label={`更新于 ${formatted}`}>
			<span className='shrink-0 text-xs tabular-nums text-muted'>{formatted}</span>
		</ActionTooltip>
	)
}

function runContextMenuTaskAction(
	targets: TaskListItem[],
	bulkRunner: ((targets: TaskListItem[]) => void) | undefined,
	singleRunner: (target: TaskListItem) => Promise<void> | void,
) {
	if (targets.length > 1 && bulkRunner) {
		bulkRunner(targets)
		return
	}

	void runForTargets(targets, singleRunner)
}

async function runForTargets(
	targets: TaskListItem[],
	runner: (target: TaskListItem) => Promise<void> | void,
) {
	for (const target of targets) {
		// 无 try/catch，任一 target 失败即中断后续处理（fail-fast），并行化会破坏这个语义，故保持串行
		// react-doctor-disable-next-line react-doctor/async-await-in-loop
		await runner(target)
	}
}

function buildTaskContextSelectionValues(tasks: TaskListItem[]) {
	return {
		statuses: tasks.map((item) => item.status),
		priorities: tasks.map((item) => item.priority),
		dueDates: tasks.map((item) => item.dueAt?.slice(0, 10) ?? null),
		placements: tasks.map((item) =>
			resolveTaskPlacementTarget({
				spaceId: item.spaceId,
				projectId: item.projectId,
			}),
		),
		projectNames: tasks.map((item) => item.projectName ?? null),
	}
}

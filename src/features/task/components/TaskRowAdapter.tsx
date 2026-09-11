import { createContext, memo, useCallback, useContext, useMemo, type ReactNode } from 'react'
import type { GridListItemAria } from 'react-aria'

import {
	COMMAND_IDS,
	CommandShortcut,
	type CommandId,
	type CommandProjection,
} from '@/features/command'
import type { TaskPriorityValue } from '@/features/task/model/taskPriority'
import { TaskContextMenu } from '@/features/task/components/TaskContextMenu'
import type { TaskContextMenuBulkActions } from '@/features/task/components/useTaskContextMenuBulkActions'
import {
	getTaskDisplayTimestampProperty,
	type TaskDisplayPropertyKey,
} from '@/features/display-options'
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
	type TaskPlacementTarget,
} from '@/features/metadata-fields'
import { getSpaceVisual } from '@/features/space'
import type { TaskListItem, TaskStatus } from '@/shared/types'
import { RowLayout, RowShell, type RowProperty } from '@/shared/components/row'
import { ActionTooltip } from '@/shared/components/tooltip'
import { formatShortDate } from '@/shared/lib/date'
import { TaskRowCreatedAtCell, TaskRowSelectionCell, TaskRowTitleCell } from './TaskRowCells'

const DEFAULT_ROW_VISIBLE_PROPERTIES: readonly TaskDisplayPropertyKey[] = [
	'status',
	'priority',
	'project',
	'dueAt',
	'plannedAt',
	'createdAt',
]

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
	contextMenuActions?: TaskContextMenuBulkActions
	onContextMenuOpenChange?: (open: boolean) => void
	projectBinding?: {
		projectOptions?: Array<{ id: string; name: string; spaceId: string }>
		/** 含 iconKey/colorKey 时可渲染 Space 真实彩色图标 */
		spaces?: Array<{ id: string; name: string; iconKey?: string; colorKey?: string }>
		onSelectPlacement?: (task: TaskListItem, target: TaskPlacementTarget) => void
		showProjectCellOptions?: boolean
	}
	visibleProperties?: readonly TaskDisplayPropertyKey[]
	/** 跨 Space 列表（所有空间）时固定露出 Space 名，不依赖 display 偏好 */
	showSpaceLabel?: boolean
	actions: {
		onActivateTask: (task: TaskListItem, focusSource: 'pointer' | 'keyboard' | null) => void
		projectContextMenuCommand: (
			commandId: CommandId,
			task: TaskListItem,
			targets: TaskListItem[],
			clearSelection: boolean,
		) => CommandProjection | null
		onToggleTaskSelection: (taskId: string) => void
		onUpdateTaskPriority: (task: TaskListItem, priority: TaskPriorityValue) => Promise<void>
		onUpdateTaskStatus: (task: TaskListItem, status: TaskStatus) => Promise<void>
		onUpdateTaskDueDate?: (task: TaskListItem, dueAt: string | null) => Promise<void>
		onUpdateTaskScheduledAt?: (task: TaskListItem, plannedAt: string | null) => Promise<void>
		onUpdateTaskReminderAt?: (task: TaskListItem, remindAt: string | null) => Promise<void>
		onToggleTaskStatus: (task: TaskListItem) => Promise<void>
	}
}

export type TaskRowAriaFrameProps = {
	rowProps: GridListItemAria['rowProps']
	gridCellProps: GridListItemAria['gridCellProps']
	setRowElement: (element: HTMLDivElement | null) => void
}

type TaskRowAriaProps = Pick<TaskRowAriaFrameProps, 'gridCellProps' | 'rowProps'>

const TaskRowAriaPropsContext = createContext<TaskRowAriaProps | null>(null)
const TaskRowElementContext = createContext<TaskRowAriaFrameProps['setRowElement'] | null>(null)

export function TaskRowAriaFrameProvider({
	children,
	gridCellProps,
	rowProps,
	setRowElement,
}: TaskRowAriaFrameProps & { children: ReactNode }) {
	return (
		<TaskRowElementContext.Provider value={setRowElement}>
			<TaskRowAriaPropsContext.Provider value={{ gridCellProps, rowProps }}>
				{children}
			</TaskRowAriaPropsContext.Provider>
		</TaskRowElementContext.Provider>
	)
}

/**
 * TaskRowAdapter 负责把任务实体语义翻译为统一 RowShell + 功能型 field cells。
 */
export const TaskRowAdapter = memo(function TaskRowAdapter({
	task,
	contextTasks,
	rowState,
	contextMenuActions,
	onContextMenuOpenChange,
	projectBinding,
	visibleProperties,
	showSpaceLabel = false,
	actions,
}: TaskRowAdapterProps) {
	const { isSelected, isPending, focusSource } = rowState
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
	const handleActivate = useCallback(() => {
		actions.onActivateTask(task, focusSource)
	}, [actions, focusSource, task])
	const projectContextMenuCommand = useCallback(
		(commandId: CommandId) =>
			actions.projectContextMenuCommand(commandId, task, actionTargets, Boolean(contextTasks)),
		[actionTargets, actions, contextTasks, task],
	)
	// Board 级单例 options（非每行工厂）
	const priorityDropdownProps = getTaskPriorityMetadataDropdownProps()
	const statusDropdownProps = getTaskStatusMetadataDropdownProps()
	const placementDropdownProps = useMemo(() => {
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
	const rowVisibleProperties = visibleProperties ?? DEFAULT_ROW_VISIBLE_PROPERTIES
	const visiblePropertySet = useMemo(() => new Set(rowVisibleProperties), [rowVisibleProperties])
	const showStatus = visiblePropertySet.has('status')
	const showPriority = visiblePropertySet.has('priority')
	const showProject = visiblePropertySet.has('project') && showProjectCellOptions
	const showDueAt = visiblePropertySet.has('dueAt')
	const showScheduledAt = visiblePropertySet.has('plannedAt')
	const timestampProperty = getTaskDisplayTimestampProperty(rowVisibleProperties)
	const properties: RowProperty[] = []
	if (showDueAt && task.dueAt) {
		properties.push({
			label: '截止时间',
			content: (
				<MetadataDateDropdown
					ariaLabel={`修改截止时间：${task.title}`}
					buttonAppearance='outline'
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
			),
		})
	}
	if (showScheduledAt && task.plannedAt) {
		properties.push({
			label: '计划时间',
			content: (
				<MetadataDateDropdown
					ariaLabel={`修改计划时间：${task.title}`}
					buttonAppearance='outline'
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
			),
		})
	}
	if (showProject) {
		properties.push({
			label: '归属',
			content: (
				<MetadataPlacementDropdown
					buttonAppearance='outline'
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
			),
		})
	}
	if (showSpaceLabel && spaceButtonVisual.label) {
		properties.push({
			label: '所属空间',
			content: (
				<MetadataFieldValue
					ariaLabel={`所属空间 ${spaceButtonVisual.label}`}
					compact
					icon={spaceButtonVisual.icon}
					label={spaceButtonVisual.label}
				/>
			),
		})
	}
	const timestamp: RowProperty | undefined =
		timestampProperty && task[timestampProperty]
			? {
					label: timestampProperty === 'updatedAt' ? '更新时间' : '创建时间',
					content:
						timestampProperty === 'updatedAt' ? (
							<UpdatedAtCell value={task.updatedAt} />
						) : (
							<TaskRowCreatedAtCell value={task.createdAt} />
						),
				}
			: undefined

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
			<TaskRowFrame onActivate={handleActivate} rowState={rowState} task={task}>
				<RowLayout
					selection={
						<TaskRowSelectionCell
							ariaLabel={`选择任务：${task.title}`}
							checked={isSelected}
							disabled={isPending}
							disabledReason='正在更新任务，暂时无法更改选择'
							label='选择任务'
							tooltipShortcut={<CommandShortcut commandId={COMMAND_IDS.taskSelect} scope='row' />}
							onCheckedChange={() => actions.onToggleTaskSelection(task.id)}
						/>
					}
					leading={
						showPriority || showStatus ? (
							<>
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
							</>
						) : undefined
					}
					primary={<TaskRowTitleCell doneLike={isDoneLike} title={task.title} />}
					properties={properties}
					timestamp={timestamp}
					propertiesLabel={`任务 ${task.title} 的属性`}
				/>
			</TaskRowFrame>
		</TaskContextMenu>
	)
})

function TaskRowFrame({
	children,
	onActivate,
	rowState,
	task,
}: {
	children: ReactNode
	onActivate: () => void
	rowState: TaskRowAdapterProps['rowState']
	task: TaskListItem
}) {
	const frame = useContext(TaskRowAriaPropsContext)
	const setRowElement = useContext(TaskRowElementContext)
	if (!frame || !setRowElement) throw new Error('TaskRowAdapter 缺少 TaskRowAriaFrameProvider')
	const { gridCellProps, rowProps } = frame
	const { onClick: _reactAriaPressClick, ...ariaRowProps } = rowProps
	const {
		isActive = false,
		isSelected,
		isPending,
		isFocused,
		focusSource,
		suppressFocusIndicator,
	} = rowState

	return (
		<RowShell
			{...ariaRowProps}
			ref={setRowElement}
			active={isActive}
			aria-label={`打开任务 ${task.title}`}
			className='text-[13px] leading-5'
			data-focus-source={isFocused ? focusSource : undefined}
			data-focus-suppressed={suppressFocusIndicator || undefined}
			data-shell-task-card='true'
			data-task-id={task.id}
			hovered={isFocused && focusSource === 'keyboard'}
			interactive
			onClick={onActivate}
			pending={isPending}
			selected={isSelected}
		>
			<div {...gridCellProps} className='min-w-0 flex-1'>
				{children}
			</div>
		</RowShell>
	)
}

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

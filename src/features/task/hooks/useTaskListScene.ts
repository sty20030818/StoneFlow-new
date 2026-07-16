import { useCallback, useMemo, type ReactNode } from 'react'

import type { MainCardToolbarPill } from '@/shared/components/main-card/MainCardLayout'
import type {
	EntitySceneTaskBoardActions,
	EntitySceneTaskBoardConfig,
	EntitySceneTaskBoardData,
	EntitySceneVariant,
} from '@/layout/entity-scene'
import { useCurrentShellRoute } from '@/layout/model/ShellRouteContext'
import { useDialogStore } from '@/layout/model/useDialogStore'
import { resolveBreadcrumb } from '@/app/navigation/breadcrumbResolver'
import { resolveShellRouteScope } from '@/app/navigation/scope'
import {
	applyTaskDisplayOptionsToTasks,
	createTaskDisplayApplyContext,
} from '@/features/display-options/adapters/task'
import type { TaskDisplayPageKey } from '@/features/display-options/core'
import { useTaskDisplayOptions } from '@/features/display-options/model'
import { useEntityDetailController } from '@/features/entity-detail'
import {
	useRegisterPageFilterController,
	useTaskPageFilterController,
} from '@/features/filter/model'
import { useProjectOptions } from '@/features/project/hooks'
import { buildTaskCommandSelection, useRegisterCommandSelection } from '@/features/selection/model'
import { useSpaces } from '@/features/space/hooks'
import { useRegisterTaskPreviewSource, useTaskPreviewController } from '@/features/task/detail'
import { formatTaskStatusLabel } from '@/features/task/model/taskStatus'
import { useTaskListController } from '@/features/task/model/useTaskListController'
import { useTaskSelection } from '@/features/task/model/useTaskSelection'
import { useTaskListData } from '@/features/task/hooks'
import type { TaskPlacement, TaskStatus } from '@/shared/types'

export type TaskListSceneVariant = 'inbox' | 'all' | 'no-project'

type VariantConfig = {
	displayPageKey: TaskDisplayPageKey
	placement: { kind: 'inbox' | 'all' | 'noProject' }
	sceneVariant: EntitySceneVariant
	boardVariant: EntitySceneTaskBoardConfig['variant']
	emptyTitle: string
	emptyDescription: string
	/** openTaskCreateDialog 草稿；undefined = 无参 */
	createDraft?: {
		status?: TaskStatus
		placement?: TaskPlacement
	}
	initialShowCompleted?: boolean
	supportsProject: boolean
	/** inbox：按当前 space 过滤 project options */
	filterProjectsBySpace: boolean
	fallbackSubtitle: string | ((task: { inboxAt: string | null }) => string)
	showStatusPills: 'all' | 'status-only' | 'inbox-count'
}

const VARIANT_CONFIG: Record<TaskListSceneVariant, VariantConfig> = {
	inbox: {
		displayPageKey: 'task:inbox',
		placement: { kind: 'inbox' },
		sceneVariant: 'inbox',
		boardVariant: 'inbox',
		emptyTitle: 'Inbox 已清空',
		emptyDescription:
			'新捕获的任务都会先来到这里，现在这一批已经整理完了。点「创建任务」也可以先记一条，之后再决定把它放去哪里。',
		createDraft: undefined,
		initialShowCompleted: false,
		supportsProject: true,
		filterProjectsBySpace: true,
		fallbackSubtitle: '收件箱',
		showStatusPills: 'inbox-count',
	},
	all: {
		displayPageKey: 'task:all',
		placement: { kind: 'all' },
		sceneVariant: 'tasks',
		boardVariant: 'tasks',
		emptyTitle: '当前没有任务',
		emptyDescription:
			'这里本来会显示符合当前条件的任务，不过现在还是空的。点「创建任务」先记下一项，后面再慢慢整理也来得及。',
		createDraft: { status: 'todo' },
		supportsProject: true,
		filterProjectsBySpace: false,
		fallbackSubtitle: (task) => (task.inboxAt ? '收件箱' : '独立事项'),
		showStatusPills: 'all',
	},
	'no-project': {
		displayPageKey: 'task:no-project',
		placement: { kind: 'noProject' },
		sceneVariant: 'no-project',
		boardVariant: 'no-project',
		emptyTitle: '当前没有独立事项',
		emptyDescription:
			'这里会放那些还没归属到项目里的任务，现在暂时还是空的。点「创建任务」先记下来，之后再决定要不要放进某个项目。',
		createDraft: { placement: 'noProject' },
		supportsProject: false,
		filterProjectsBySpace: false,
		fallbackSubtitle: '独立事项',
		showStatusPills: 'status-only',
	},
}

const ALL_TASK_FILTERS: Array<'all' | 'noProject' | TaskStatus> = [
	'all',
	'noProject',
	'doing',
	'todo',
	'waiting',
	'done',
	'canceled',
]

const NO_PROJECT_FILTERS: Array<'all' | TaskStatus> = [
	'all',
	'doing',
	'todo',
	'waiting',
	'done',
	'canceled',
]

/**
 * 三列表页（inbox / all-tasks / no-project）的唯一 wiring 入口。
 *
 * 收口：list data、filter、display、selection、command selection、
 * bulk 可见性、preview source 注册，以及 EntityScene board 打包字段。
 *
 * @param variant - 列表场景变体（placement / pageKey / pills / 新建草稿等）
 * @returns 供 {@link TaskListSceneView} 或厚页消费的 facade（勿把碎片再拆出 public）
 * @public 经 `@/features/task` 导出
 */
export function useTaskListScene(variant: TaskListSceneVariant) {
	const config = VARIANT_CONFIG[variant]
	const shellRoute = useCurrentShellRoute()
	const scope = resolveShellRouteScope(shellRoute)
	const spaceId = shellRoute.spaceId
	const openTaskCreateDialog = useDialogStore((state) => state.openTaskCreateDialog)
	const entityDetailController = useEntityDetailController()
	const activeDetail = entityDetailController.activeDetail
	const openEntityDrawer = entityDetailController.openDrawer
	const taskPreviewController = useTaskPreviewController()

	const listInput = useMemo(
		() => ({
			scope,
			viewKey: 'all' as const,
			placement: config.placement,
		}),
		[config.placement, scope],
	)
	const taskList = useTaskListData(listInput)
	const taskBoardStatus = taskList.status
	const taskSourceItems = taskBoardStatus === 'loading' ? [] : taskList.items

	const projectOptions = useProjectOptions(scope)
	const { spaces } = useSpaces()
	const resolvedProjectOptions = useMemo(() => {
		if (!config.filterProjectsBySpace || !spaceId) {
			return projectOptions
		}
		return projectOptions.filter((project) => project.spaceId === spaceId)
	}, [config.filterProjectsBySpace, projectOptions, spaceId])

	const {
		pendingTaskId,
		updateTaskStatus,
		updateTaskPriority,
		updateTaskDueDate,
		updateTaskScheduledAt,
		updateTaskReminderAt,
		toggleTaskStatus,
		archiveListTask,
		deleteListTask,
		updateTaskPlacement,
	} = useTaskListController()

	const breadcrumbItems = useMemo(() => resolveBreadcrumb({ route: shellRoute }), [shellRoute])
	const display = useTaskDisplayOptions(config.displayPageKey)

	const { controller, filteredTasks } = useTaskPageFilterController({
		tasks: taskSourceItems,
		projects: config.supportsProject ? resolvedProjectOptions : undefined,
		capabilities: {
			supportsPriority: true,
			supportsStatus: true,
			supportsDate: true,
			supportsProject: config.supportsProject,
			supportsToggleCompleted: true,
			supportsClearAll: true,
		},
		...(config.initialShowCompleted === false ? { initialShowCompleted: false as const } : {}),
	})
	useRegisterPageFilterController(controller)

	const displayResult = useMemo(
		() =>
			applyTaskDisplayOptionsToTasks({
				items: filteredTasks,
				options: display.options,
				context: createTaskDisplayApplyContext(config.displayPageKey),
			}),
		[config.displayPageKey, display.options, filteredTasks],
	)

	const {
		selectedTaskIdSet,
		selectionSnapshot,
		selectedCount,
		focusedTaskId,
		toggleTaskSelection,
		clearTaskSelection,
		setFocusedTaskId,
		moveFocus,
		selectTaskIds,
	} = useTaskSelection(displayResult.selectionOrderIds)

	const commandSelection = useMemo(
		() =>
			buildTaskCommandSelection({
				selectedIds: selectionSnapshot.ids,
				tasks: filteredTasks,
				fallbackSubtitle: config.fallbackSubtitle,
				focusedTaskId,
				clearSelection: clearTaskSelection,
			}),
		[
			clearTaskSelection,
			config.fallbackSubtitle,
			filteredTasks,
			focusedTaskId,
			selectionSnapshot.ids,
		],
	)
	useRegisterCommandSelection(commandSelection)

	const activeTaskId = activeDetail?.kind === 'task' ? activeDetail.id : null
	const previewSource = useMemo(
		() => ({
			tasks: filteredTasks,
			focusedTaskId,
			activeTaskId,
		}),
		[activeTaskId, filteredTasks, focusedTaskId],
	)
	useRegisterTaskPreviewSource(previewSource)

	const openCreate = useCallback(() => {
		if (config.createDraft) {
			openTaskCreateDialog(config.createDraft)
			return
		}
		openTaskCreateDialog()
	}, [config.createDraft, openTaskCreateDialog])

	const toolbarPills = useMemo((): MainCardToolbarPill[] => {
		if (config.showStatusPills === 'inbox-count') {
			return [
				{
					label: `待整理 ${filteredTasks.length}`,
					active: true,
				},
			]
		}

		if (config.showStatusPills === 'status-only') {
			return NO_PROJECT_FILTERS.map((filter) => ({
				label: filter === 'all' ? '所有任务' : formatTaskStatusLabel(filter),
				active:
					filter === 'all'
						? controller.state.statusValues.length === 0
						: controller.state.statusValues.length === 1 &&
							controller.state.statusValues[0] === filter,
				onClick: () =>
					controller.actions.applyFilter({
						kind: 'status',
						values: filter === 'all' ? [] : [filter],
					}),
			}))
		}

		return ALL_TASK_FILTERS.map((filter) => ({
			label:
				filter === 'all'
					? '所有任务'
					: filter === 'noProject'
						? '独立事项'
						: formatTaskStatusLabel(filter),
			active:
				filter === 'all'
					? controller.state.statusValues.length === 0 && !controller.state.projectlessOnly
					: filter === 'noProject'
						? controller.state.projectlessOnly
						: controller.state.statusValues.length === 1 &&
							controller.state.statusValues[0] === filter &&
							!controller.state.projectlessOnly,
			onClick: () => {
				if (filter === 'all') {
					controller.actions.applyFilter({ kind: 'status', values: [] })
					controller.actions.applyFilter({ kind: 'projectlessOnly', enabled: false })
					return
				}

				if (filter === 'noProject') {
					controller.actions.applyFilter({ kind: 'status', values: [] })
					controller.actions.applyFilter({ kind: 'projectlessOnly', enabled: true })
					return
				}

				controller.actions.applyFilter({ kind: 'projectlessOnly', enabled: false })
				controller.actions.applyFilter({ kind: 'status', values: [filter] })
			},
		}))
	}, [config.showStatusPills, controller, filteredTasks.length])

	const boardConfig: EntitySceneTaskBoardConfig = useMemo(
		() => ({
			variant: config.boardVariant,
			customSections: displayResult.boardPatch.customSections,
			emptyActionLabel: '创建任务',
			emptyDescription: config.emptyDescription,
			emptyTitle: config.emptyTitle,
			hideEmptySections: displayResult.boardPatch.hideEmptySections ?? true,
			statusOrder: displayResult.boardPatch.statusOrder,
			visibleProperties: displayResult.visibleProperties,
		}),
		[
			config.boardVariant,
			config.emptyDescription,
			config.emptyTitle,
			displayResult.boardPatch.customSections,
			displayResult.boardPatch.hideEmptySections,
			displayResult.boardPatch.statusOrder,
			displayResult.visibleProperties,
		],
	)

	const boardData: EntitySceneTaskBoardData = useMemo(
		() => ({
			items: displayResult.orderedItems,
			status: taskBoardStatus,
			activeItemId: activeTaskId,
			pendingItemId: pendingTaskId,
			selectedTaskIdSet,
			focusedTaskId,
		}),
		[
			activeTaskId,
			displayResult.orderedItems,
			focusedTaskId,
			pendingTaskId,
			selectedTaskIdSet,
			taskBoardStatus,
		],
	)

	const boardActions: EntitySceneTaskBoardActions = useMemo(
		() => ({
			onArchiveTask: archiveListTask,
			onClearTaskSelection: clearTaskSelection,
			onDeleteTask: deleteListTask,
			onEmptyAction: openCreate,
			onOpenTask: (taskId) => {
				taskPreviewController.closePreview()
				openEntityDrawer({ kind: 'task', id: taskId })
			},
			onPeekTask: (taskId, source) => {
				if (activeDetail?.kind === 'task') {
					return
				}
				taskPreviewController.openPreview(taskId, source)
			},
			onSelectAllTasks: selectTaskIds,
			onSetFocusedTask: setFocusedTaskId,
			onMoveTaskFocus: moveFocus,
			onSelectPlacement: (task, target) => void updateTaskPlacement(task, target),
			onToggleTaskSelection: toggleTaskSelection,
			onToggleTaskStatus: toggleTaskStatus,
			onUpdateTaskDueDate: updateTaskDueDate,
			onUpdateTaskScheduledAt: updateTaskScheduledAt,
			onUpdateTaskReminderAt: updateTaskReminderAt,
			onUpdateTaskPriority: updateTaskPriority,
			onUpdateTaskStatus: updateTaskStatus,
			projectOptions: resolvedProjectOptions,
			spaces,
		}),
		[
			activeDetail?.kind,
			archiveListTask,
			clearTaskSelection,
			deleteListTask,
			moveFocus,
			openCreate,
			openEntityDrawer,
			resolvedProjectOptions,
			selectTaskIds,
			setFocusedTaskId,
			spaces,
			taskPreviewController,
			toggleTaskSelection,
			toggleTaskStatus,
			updateTaskDueDate,
			updateTaskPlacement,
			updateTaskPriority,
			updateTaskReminderAt,
			updateTaskScheduledAt,
			updateTaskStatus,
		],
	)

	return {
		variant,
		sceneVariant: config.sceneVariant,
		displayPageKey: config.displayPageKey,
		breadcrumbItems,
		board: {
			boardKind: 'task' as const,
			boardConfig,
			boardData,
			boardActions,
		},
		toolbarPills,
		bulk: {
			selectedCount,
			clearTaskSelection,
		},
		openCreate,
		/** no-project 页脚提示由 View 渲染 */
		showNoProjectHint: variant === 'no-project',
	}
}

export type TaskListSceneFacade = ReturnType<typeof useTaskListScene>

/** 供 View 拼装 afterBoard 等 ReactNode 时的类型提示 */
export type TaskListSceneAfterBoard = ReactNode

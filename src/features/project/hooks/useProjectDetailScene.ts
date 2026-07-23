import { useMemo, useState } from 'react'
import { useNavigate, useParams } from '@tanstack/react-router'

import {
	openSection,
	resolveBreadcrumb,
	resolveShellRouteScope,
	useCurrentShellRoute,
} from '@/app/navigation'
import { useDangerConfirm } from '@/features/danger-confirm'
import {
	applyTaskDisplayOptionsToTasks,
	createTaskDisplayApplyContext,
	useTaskDisplayOptions,
	type TaskDisplayPageKey,
} from '@/features/display-options'
import { useEntityDetailController } from '@/features/entity-detail'
import type { EntitySceneBoardSlotProps } from '@/features/entity-scene'
import { useRegisterPageFilterController } from '@/features/filter'
import { useDialogStore } from '@/features/shell-dialogs'
import { useRegisterCommandSelection } from '@/features/selection'
import { useSpaces } from '@/features/space'
import {
	buildTaskCommandSelection,
	formatTaskStatusLabel,
	useRegisterTaskPreviewSource,
	useTaskListController,
	useTaskListData,
	useTaskPageFilterController,
	useTaskPreviewController,
	useTaskSelection,
} from '@/features/task'
import type { Scope, TaskStatus } from '@/shared/types'

import {
	useArchiveProjectMutation,
	useCompleteProjectMutation,
	useDeleteProjectMutation,
	useReopenProjectMutation,
} from './project.mutations'
import { useSuspenseProjectDetailQuery } from './project.queries'
import { useProjectOptions } from './useProjectData'

const PROJECT_TASK_FILTERS: Array<'all' | TaskStatus> = [
	'all',
	'doing',
	'todo',
	'waiting',
	'done',
	'canceled',
]

const PROJECT_DETAIL_DISPLAY_PAGE_KEY: TaskDisplayPageKey = 'task:project-detail'

type UseProjectDetailSceneArgs = {
	scopeOverride?: Scope
}

/**
 * 项目详情页唯一 wiring：项目头动作 + 嵌入任务板（组合 task public）。
 *
 * 不复制 task mutation；不 import layout。
 */
export function useProjectDetailScene({ scopeOverride }: UseProjectDetailSceneArgs = {}) {
	const navigate = useNavigate({ from: '/' })
	const { projectId = '' } = useParams({ strict: false }) as { projectId?: string }
	const shellRoute = useCurrentShellRoute()
	const scope = scopeOverride ?? resolveShellRouteScope(shellRoute)
	const spaceId = scope.type === 'space' ? scope.spaceId : null
	const { requestDangerConfirm } = useDangerConfirm()
	const openTaskCreateDialog = useDialogStore((state) => state.openTaskCreateDialog)
	const entityDetailController = useEntityDetailController()
	const activeDetail = entityDetailController.activeDetail
	const openEntityDrawer = entityDetailController.openDrawer
	const taskPreviewController = useTaskPreviewController()
	const { data: project } = useSuspenseProjectDetailQuery(projectId)
	const projectOptions = useProjectOptions(scope)
	const { spaces } = useSpaces()
	const completeProject = useCompleteProjectMutation()
	const reopenProject = useReopenProjectMutation()
	const archiveProject = useArchiveProjectMutation()
	const deleteProject = useDeleteProjectMutation()

	const listInput = useMemo(
		() => ({
			scope,
			viewKey: 'all' as const,
			placement: {
				kind: 'project' as const,
				projectId,
			},
		}),
		[projectId, scope],
	)
	const taskList = useTaskListData(listInput)
	const taskBoardStatus = taskList.status
	const taskSourceItems = taskList.items
	const {
		pendingTaskId,
		updateTaskStatus,
		updateTaskPriority,
		updateTaskDueDate,
		updateTaskScheduledAt,
		updateTaskReminderAt,
		updateTaskPlacement,
		toggleTaskStatus,
		archiveListTask,
		deleteListTask,
	} = useTaskListController()
	const [busyAction, setBusyAction] = useState<string | null>(null)

	const visibleTasks = useMemo(
		() => taskSourceItems.filter((task) => task.archivedAt === null),
		[taskSourceItems],
	)
	const { controller, filteredTasks } = useTaskPageFilterController({
		tasks: visibleTasks,
		capabilities: {
			supportsPriority: true,
			supportsStatus: true,
			supportsDate: true,
			supportsProject: false,
			supportsToggleCompleted: true,
			supportsClearAll: true,
		},
	})
	useRegisterPageFilterController(controller)
	const display = useTaskDisplayOptions(PROJECT_DETAIL_DISPLAY_PAGE_KEY)

	const breadcrumbItems = useMemo(
		() =>
			resolveBreadcrumb({
				route: shellRoute,
				projectDetail: project
					? {
							id: project.id,
							name: project.name,
						}
					: projectId
						? {
								id: projectId,
								name: '',
							}
						: null,
			}),
		[project, projectId, shellRoute],
	)
	const projectMoveOptions = useMemo(
		() =>
			project
				? projectOptions.filter((option) => option.spaceId === project.spaceId)
				: projectOptions,
		[project, projectOptions],
	)
	const displayResult = useMemo(
		() =>
			applyTaskDisplayOptionsToTasks({
				items: filteredTasks,
				options: display.options,
				context: createTaskDisplayApplyContext(PROJECT_DETAIL_DISPLAY_PAGE_KEY),
			}),
		[display.options, filteredTasks],
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
				fallbackSubtitle: project?.name ?? '当前项目',
				focusedTaskId,
				clearSelection: clearTaskSelection,
			}),
		[clearTaskSelection, filteredTasks, focusedTaskId, project?.name, selectionSnapshot.ids],
	)
	useRegisterCommandSelection(commandSelection)
	useRegisterTaskPreviewSource({
		tasks: filteredTasks,
		focusedTaskId,
		activeTaskId: activeDetail?.kind === 'task' ? activeDetail.id : null,
	})

	async function runAction(action: string, runner: () => Promise<unknown>) {
		setBusyAction(action)
		try {
			await runner()
		} finally {
			setBusyAction(null)
		}
	}

	const goToProjectsOverview = () => {
		void navigate({ to: openSection(scope, 'projects', spaceId) as never })
	}

	const board: EntitySceneBoardSlotProps = {
		boardKind: 'task',
		boardConfig: {
			variant: 'project-detail',
			customSections: displayResult.boardPatch.customSections,
			...(project
				? {
						emptyActionLabel: '创建任务',
						emptyDescription:
							'这个项目里还没有任务，所以现在还看不到进展内容。点「创建任务」先放进第一项，项目就能开始往前推进了。',
						emptyTitle: '当前项目没有任务',
					}
				: {}),
			hideEmptySections: displayResult.boardPatch.hideEmptySections ?? true,
			statusOrder: displayResult.boardPatch.statusOrder,
			visibleProperties: displayResult.visibleProperties,
		},
		boardData: {
			items: project ? displayResult.orderedItems : [],
			status: project ? taskBoardStatus : 'ready',
			activeItemId: activeDetail?.kind === 'task' ? activeDetail.id : null,
			pendingItemId: pendingTaskId,
			selectedTaskIdSet,
			focusedTaskId,
		},
		boardActions: {
			onArchiveTask: archiveListTask,
			onClearTaskSelection: clearTaskSelection,
			onDeleteTask: deleteListTask,
			onEmptyAction: () => openTaskCreateDialog({ projectId }),
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
			projectOptions: projectMoveOptions,
			spaces,
		},
	}

	const toolbarPills = PROJECT_TASK_FILTERS.map((filter) => ({
		label: filter === 'all' ? '所有任务' : formatTaskStatusLabel(filter),
		active:
			filter === 'all'
				? controller.state.statusValues.length === 0
				: controller.state.statusValues.length === 1 && controller.state.statusValues[0] === filter,
		onClick: () =>
			controller.actions.applyFilter({
				kind: 'status',
				values: filter === 'all' ? [] : [filter],
			}),
	}))

	return {
		project,
		busyAction,
		breadcrumbItems,
		board,
		displayPageKey: PROJECT_DETAIL_DISPLAY_PAGE_KEY,
		toolbarPills,
		bulk: {
			selectedCount,
			clearTaskSelection,
		},
		goToProjectsOverview,
		completeOrReopen: () => {
			if (!project) {
				return
			}
			void runAction(project.completedAt ? 'reopen' : 'complete', async () => {
				if (project.completedAt) {
					await reopenProject.mutateAsync(project.id)
					return
				}
				await completeProject.mutateAsync(project.id)
			})
		},
		archive: async () => {
			if (!project) {
				return
			}
			const confirmed = await requestDangerConfirm({
				intent: 'archive',
				entityType: 'project',
				count: 1,
				entityLabel: project.name,
			})
			if (!confirmed) {
				return
			}
			void runAction('archive', async () => {
				await archiveProject.mutateAsync(project.id)
				goToProjectsOverview()
			})
		},
		remove: async () => {
			if (!project) {
				return
			}
			const confirmed = await requestDangerConfirm({
				intent: 'trash',
				entityType: 'project',
				count: 1,
				entityLabel: project.name,
			})
			if (!confirmed) {
				return
			}
			void runAction('delete', async () => {
				await deleteProject.mutateAsync(project.id)
				goToProjectsOverview()
			})
		},
	}
}

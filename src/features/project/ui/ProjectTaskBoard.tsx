import type { ProjectExecutionTask } from '@/features/project/model/types'
import type { TaskPriorityValue } from '@/features/task/model/taskPriority'
import { TaskBoard } from '@/features/task/ui/TaskBoard'
import { useDialogStore } from '@/app/layouts/shell/model/useDialogStore'
import type { TaskStatus } from '@/shared/types'

type ProjectTaskBoardProps = {
	projectId: string
	tasks: ProjectExecutionTask[]
	pendingTaskId: string | null
	activeTaskId: string | null
	selectedTaskIdSet: Set<string>
	onToggleTaskSelection: (taskId: string) => void
	onUpdateTaskPriority: (task: ProjectExecutionTask, priority: TaskPriorityValue) => Promise<void>
	onUpdateTaskStatus: (task: ProjectExecutionTask, status: TaskStatus) => Promise<void>
	onToggleTaskStatus: (task: ProjectExecutionTask) => Promise<void>
	onArchiveTask: (task: ProjectExecutionTask) => Promise<void>
	onDeleteTask: (task: ProjectExecutionTask) => Promise<void>
	onOpenTask: (taskId: string) => void
}

export function ProjectTaskBoard({
	projectId,
	tasks,
	pendingTaskId,
	activeTaskId,
	selectedTaskIdSet,
	onToggleTaskSelection,
	onUpdateTaskPriority,
	onUpdateTaskStatus,
	onToggleTaskStatus,
	onArchiveTask,
	onDeleteTask,
	onOpenTask,
}: ProjectTaskBoardProps) {
	const openTaskCreateDialog = useDialogStore((state) => state.openTaskCreateDialog)

	return (
		<TaskBoard
			activeTaskId={activeTaskId}
			createProjectId={projectId}
			emptyActionLabel='创建任务'
			emptyDescription='当前项目还没有任何任务。'
			emptyTitle='当前项目还没有任务'
			hideEmptySections
			onArchiveTask={onArchiveTask}
			onDeleteTask={onDeleteTask}
			onEmptyAction={() => openTaskCreateDialog({ projectId, status: 'todo' })}
			onOpenTask={onOpenTask}
			onToggleTaskSelection={onToggleTaskSelection}
			onToggleTaskStatus={onToggleTaskStatus}
			onUpdateTaskPriority={onUpdateTaskPriority}
			onUpdateTaskStatus={onUpdateTaskStatus}
			pendingTaskId={pendingTaskId}
			selectedTaskIdSet={selectedTaskIdSet}
			sectionVariant='project'
			statusOrder={['doing', 'todo', 'waiting', 'done', 'canceled']}
			tasks={tasks}
		/>
	)
}

/**
 * 任务列表叶子页（inbox / tasks / no-project）。
 * 与其它工作区页拆开，避免静态扇入打穿 autoCodeSplitting。
 */
import { TaskListSceneView } from '@/features/task'

export function WorkspaceInboxPage() {
	return <TaskListSceneView variant='inbox' />
}

export function WorkspaceTasksPage() {
	return <TaskListSceneView variant='all' />
}

export function WorkspaceNoProjectPage() {
	return <TaskListSceneView variant='no-project' />
}

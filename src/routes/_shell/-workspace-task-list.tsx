/**
 * 任务列表叶子页（tasks / standalone）。
 * 与其它工作区页拆开，避免静态扇入打穿 autoCodeSplitting。
 */
import { TaskListSceneView } from '@/features/task'

export function WorkspaceTasksPage() {
	return <TaskListSceneView variant='all' />
}

export function WorkspaceStandalonePage() {
	return <TaskListSceneView variant='standalone' />
}

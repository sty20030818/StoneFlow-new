import { createFileRoute } from '@tanstack/react-router'

import { TaskListSceneView } from '@/features/task/ui/TaskListSceneView'

export const Route = createFileRoute('/_shell/spaces/$spaceId/tasks/')({
	component: AllTasksRoute,
})

function AllTasksRoute() {
	return <TaskListSceneView variant='all' />
}

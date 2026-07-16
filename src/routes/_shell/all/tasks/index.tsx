import { createFileRoute } from '@tanstack/react-router'

import { TaskListSceneView } from '@/features/task'

export const Route = createFileRoute('/_shell/all/tasks/')({
	component: AllTasksRoute,
})

function AllTasksRoute() {
	return <TaskListSceneView variant='all' />
}

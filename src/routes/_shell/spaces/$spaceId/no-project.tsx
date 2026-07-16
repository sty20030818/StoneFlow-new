import { createFileRoute } from '@tanstack/react-router'

import { TaskListSceneView } from '@/features/task/ui/TaskListSceneView'

export const Route = createFileRoute('/_shell/spaces/$spaceId/no-project')({
	component: NoProjectRoute,
})

function NoProjectRoute() {
	return <TaskListSceneView variant='no-project' />
}

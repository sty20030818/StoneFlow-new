import { createFileRoute } from '@tanstack/react-router'

import { TaskListSceneView } from '@/features/task/ui/TaskListSceneView'

export const Route = createFileRoute('/_shell/all/inbox')({
	component: InboxRoute,
})

function InboxRoute() {
	return <TaskListSceneView variant='inbox' />
}

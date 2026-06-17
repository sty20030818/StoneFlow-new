import { createFileRoute } from '@tanstack/react-router'

import { TaskPageRoute } from '@/features/task/detail/ui/TaskPageRoute'

export const Route = createFileRoute('/_shell/spaces/$spaceId/tasks/$taskId')({
	component: TaskPageRoute,
})

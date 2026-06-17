import { createFileRoute } from '@tanstack/react-router'

import { AllTasksPage } from '@/features/all-tasks/ui/AllTasksPage'

export const Route = createFileRoute('/_shell/all/tasks/')({
	component: AllTasksPage,
})

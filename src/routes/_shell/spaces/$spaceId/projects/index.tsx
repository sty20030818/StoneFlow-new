import { createFileRoute } from '@tanstack/react-router'

import { ProjectOverviewPage } from '@/features/project-overview/ui/ProjectOverviewPage'

export const Route = createFileRoute('/_shell/spaces/$spaceId/projects/')({
	component: ProjectOverviewPage,
})

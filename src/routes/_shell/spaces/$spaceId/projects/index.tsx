import { createFileRoute } from '@tanstack/react-router'

import { ProjectOverviewPage } from '@/features/project-overview'

export const Route = createFileRoute('/_shell/spaces/$spaceId/projects/')({
	component: ProjectOverviewPage,
})

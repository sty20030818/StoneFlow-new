import { createFileRoute } from '@tanstack/react-router'

import { ProjectOverviewPage } from '@/features/project-overview/components/ProjectOverviewPage'

export const Route = createFileRoute('/_shell/all/projects/')({
	component: ProjectOverviewPage,
})

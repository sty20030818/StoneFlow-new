import { createFileRoute } from '@tanstack/react-router'

import { ProjectPageRoute } from '@/features/project/ui/ProjectPageRoute'

export const Route = createFileRoute('/spaces/$spaceId/projects/$projectId')({
	component: ProjectPageRoute,
})

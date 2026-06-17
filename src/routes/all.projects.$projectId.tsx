import { createFileRoute } from '@tanstack/react-router'

import { ProjectPageRoute } from '@/features/project/ui/ProjectPageRoute'

export const Route = createFileRoute('/all/projects/$projectId')({
	component: ProjectPageRoute,
})

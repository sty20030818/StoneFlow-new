import { createFileRoute } from '@tanstack/react-router'

import { ArchivePage } from '@/features/archive/ui/ArchivePage'

export const Route = createFileRoute('/_shell/spaces/$spaceId/archive')({
	component: ArchivePage,
})

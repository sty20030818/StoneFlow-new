import { createFileRoute } from '@tanstack/react-router'

import { ArchivePage } from '@/features/archive/ui/ArchivePage'

export const Route = createFileRoute('/all/archive')({
	component: ArchivePage,
})

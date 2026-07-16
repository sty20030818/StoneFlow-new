import { createFileRoute } from '@tanstack/react-router'
import { ArchiveIcon } from 'lucide-react'

import { LifecycleList } from '@/features/lifecycle'

export const Route = createFileRoute('/_shell/all/archive')({
	component: ArchiveRoute,
})

function ArchiveRoute() {
	return <LifecycleList icon={ArchiveIcon} mode='archive' title='归档' />
}

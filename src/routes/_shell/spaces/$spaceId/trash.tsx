import { createFileRoute } from '@tanstack/react-router'
import { Trash2Icon } from 'lucide-react'

import { LifecycleList } from '@/features/lifecycle/components/LifecycleList'

export const Route = createFileRoute('/_shell/spaces/$spaceId/trash')({
	component: TrashRoute,
})

function TrashRoute() {
	return <LifecycleList icon={Trash2Icon} mode='trash' title='回收站' />
}

import { Trash2Icon } from 'lucide-react'

import { LifecycleList } from '@/features/lifecycle/ui/LifecycleList'

export function TrashPage() {
	return <LifecycleList icon={Trash2Icon} mode='trash' title='回收站' />
}

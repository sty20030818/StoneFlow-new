import { ArchiveIcon } from 'lucide-react'

import { LifecycleList } from '@/features/lifecycle/ui/LifecycleList'

export function ArchivePage() {
	return <LifecycleList icon={ArchiveIcon} mode='archive' title='归档' />
}

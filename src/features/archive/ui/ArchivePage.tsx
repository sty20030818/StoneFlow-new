import { useParams } from 'react-router-dom'
import { ArchiveIcon } from 'lucide-react'

import { ShellPlaceholderPage } from '@/features/workspace-shell/ui/ShellPlaceholderPage'

export function ArchivePage() {
	const { spaceId = 'work' } = useParams()

	return (
		<ShellPlaceholderPage
			backTo={`/space/${spaceId}/inbox`}
			description='阶段 3 先提供 Archive 导航与主内容骨架，生命周期回收规则会在后续阶段接入。'
			icon={ArchiveIcon}
			title='Archive'
		/>
	)
}

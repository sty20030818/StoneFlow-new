import { useParams } from 'react-router-dom'
import { TargetIcon } from 'lucide-react'

import { ShellPlaceholderPage } from '@/features/workspace-shell/ui/ShellPlaceholderPage'

export function ViewsPage() {
	const { spaceId = 'work' } = useParams()

	return (
		<ShellPlaceholderPage
			backTo={`/space/${spaceId}/inbox`}
			description='阶段 3 只先承接 Views 导航入口；系统视图与筛选执行器留到后续阶段落地。'
			icon={TargetIcon}
			title='Views'
		/>
	)
}

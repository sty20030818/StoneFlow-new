import { TargetIcon } from 'lucide-react'

import { buildScopedSectionPath } from '@/app/layouts/shell/config'
import { useScopeRoute } from '@/features/space/model/scopeRoute'
import { ShellPlaceholderPage } from '@/features/workspace-shell/ui/ShellPlaceholderPage'

export function ViewsPage() {
	const { scope, spaceId } = useScopeRoute()

	return (
		<ShellPlaceholderPage
			backTo={buildScopedSectionPath(scope, 'inbox', spaceId)}
			description='阶段 3 只先承接 Views 导航入口；系统视图与筛选执行器留到后续阶段落地。'
			icon={TargetIcon}
			title='Views'
		/>
	)
}

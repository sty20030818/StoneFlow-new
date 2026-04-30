import { FolderIcon } from 'lucide-react'

import { buildScopedSectionPath } from '@/app/layouts/shell/config'
import { useScopeRoute } from '@/features/space/model/scopeRoute'
import { ShellPlaceholderPage } from '@/features/workspace-shell/ui/ShellPlaceholderPage'

export function ProjectOverviewPage() {
	const { scope, spaceId } = useScopeRoute()

	return (
		<ShellPlaceholderPage
			backTo={buildScopedSectionPath(scope, 'inbox', spaceId)}
			description='这里先承接 Project Overview 占位路由，后续再接项目总览数据与状态分组。'
			icon={FolderIcon}
			title='Project Overview'
		/>
	)
}

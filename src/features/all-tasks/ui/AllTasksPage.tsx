import { ListTodoIcon } from 'lucide-react'

import { buildScopedSectionPath } from '@/app/layouts/shell/config'
import { useScopeRoute } from '@/features/space/model/scopeRoute'
import { ShellPlaceholderPage } from '@/features/workspace-shell/ui/ShellPlaceholderPage'

export function AllTasksPage() {
	const { scope, spaceId } = useScopeRoute()

	return (
		<ShellPlaceholderPage
			backTo={buildScopedSectionPath(scope, 'inbox', spaceId)}
			description='阶段 3 先只接入导航骨架，后续阶段再把跨项目任务聚合与筛选逻辑接入。'
			icon={ListTodoIcon}
			title='All Tasks'
		/>
	)
}

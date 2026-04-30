import { useParams } from 'react-router-dom'
import { ListTodoIcon } from 'lucide-react'

import { ShellPlaceholderPage } from '@/features/workspace-shell/ui/ShellPlaceholderPage'

export function AllTasksPage() {
	const { spaceId = 'work' } = useParams()

	return (
		<ShellPlaceholderPage
			backTo={`/space/${spaceId}/inbox`}
			description='阶段 3 先只接入导航骨架，后续阶段再把跨项目任务聚合与筛选逻辑接入。'
			icon={ListTodoIcon}
			title='All Tasks'
		/>
	)
}

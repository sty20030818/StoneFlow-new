import { useParams } from 'react-router-dom'
import { FolderIcon } from 'lucide-react'

import { ShellPlaceholderPage } from '@/features/workspace-shell/ui/ShellPlaceholderPage'

export function ProjectOverviewPage() {
	const { spaceId = 'work' } = useParams()

	return (
		<ShellPlaceholderPage
			backTo={`/space/${spaceId}/inbox`}
			description='这里先承接 Project Overview 占位路由，后续再接项目总览数据与状态分组。'
			icon={FolderIcon}
			title='Project Overview'
		/>
	)
}

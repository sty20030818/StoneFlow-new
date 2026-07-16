import type { ProjectOverviewViewKey } from '@/features/project'
import { Button } from '@/shared/components/base/button'
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyPage,
	EmptyTitle,
} from '@/shared/components/base/empty'
import { FolderIcon } from 'lucide-react'

type ProjectOverviewEmptyStateProps = {
	scopeLabel: string
	viewKey: ProjectOverviewViewKey
	onCreateProject: () => void
}

function getEmptyTitle(viewKey: ProjectOverviewViewKey) {
	switch (viewKey) {
		case 'completed':
			return '当前没有已完成项目'
		case 'archived':
			return '当前没有已归档项目'
		case 'all':
			return '当前 Scope 还没有项目'
		default:
			return '当前没有活跃项目'
	}
}

export function ProjectOverviewEmptyState({
	scopeLabel,
	viewKey,
	onCreateProject,
}: ProjectOverviewEmptyStateProps) {
	return (
		<EmptyPage>
			<Empty>
				<EmptyHeader>
					<EmptyMedia variant='icon'>
						<FolderIcon />
					</EmptyMedia>
					<EmptyTitle>{getEmptyTitle(viewKey)}</EmptyTitle>
					<EmptyDescription>
						当前范围：{scopeLabel}。这里还没有满足当前条件的项目。
					</EmptyDescription>
				</EmptyHeader>
				<EmptyContent>
					<Button onClick={onCreateProject} type='button'>
						创建项目
					</Button>
				</EmptyContent>
			</Empty>
		</EmptyPage>
	)
}

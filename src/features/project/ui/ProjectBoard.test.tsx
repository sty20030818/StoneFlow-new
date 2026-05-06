import { render, screen } from '@testing-library/react'

import { ProjectBoard } from '@/features/project/ui/ProjectBoard'
import type { ProjectOverviewItem } from '@/shared/types'

describe('ProjectBoard', () => {
	it('按项目状态分区渲染项目总览', () => {
		render(
			<ProjectBoard
				busyProjectId={null}
				emptyDescription='empty'
				emptyTitle='empty'
				items={[
					createProject({
						id: 'project-active',
						name: '进行中项目',
						completedAt: null,
						archivedAt: null,
					}),
					createProject({
						id: 'project-completed',
						name: '已完成项目 A',
						completedAt: '2026-05-01T00:00:00Z',
						archivedAt: null,
					}),
					createProject({
						id: 'project-archived',
						name: '已归档项目 A',
						completedAt: null,
						archivedAt: '2026-05-01T00:00:00Z',
					}),
				]}
				onArchive={() => undefined}
				onComplete={() => undefined}
				onDelete={() => undefined}
				onOpen={() => undefined}
				onReopen={() => undefined}
				status='ready'
				variant='overview'
			/>,
		)

		expect(screen.getByRole('button', { name: '切换 进行中项目 分区折叠状态' })).toBeInTheDocument()
		expect(screen.getByRole('button', { name: '切换 已完成项目 分区折叠状态' })).toBeInTheDocument()
		expect(screen.getByRole('button', { name: '切换 已归档项目 分区折叠状态' })).toBeInTheDocument()
		expect(screen.getByText('进行中项目', { selector: 'p' })).toBeInTheDocument()
		expect(screen.getByText('已完成项目 A')).toBeInTheDocument()
		expect(screen.getByText('已归档项目 A')).toBeInTheDocument()
	})
})

function createProject(
	overrides: Partial<ProjectOverviewItem> & Pick<ProjectOverviewItem, 'id' | 'name'>,
): ProjectOverviewItem {
	return {
		id: overrides.id,
		spaceId: overrides.spaceId ?? 'space-1',
		spaceName: overrides.spaceName ?? '个人',
		name: overrides.name,
		description: overrides.description ?? null,
		dueAt: overrides.dueAt ?? null,
		sortOrder: overrides.sortOrder ?? 1000,
		taskCount: overrides.taskCount ?? 3,
		activeTaskCount: overrides.activeTaskCount ?? 2,
		completedAt: overrides.completedAt ?? null,
		archivedAt: overrides.archivedAt ?? null,
		deletedAt: overrides.deletedAt ?? null,
		createdAt: overrides.createdAt ?? '2026-05-01T00:00:00Z',
		updatedAt: overrides.updatedAt ?? '2026-05-01T00:00:00Z',
	}
}

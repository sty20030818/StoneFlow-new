import { fireEvent, screen } from '@testing-library/react'
import type { ReactElement } from 'react'

import { DangerConfirmProvider } from '@/features/danger-confirm'
import { ProjectBoard } from '@/features/project/components/ProjectBoard'
import type { ProjectOverviewItem } from '@/shared/types'
import { renderWithInteractionProviders as render } from '@/test/TestInteractionProviders'

describe('ProjectBoard', () => {
	it('按项目状态分区渲染项目总览', () => {
		renderProjectBoard(
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

		expect(screen.getByRole('button', { name: '折叠 进行中项目' })).toBeInTheDocument()
		expect(screen.getByRole('button', { name: '折叠 已完成项目' })).toBeInTheDocument()
		expect(screen.getByRole('button', { name: '折叠 已归档项目' })).toBeInTheDocument()
		expect(screen.getAllByText('进行中项目')).not.toHaveLength(0)
		expect(screen.getByText('已完成项目 A')).toBeInTheDocument()
		expect(screen.getByText('已归档项目 A')).toBeInTheDocument()
		expect(screen.queryByText('个活跃')).not.toBeInTheDocument()
		expect(screen.queryByText('个任务')).not.toBeInTheDocument()
	})

	it('Shift 上下键使用通用 row shortcut 选择项目', () => {
		const onToggleProjectSelection = vi.fn()
		renderProjectBoard(
			<ProjectBoard
				busyProjectId={null}
				emptyDescription='empty'
				emptyTitle='empty'
				focusedProjectId='project-1'
				items={[
					createProject({ id: 'project-1', name: '项目 A' }),
					createProject({ id: 'project-2', name: '项目 B' }),
				]}
				onArchive={() => undefined}
				onComplete={() => undefined}
				onDelete={() => undefined}
				onMoveProjectFocus={() => null}
				onOpen={() => undefined}
				onReopen={() => undefined}
				onToggleProjectSelection={onToggleProjectSelection}
				selectedProjectIds={new Set()}
				status='ready'
				variant='overview'
			/>,
		)

		fireEvent.keyDown(window, { key: 'ArrowDown', shiftKey: true })

		expect(onToggleProjectSelection).toHaveBeenCalledWith('project-1')
	})
})

function renderProjectBoard(node: ReactElement) {
	return render(<DangerConfirmProvider>{node}</DangerConfirmProvider>)
}

function createProject(
	overrides: Partial<ProjectOverviewItem> & Pick<ProjectOverviewItem, 'id' | 'name'>,
): ProjectOverviewItem {
	return {
		id: overrides.id,
		spaceId: overrides.spaceId ?? 'space-1',
		spaceName: overrides.spaceName ?? '个人',
		name: overrides.name,
		description: overrides.description ?? null,
		status: overrides.status ?? 'todo',
		priority: overrides.priority ?? 0,
		plannedAt: overrides.plannedAt ?? null,
		dueAt: overrides.dueAt ?? null,
		remindAt: overrides.remindAt ?? null,
		statusChangedAt: overrides.statusChangedAt ?? '2026-05-01T00:00:00Z',
		position: overrides.position ?? 1000,
		taskCount: overrides.taskCount ?? 3,
		activeTaskCount: overrides.activeTaskCount ?? 2,
		completedAt: overrides.completedAt ?? null,
		archivedAt: overrides.archivedAt ?? null,
		deletedAt: overrides.deletedAt ?? null,
		createdAt: overrides.createdAt ?? '2026-05-01T00:00:00Z',
		updatedAt: overrides.updatedAt ?? '2026-05-01T00:00:00Z',
	}
}

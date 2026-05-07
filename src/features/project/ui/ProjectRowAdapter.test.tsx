import { fireEvent, render, screen } from '@testing-library/react'

import type { ProjectOverviewItem } from '@/shared/types'
import { ProjectRowAdapter, type ProjectRowAdapterProps } from './ProjectRowAdapter'

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

function buildActions(): ProjectRowAdapterProps['actions'] {
	return {
		onOpenProject: vi.fn(),
		onCompleteProject: vi.fn(),
		onReopenProject: vi.fn(),
		onArchiveProject: vi.fn(),
		onDeleteProject: vi.fn(),
	}
}

function renderProjectRowAdapter({
	project = createProject({ id: 'project-1', name: '项目 A' }),
	rowState = { isPending: false },
	actions = buildActions(),
}: {
	project?: ProjectOverviewItem
	rowState?: ProjectRowAdapterProps['rowState']
	actions?: ProjectRowAdapterProps['actions']
} = {}) {
	render(<ProjectRowAdapter actions={actions} project={project} rowState={rowState} />)
	return { project, rowState, actions }
}

describe('ProjectRowAdapter', () => {
	it('点击整行触发打开项目', () => {
		const { actions } = renderProjectRowAdapter()

		fireEvent.click(screen.getByRole('button', { name: '打开项目 项目 A' }))
		expect(actions.onOpenProject).toHaveBeenCalledWith('project-1')
	})

	it('根据完成态切换动作按钮并透传回调', () => {
		const running = renderProjectRowAdapter()
		fireEvent.click(screen.getByRole('button', { name: '完成' }))
		expect(running.actions.onCompleteProject).toHaveBeenCalledWith('project-1')

		const reopenActions = buildActions()
		render(
			<ProjectRowAdapter
				actions={reopenActions}
				project={createProject({
					id: 'project-2',
					name: '项目 B',
					completedAt: '2026-05-02T00:00:00Z',
				})}
				rowState={{ isPending: false }}
			/>,
		)

		fireEvent.click(screen.getByRole('button', { name: '重开' }))
		expect(reopenActions.onReopenProject).toHaveBeenCalledWith('project-2')
	})

	it('右键菜单可触发移入回收站', async () => {
		const { actions } = renderProjectRowAdapter()
		const row = screen.getByRole('button', { name: '打开项目 项目 A' })

		fireEvent.contextMenu(row)
		fireEvent.click(await screen.findByRole('menuitem', { name: '移入回收站' }))
		expect(actions.onDeleteProject).toHaveBeenCalledWith('project-1')
	})

	it('pending 态映射到行壳样式', () => {
		renderProjectRowAdapter({
			rowState: { isPending: true },
		})

		expect(screen.getByRole('button', { name: '打开项目 项目 A' }).className).toContain(
			'opacity-75',
		)
	})
})

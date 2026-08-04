import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { DangerConfirmProvider } from '@/features/danger-confirm'
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
	projectBinding,
}: {
	project?: ProjectOverviewItem
	rowState?: ProjectRowAdapterProps['rowState']
	actions?: ProjectRowAdapterProps['actions']
	projectBinding?: ProjectRowAdapterProps['projectBinding']
} = {}) {
	render(
		<DangerConfirmProvider>
			<ProjectRowAdapter
				actions={actions}
				project={project}
				projectBinding={projectBinding}
				rowState={rowState}
			/>
		</DangerConfirmProvider>,
	)
	return { project, rowState, actions, projectBinding }
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
			<DangerConfirmProvider>
				<ProjectRowAdapter
					actions={reopenActions}
					project={createProject({
						id: 'project-2',
						name: '项目 B',
						completedAt: '2026-05-02T00:00:00Z',
					})}
					rowState={{ isPending: false }}
				/>
			</DangerConfirmProvider>,
		)

		fireEvent.click(screen.getByRole('button', { name: '重开' }))
		expect(reopenActions.onReopenProject).toHaveBeenCalledWith('project-2')
	})

	it('右键菜单可触发移入回收站', async () => {
		const { actions } = renderProjectRowAdapter()
		const row = screen.getByRole('button', { name: '打开项目 项目 A' })

		fireEvent.contextMenu(row)
		fireEvent.click(await screen.findByRole('menuitem', { name: '移入回收站' }))
		expect(actions.onDeleteProject).not.toHaveBeenCalled()
		await screen.findByRole('alertdialog')
		fireEvent.click(screen.getByRole('button', { name: '移入回收站' }))
		await waitFor(() => {
			expect(actions.onDeleteProject).toHaveBeenCalledWith('project-1')
		})
	})

	it('pending 态映射到行壳样式', () => {
		renderProjectRowAdapter({
			rowState: { isPending: true },
		})

		expect(screen.getByRole('button', { name: '打开项目 项目 A' }).className).toContain(
			'opacity-75',
		)
	})

	it('选择框在选中或 hover 时可见', () => {
		const actions = {
			...buildActions(),
			onToggleSelected: vi.fn(),
		}
		renderProjectRowAdapter({
			actions,
			rowState: { isPending: false, isHovered: true, hoverSource: 'keyboard' },
		})

		expect(
			screen
				.getByRole('checkbox', { name: '选择项目 项目 A' })
				.closest('[data-slot="row-selection-cell"]')?.className,
		).toContain('opacity-100')
	})

	it('hover 会更新 row shortcut hover', () => {
		const rowShortcutHandlers = {
			onHover: vi.fn(),
		}
		const actions = {
			...buildActions(),
			onToggleSelected: vi.fn(),
		}
		render(
			<DangerConfirmProvider>
				<ProjectRowAdapter
					actions={actions}
					project={createProject({ id: 'project-1', name: '项目 A' })}
					rowShortcutHandlers={rowShortcutHandlers}
					rowState={{ isPending: false }}
				/>
			</DangerConfirmProvider>,
		)

		const row = screen.getByRole('button', { name: '打开项目 项目 A' })
		fireEvent.mouseEnter(row)

		expect(rowShortcutHandlers.onHover).toHaveBeenCalledWith('project-1')
	})

	it('showProjectCell=true 时可渲染并选择父项目', async () => {
		const projectBinding = {
			showProjectCell: true,
			projectOptions: [
				{ id: 'project-1', name: '项目 A' },
				{ id: 'project-2', name: '项目 B' },
			],
			onSelectProject: vi.fn(),
			onSelectStandalone: vi.fn(),
		}

		renderProjectRowAdapter({ projectBinding })

		fireEvent.pointerDown(screen.getByRole('button', { name: '父项目' }))
		fireEvent.click(await screen.findByRole('menuitem', { name: /项目 B/ }))
		expect(projectBinding.onSelectProject).toHaveBeenCalledWith('project-2')

		fireEvent.pointerDown(screen.getByRole('button', { name: '父项目' }))
		fireEvent.click(await screen.findByRole('menuitem', { name: /无父项目/ }))
		expect(projectBinding.onSelectStandalone).toHaveBeenCalledTimes(1)
	})

	it('字段点击不会触发行打开，日期无值时不渲染', async () => {
		const { actions } = renderProjectRowAdapter({
			project: createProject({ id: 'project-1', name: '项目 A', dueAt: null }),
			projectBinding: {
				showProjectCell: true,
				projectOptions: [{ id: 'project-2', name: '项目 B' }],
				onSelectProject: vi.fn(),
				onSelectStandalone: vi.fn(),
			},
		})

		expect(screen.queryByRole('button', { name: /截止 项目 A/ })).not.toBeInTheDocument()

		fireEvent.pointerDown(screen.getByRole('button', { name: '父项目' }))
		fireEvent.click(await screen.findByRole('menuitem', { name: /项目 B/ }))

		expect(actions.onOpenProject).not.toHaveBeenCalled()
	})
})

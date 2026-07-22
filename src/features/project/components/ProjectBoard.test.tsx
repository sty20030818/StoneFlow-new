import { fireEvent, render, screen } from '@testing-library/react'
import { useState, type ReactElement } from 'react'

import { DangerConfirmProvider } from '@/features/danger-confirm'
import { ProjectBoard } from '@/features/project/components/ProjectBoard'
import type { ProjectOverviewItem } from '@/shared/types'

describe('ProjectBoard', () => {
	it('加载中不显示空态文案', () => {
		renderProjectBoard(
			<ProjectBoard
				busyProjectId={null}
				emptyDescription='empty'
				emptyTitle='当前 Scope 还没有项目'
				items={[]}
				onArchive={() => undefined}
				onComplete={() => undefined}
				onDelete={() => undefined}
				onOpen={() => undefined}
				onReopen={() => undefined}
				status='loading'
				variant='overview'
			/>,
		)

		expect(screen.queryByText('当前 Scope 还没有项目')).not.toBeInTheDocument()
		expect(screen.queryByText('empty')).not.toBeInTheDocument()
	})

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

		expect(screen.getByRole('button', { name: '切换 进行中项目 分区折叠状态' })).toBeInTheDocument()
		expect(screen.getByRole('button', { name: '切换 已完成项目 分区折叠状态' })).toBeInTheDocument()
		expect(screen.getByRole('button', { name: '切换 已归档项目 分区折叠状态' })).toBeInTheDocument()
		expect(screen.getByText('进行中项目', { selector: 'p' })).toBeInTheDocument()
		expect(screen.getByText('已完成项目 A')).toBeInTheDocument()
		expect(screen.getByText('已归档项目 A')).toBeInTheDocument()
		expect(screen.queryByText('个活跃')).not.toBeInTheDocument()
		expect(screen.queryByText('个任务')).not.toBeInTheDocument()
	})

	it('连续选中的项目行透传显式 group position', () => {
		renderProjectBoard(
			<ProjectBoard
				busyProjectId={null}
				emptyDescription='empty'
				emptyTitle='empty'
				items={[
					createProject({ id: 'project-1', name: '项目 A' }),
					createProject({ id: 'project-2', name: '项目 B' }),
					createProject({ id: 'project-3', name: '项目 C' }),
				]}
				onArchive={() => undefined}
				onComplete={() => undefined}
				onDelete={() => undefined}
				onOpen={() => undefined}
				onReopen={() => undefined}
				selectedProjectIds={new Set(['project-2', 'project-3'])}
				status='ready'
				variant='overview'
			/>,
		)

		expect(screen.getByRole('button', { name: '打开项目 项目 B' })).toHaveAttribute(
			'data-selection-group-position',
			'first',
		)
		expect(screen.getByRole('button', { name: '打开项目 项目 C' })).toHaveAttribute(
			'data-selection-group-position',
			'last',
		)
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

	it('鼠标 hover 项目行时不显示键盘边框，移开后清除 hover', () => {
		renderProjectBoard(<ProjectBoardHoverHarness />)

		const row = screen.getByRole('button', { name: '打开项目 项目 A' })

		fireEvent.mouseEnter(row)
		expect(row.className).toContain('bg-sf-list-row-hover')
		expect(row.className).not.toContain('border-sf-border-subtle')

		fireEvent.mouseLeave(row)
		expect(row.className).not.toContain('bg-sf-list-row-hover')
		expect(row.className).not.toContain('border-sf-border-subtle')
	})
})

function renderProjectBoard(node: ReactElement) {
	return render(<DangerConfirmProvider>{node}</DangerConfirmProvider>)
}

function ProjectBoardHoverHarness() {
	const [focusedProjectId, setFocusedProjectId] = useState<string | null>(null)

	return (
		<ProjectBoard
			busyProjectId={null}
			emptyDescription='empty'
			emptyTitle='empty'
			focusedProjectId={focusedProjectId}
			items={[createProject({ id: 'project-1', name: '项目 A' })]}
			onArchive={() => undefined}
			onComplete={() => undefined}
			onDelete={() => undefined}
			onMoveProjectFocus={() => null}
			onOpen={() => undefined}
			onReopen={() => undefined}
			onSetFocusedProject={setFocusedProjectId}
			status='ready'
			variant='overview'
		/>
	)
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

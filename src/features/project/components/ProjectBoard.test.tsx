import { fireEvent, screen } from '@testing-library/react'
import { useEffect, useMemo } from 'react'

import { useGroupedCollectionInteraction } from '@/features/selection'
import type { ProjectOverviewItem } from '@/shared/types'
import { renderWithInteractionProviders as render } from '@/test/TestInteractionProviders'

import { buildProjectSections, PROJECT_SECTION_ORDER } from '../model/buildProjectSections'
import { ProjectBoard } from './ProjectBoard'

describe('ProjectBoard', () => {
	it('按项目状态分区渲染项目总览', () => {
		render(
			<ProjectBoardHarness
				items={[
					createProject({ id: 'project-active', name: '进行中项目' }),
					createProject({
						id: 'project-completed',
						name: '已完成项目 A',
						completedAt: '2026-05-01T00:00:00Z',
					}),
					createProject({
						id: 'project-archived',
						name: '已归档项目 A',
						archivedAt: '2026-05-01T00:00:00Z',
					}),
				]}
			/>,
		)

		expect(screen.getByRole('button', { name: '折叠 进行中项目' })).toHaveAttribute(
			'aria-expanded',
			'true',
		)
		expect(screen.getByRole('button', { name: '折叠 已完成项目' })).toBeInTheDocument()
		expect(screen.getByRole('button', { name: '折叠 已归档项目' })).toBeInTheDocument()
		expect(screen.getByText('已完成项目 A')).toBeInTheDocument()
		expect(screen.getByText('已归档项目 A')).toBeInTheDocument()
	})

	it('Shift 方向键直接写入唯一 collection selection', () => {
		render(
			<ProjectBoardHarness
				focusedProjectId='project-1'
				items={[
					createProject({ id: 'project-1', name: '项目 A' }),
					createProject({ id: 'project-2', name: '项目 B' }),
				]}
			/>,
		)

		const firstRow = screen.getByRole('row', { name: '打开项目 项目 A' })
		fireEvent.keyDown(firstRow, { key: 'ArrowDown', shiftKey: true })

		expect(screen.getByRole('checkbox', { name: '选择项目 项目 A' })).toBeChecked()
	})

	it('连续选择位置通过 BoardRowSlot 公共 hook 暴露', () => {
		render(
			<ProjectBoardHarness
				defaultSelectedProjectIds={['project-1', 'project-2']}
				items={[
					createProject({ id: 'project-1', name: '项目 A' }),
					createProject({ id: 'project-2', name: '项目 B' }),
				]}
			/>,
		)

		expect(
			screen.getByRole('row', { name: '打开项目 项目 A' }).closest('[data-board-row-slot]'),
		).toHaveAttribute('data-selection-group-position', 'first')
		expect(
			screen.getByRole('row', { name: '打开项目 项目 B' }).closest('[data-board-row-slot]'),
		).toHaveAttribute('data-selection-group-position', 'last')
	})

	it('错误态重试调用公开 onRetry', () => {
		const onRetry = vi.fn()
		render(<ProjectBoardHarness items={[]} onRetry={onRetry} status='error' />)

		fireEvent.click(screen.getByRole('button', { name: '重试' }))
		expect(onRetry).toHaveBeenCalledOnce()
	})
})

function ProjectBoardHarness({
	items,
	focusedProjectId = null,
	defaultSelectedProjectIds = [],
	onRetry = () => undefined,
	status = 'ready',
}: {
	items: ProjectOverviewItem[]
	focusedProjectId?: string | null
	defaultSelectedProjectIds?: string[]
	onRetry?: () => void | Promise<unknown>
	status?: 'idle' | 'loading' | 'ready' | 'error'
}) {
	const sections = useMemo(() => buildProjectSections(items), [items])
	const groups = useMemo(
		() =>
			sections.map((section) => ({
				key: section.key,
				itemKeys: section.items.map((project) => project.id),
			})),
		[sections],
	)
	const collection = useGroupedCollectionInteraction({
		groups,
		defaultOpenGroupKeys: PROJECT_SECTION_ORDER,
		defaultSelectedKeys: defaultSelectedProjectIds,
	})
	const focusKey = collection.interaction.focusKey
	useEffect(() => {
		focusKey(focusedProjectId)
	}, [focusKey, focusedProjectId])

	return (
		<ProjectBoard
			busyProjectId={null}
			collection={collection}
			emptyDescription='empty'
			emptyTitle='empty'
			onComplete={() => undefined}
			onOpen={() => undefined}
			onReopen={() => undefined}
			onRetry={onRetry}
			sections={sections}
			status={status}
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

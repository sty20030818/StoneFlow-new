import type { ReactNode } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { vi } from 'vitest'

import { ViewsPage } from '@/features/views/ui/ViewsPage'

const loadListSpy = vi.fn()
const openDrawerSpy = vi.fn()
const openTaskCreateDialogSpy = vi.fn()

const mockTaskStoreState = {
	list: {
		items: [
			{
				id: 'task-1',
				spaceId: 'space-1',
				spaceName: '工作',
				spaceSlug: 'work',
				projectId: 'project-1',
				projectName: '阶段 8',
				inboxAt: null,
				title: '系统视图任务',
				note: null,
				status: 'todo' as const,
				statusChangedAt: '2026-05-03T10:00:00Z',
				priority: 4,
				dueAt: '2026-05-03',
				scheduledAt: null,
				reminderAt: null,
				completedAt: null,
				canceledAt: null,
				archivedAt: null,
				createdAt: '2026-05-03T10:00:00Z',
				updatedAt: '2026-05-03T10:00:00Z',
			},
		],
		status: 'ready' as const,
		error: null,
		input: null,
	},
	loadList: loadListSpy,
}

vi.mock('@/app/layouts/shell/model/useDrawerStore', () => ({
	useDrawerStore: (selector: (state: unknown) => unknown) =>
		selector({
			activeDrawerId: null,
			activeDrawerKind: null,
			openDrawer: openDrawerSpy,
		}),
}))

vi.mock('@/app/layouts/shell/model/useDialogStore', () => ({
	useDialogStore: (selector: (state: unknown) => unknown) =>
		selector({
			openTaskCreateDialog: openTaskCreateDialogSpy,
		}),
}))

vi.mock('@/features/task/model/useTaskStore', () => ({
	selectTaskList: (state: typeof mockTaskStoreState) => state.list,
	useTaskStore: (selector: (state: typeof mockTaskStoreState) => unknown) =>
		selector(mockTaskStoreState),
}))

vi.mock('@/features/task/model/useTaskListController', () => ({
	useTaskListController: () => ({
		pendingTaskId: null,
		updateTaskPriority: vi.fn(),
		updateTaskStatus: vi.fn(),
		toggleTaskStatus: vi.fn(),
		archiveListTask: vi.fn(),
		deleteListTask: vi.fn(),
	}),
}))

vi.mock('@/features/task/model/useTaskSelection', () => ({
	useTaskSelection: () => ({
		selectedTaskIdSet: new Set(['task-1']),
		selectedCount: 1,
		toggleTaskSelection: vi.fn(),
		clearTaskSelection: vi.fn(),
	}),
}))

vi.mock('@/features/task/ui/TaskBoard', () => ({
	TaskBoard: ({ emptyTitle, tasks }: { emptyTitle: string; tasks: Array<{ title: string }> }) => (
		<div>
			<div>{emptyTitle}</div>
			<div>{tasks.map((task) => task.title).join(',')}</div>
		</div>
	),
}))

vi.mock('@/features/task/ui/TaskBulkActionBar', () => ({
	TaskBulkActionBar: ({
		selectedCount,
		action,
	}: {
		selectedCount: number
		action: ReactNode
	}) => (selectedCount > 0 ? <div>{action}</div> : null),
}))

describe('ViewsPage', () => {
	beforeEach(() => {
		loadListSpy.mockReset()
	})

	it('根据 query viewKey 加载对应系统视图，并保留禁用批量说明', async () => {
		render(
			<MemoryRouter initialEntries={['/spaces/views?view=focus']}>
				<Routes>
					<Route path='/spaces/views' element={<ViewsPage />} />
				</Routes>
			</MemoryRouter>,
		)

		await waitFor(() => {
			expect(loadListSpy).toHaveBeenCalledWith({
				scope: { type: 'all' },
				viewKey: 'focus',
				placement: { kind: 'all' },
			})
		})

		expect(screen.getByText('批量能力后续接入')).toBeDisabled()
	})

	it('点击系统视图 tab 后切换到新的 viewKey', async () => {
		render(
			<MemoryRouter initialEntries={['/spaces/views?view=today']}>
				<Routes>
					<Route path='/spaces/views' element={<ViewsPage />} />
				</Routes>
			</MemoryRouter>,
		)

		await waitFor(() => {
			expect(loadListSpy).toHaveBeenCalledWith({
				scope: { type: 'all' },
				viewKey: 'today',
				placement: { kind: 'all' },
			})
		})

		fireEvent.click(screen.getByRole('tab', { name: 'Upcoming' }))

		await waitFor(() => {
			expect(loadListSpy).toHaveBeenLastCalledWith({
				scope: { type: 'all' },
				viewKey: 'upcoming',
				placement: { kind: 'all' },
			})
		})
	})
})

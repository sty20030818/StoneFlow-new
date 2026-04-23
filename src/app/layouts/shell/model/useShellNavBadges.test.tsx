import { renderHook, waitFor } from '@testing-library/react'

import { useShellLayoutStore } from '@/app/layouts/shell/model/useShellLayoutStore'
import { useShellNavBadges } from '@/app/layouts/shell/model/useShellNavBadges'
import { listInboxTasks } from '@/features/inbox/api/listInboxTasks'
import { listTrashEntries } from '@/features/trash/api/listTrashEntries'

vi.mock('@/features/inbox/api/listInboxTasks', () => ({
	listInboxTasks: vi.fn<typeof listInboxTasks>(),
}))

vi.mock('@/features/trash/api/listTrashEntries', () => ({
	listTrashEntries: vi.fn<typeof listTrashEntries>(),
}))

const mockedListInboxTasks = vi.mocked(listInboxTasks)
const mockedListTrashEntries = vi.mocked(listTrashEntries)

describe('useShellNavBadges', () => {
	afterEach(() => {
		vi.clearAllMocks()
		useShellLayoutStore.setState({
			taskDataVersion: 0,
			projectDataVersion: 0,
		})
	})

	it('使用 Inbox 和 Trash 的真实数量生成导航 badge', async () => {
		mockedListInboxTasks.mockResolvedValue({
			tasks: Array.from({ length: 3 }, (_, index) => ({
				id: `task-${index}`,
				projectId: null,
				title: `任务 ${index}`,
				note: null,
				status: 'inbox',
				priority: null,
				createdAt: '2026-04-23T00:00:00Z',
				updatedAt: '2026-04-23T00:00:00Z',
			})),
			projects: [],
		})
		mockedListTrashEntries.mockResolvedValue({
			entries: Array.from({ length: 2 }, (_, index) => ({
				id: `trash-${index}`,
				entityType: 'task',
				entityId: `task-${index}`,
				title: `已删除任务 ${index}`,
				deletedAt: '2026-04-23T00:00:00Z',
				deletedFrom: null,
				restoreHint: '恢复到 Inbox',
				originalProjectId: null,
				originalParentProjectId: null,
			})),
		})

		const { result } = renderHook(() => useShellNavBadges('work'))

		await waitFor(() => {
			expect(result.current).toEqual({
				inbox: '3',
				trash: '2',
			})
		})
		expect(mockedListInboxTasks).toHaveBeenCalledWith({ spaceSlug: 'work' })
		expect(mockedListTrashEntries).toHaveBeenCalledWith({ spaceSlug: 'work' })
	})

	it('数量为 0 时不显示 badge', async () => {
		mockedListInboxTasks.mockResolvedValue({
			tasks: [],
			projects: [],
		})
		mockedListTrashEntries.mockResolvedValue({
			entries: [],
		})

		const { result } = renderHook(() => useShellNavBadges('work'))

		await waitFor(() => {
			expect(result.current).toEqual({
				inbox: undefined,
				trash: undefined,
			})
		})
	})
})

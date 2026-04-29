import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import { getEntityActivities } from '@/features/activity/api/getEntityActivities'
import { ActivityDebugPage } from '@/features/activity/ui/ActivityDebugPage'

vi.mock('@/features/activity/api/getEntityActivities', () => ({
	getEntityActivities: vi.fn<typeof getEntityActivities>(),
}))

const mockedGetEntityActivities = vi.mocked(getEntityActivities)

describe('ActivityDebugPage', () => {
	afterEach(() => {
		mockedGetEntityActivities.mockReset()
	})

	it('在空查询参数下渲染等待态', () => {
		renderActivityDebugPage('/space/work/debug/activity')

		expect(screen.getByText('等待查询')).toBeInTheDocument()
		expect(
			screen.getByText('输入 entity type 和 entity id 后即可读取该实体的 Activity timeline。'),
		).toBeInTheDocument()
		expect(mockedGetEntityActivities).not.toHaveBeenCalled()
	})

	it('查询成功后展示事件列表与字段变化', async () => {
		mockedGetEntityActivities.mockResolvedValue([
			{
				id: 'event-1',
				entityType: 'task',
				entityId: 'task-1',
				action: 'task.status.changed',
				actorType: 'user',
				source: 'app',
				summary: '状态已经推进到进行中',
				metadata: { panel: 'drawer' },
				createdAt: '2026-04-29T01:00:00Z',
				changes: [
					{
						id: 'change-1',
						field: 'status',
						oldValue: 'todo',
						newValue: 'doing',
						createdAt: '2026-04-29T01:00:00Z',
					},
				],
			},
		])

		renderActivityDebugPage('/space/work/debug/activity?entityType=task&entityId=task-1&limit=20')

		await waitFor(() => {
			expect(screen.getByText('task.status.changed')).toBeInTheDocument()
		})

		expect(mockedGetEntityActivities).toHaveBeenCalledWith({
			entityType: 'task',
			entityId: 'task-1',
			limit: 20,
		})
		expect(screen.getByText('状态已经推进到进行中')).toBeInTheDocument()
		expect(screen.getByText('字段变化 (1)')).toBeInTheDocument()
		expect(screen.getByText('status')).toBeInTheDocument()
	})

	it('在宿主不可用或读取失败时展示兜底错误态', async () => {
		mockedGetEntityActivities.mockRejectedValue(new Error('invoke unavailable'))

		renderActivityDebugPage('/space/work/debug/activity?entityType=task&entityId=task-1')

		await waitFor(() => {
			expect(screen.getByText('查询失败')).toBeInTheDocument()
		})

		expect(
			screen.getByText(
				'无法读取 Rust 宿主 Activity 数据，请确认当前运行在 Tauri 环境且数据库已就绪。',
			),
		).toBeInTheDocument()
	})
})

function renderActivityDebugPage(initialEntry: string) {
	return render(
		<MemoryRouter initialEntries={[initialEntry]}>
			<Routes>
				<Route element={<ActivityDebugPage />} path='/space/:spaceId/debug/activity' />
			</Routes>
		</MemoryRouter>,
	)
}

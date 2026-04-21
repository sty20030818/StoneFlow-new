import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import { useShellLayoutStore } from '@/app/layouts/shell/model/useShellLayoutStore'
import { listTrashEntries } from '@/features/trash/api/listTrashEntries'
import { restoreProjectFromTrash } from '@/features/trash/api/restoreProjectFromTrash'
import { restoreTaskFromTrash } from '@/features/trash/api/restoreTaskFromTrash'
import { TrashPage } from '@/features/trash/ui/TrashPage'

vi.mock('@/features/trash/api/listTrashEntries', () => ({
	listTrashEntries: vi.fn<typeof listTrashEntries>(),
}))

vi.mock('@/features/trash/api/restoreTaskFromTrash', () => ({
	restoreTaskFromTrash: vi.fn<typeof restoreTaskFromTrash>(),
}))

vi.mock('@/features/trash/api/restoreProjectFromTrash', () => ({
	restoreProjectFromTrash: vi.fn<typeof restoreProjectFromTrash>(),
}))

const mockedListTrashEntries = vi.mocked(listTrashEntries)
const mockedRestoreTaskFromTrash = vi.mocked(restoreTaskFromTrash)
const mockedRestoreProjectFromTrash = vi.mocked(restoreProjectFromTrash)

describe('TrashPage', () => {
	afterEach(() => {
		vi.clearAllMocks()
		useShellLayoutStore.setState({
			taskDataVersion: 0,
			projectDataVersion: 0,
		})
	})

	it('渲染真实 Trash 列表', async () => {
		mockedListTrashEntries.mockResolvedValue({
			entries: [
				{
					id: 'trash-task',
					entityType: 'task',
					entityId: 'task-1',
					title: '恢复任务',
					deletedAt: '2026-04-21T08:00:00Z',
					deletedFrom: 'task_drawer',
					restoreHint: '恢复到 Inbox',
					originalProjectId: null,
					originalParentProjectId: null,
				},
				{
					id: 'trash-project',
					entityType: 'project',
					entityId: 'project-1',
					title: '恢复项目',
					deletedAt: '2026-04-21T09:00:00Z',
					deletedFrom: 'project_page',
					restoreHint: '恢复为顶层 Project',
					originalProjectId: null,
					originalParentProjectId: null,
				},
			],
		})

		renderTrashPage()

		expect(await screen.findByText('恢复任务')).toBeInTheDocument()
		expect(screen.getByText('恢复项目')).toBeInTheDocument()
		expect(screen.getByText('恢复到 Inbox')).toBeInTheDocument()
		expect(screen.getByText('恢复为顶层 Project')).toBeInTheDocument()
		expect(screen.queryByRole('button', { name: /清除/ })).not.toBeInTheDocument()
	})

	it('列表为空时展示空状态', async () => {
		mockedListTrashEntries.mockResolvedValue({ entries: [] })

		renderTrashPage()

		expect(await screen.findByText('回收站为空')).toBeInTheDocument()
		expect(screen.getByText('删除后的 Task 和 Project 会在这里等待恢复。')).toBeInTheDocument()
	})

	it('恢复 Task 成功后刷新列表并移除条目', async () => {
		mockedListTrashEntries
			.mockResolvedValueOnce({
				entries: [
					{
						id: 'trash-task',
						entityType: 'task',
						entityId: 'task-1',
						title: '恢复任务',
						deletedAt: '2026-04-21T08:00:00Z',
						deletedFrom: 'task_drawer',
						restoreHint: '恢复到 Inbox',
						originalProjectId: null,
						originalParentProjectId: null,
					},
				],
			})
			.mockResolvedValue({ entries: [] })
		mockedRestoreTaskFromTrash.mockResolvedValue({
			trashEntryId: 'trash-task',
			entityType: 'task',
			entityId: 'task-1',
		})

		renderTrashPage()

		await screen.findByText('恢复任务')
		fireEvent.click(screen.getByRole('button', { name: '恢复' }))

		await waitFor(() => {
			expect(mockedRestoreTaskFromTrash).toHaveBeenCalledWith({
				spaceSlug: 'default',
				trashEntryId: 'trash-task',
			})
		})
		expect(await screen.findByText('回收站为空')).toBeInTheDocument()
		expect(screen.getByRole('status')).toHaveTextContent('已恢复“恢复任务”')
	})

	it('恢复失败时展示错误并保留条目', async () => {
		mockedListTrashEntries.mockResolvedValue({
			entries: [
				{
					id: 'trash-project',
					entityType: 'project',
					entityId: 'project-1',
					title: '恢复失败项目',
					deletedAt: '2026-04-21T09:00:00Z',
					deletedFrom: 'project_page',
					restoreHint: '恢复到原父 Project `missing-parent`',
					originalProjectId: null,
					originalParentProjectId: 'missing-parent',
				},
			],
		})
		mockedRestoreProjectFromTrash.mockRejectedValue(new Error('original parent project missing'))

		renderTrashPage()

		await screen.findByText('恢复失败项目')
		fireEvent.click(screen.getByRole('button', { name: '恢复' }))

		await waitFor(() => {
			expect(screen.getByRole('alert')).toHaveTextContent('original parent project missing')
		})

		expect(screen.getByText('恢复失败项目')).toBeInTheDocument()
	})
})

function renderTrashPage() {
	return render(
		<MemoryRouter initialEntries={['/space/default/trash']}>
			<Routes>
				<Route element={<TrashPage />} path='/space/:spaceId/trash' />
			</Routes>
		</MemoryRouter>,
	)
}

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'

import { createProject } from '@/features/project/api/createProject'
import { ProjectCreateModalContent } from '@/features/project/ui/ProjectCreateModalContent'

vi.mock('@/features/project/api/createProject', () => ({
	createProject: vi.fn<typeof createProject>(),
}))

const mockedCreateProject = vi.mocked(createProject)

describe('ProjectCreateModalContent', () => {
	afterEach(() => {
		vi.clearAllMocks()
		vi.useRealTimers()
	})

	it('创建成功后展示反馈并自动关闭 Modal', async () => {
		vi.useFakeTimers()
		const onClose = vi.fn<() => void>()

		mockedCreateProject.mockResolvedValue({
			id: 'project-1',
			spaceId: 'space-1',
			parentProjectId: null,
			name: '执行层',
			status: 'active',
			note: '承接执行层任务',
			sortOrder: 1,
			createdAt: '2026-04-20T08:00:00Z',
			updatedAt: '2026-04-20T08:00:00Z',
		})

		render(<ProjectCreateModalContent currentSpaceId='default' onClose={onClose} />)

		fireEvent.change(screen.getByLabelText('项目名称'), {
			target: { value: '执行层' },
		})
		fireEvent.change(screen.getByLabelText('项目说明'), {
			target: { value: '承接执行层任务' },
		})
		fireEvent.click(screen.getByRole('button', { name: '创建项目' }))

		await act(async () => {
			await Promise.resolve()
			await Promise.resolve()
		})

		expect(mockedCreateProject).toHaveBeenCalledWith({
			spaceSlug: 'default',
			name: '执行层',
			note: '承接执行层任务',
			parentProjectId: null,
		})
		expect(screen.getByRole('status')).toHaveTextContent('已创建项目“执行层”')

		await act(async () => {
			await vi.advanceTimersByTimeAsync(800)
		})

		expect(onClose).toHaveBeenCalledTimes(1)
	})

	it('创建失败时展示错误反馈', async () => {
		mockedCreateProject.mockRejectedValue(new Error('project name cannot be empty'))

		render(<ProjectCreateModalContent currentSpaceId='default' onClose={vi.fn<() => void>()} />)

		fireEvent.click(screen.getByRole('button', { name: '创建项目' }))

		await waitFor(() => {
			expect(screen.getByRole('alert')).toHaveTextContent('project name cannot be empty')
		})
	})

	it('创建子项目时提交父项目参数', async () => {
		mockedCreateProject.mockResolvedValue({
			id: 'project-child',
			spaceId: 'space-1',
			parentProjectId: 'project-1',
			name: '子项目收口',
			status: 'active',
			note: null,
			sortOrder: 0,
			createdAt: '2026-04-20T08:00:00Z',
			updatedAt: '2026-04-20T08:00:00Z',
		})

		render(
			<ProjectCreateModalContent
				currentSpaceId='default'
				onClose={vi.fn<() => void>()}
				parentProjectId='project-1'
			/>,
		)

		fireEvent.change(screen.getByLabelText('项目名称'), {
			target: { value: '子项目收口' },
		})
		fireEvent.click(screen.getByRole('button', { name: '创建子项目' }))

		await waitFor(() => {
			expect(mockedCreateProject).toHaveBeenCalledWith({
				spaceSlug: 'default',
				name: '子项目收口',
				note: '',
				parentProjectId: 'project-1',
			})
		})
		expect(screen.getByRole('status')).toHaveTextContent('已创建子项目“子项目收口”')
	})
})

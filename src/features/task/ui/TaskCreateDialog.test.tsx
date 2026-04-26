import { render, screen } from '@testing-library/react'

import { TaskCreateDialog } from '@/features/task/ui/TaskCreateDialog'

describe('TaskCreateDialog', () => {
	it('渲染正式的新建任务弹窗', () => {
		render(
			<TaskCreateDialog
				currentSpaceId='work'
				initialProjectId={null}
				initialStatus='todo'
				onClose={vi.fn<() => void>()}
				open
				projects={[
					{
						id: 'project-1',
						parentProjectId: null,
						name: '执行层',
						status: 'active',
						sortOrder: 0,
						children: [],
					},
				]}
				projectsLoading={false}
			/>,
		)

		expect(screen.getByText('新建任务')).toBeInTheDocument()
		expect(screen.getByLabelText('优先级')).toBeInTheDocument()
		expect(screen.getByLabelText('项目')).toBeInTheDocument()
	})
})

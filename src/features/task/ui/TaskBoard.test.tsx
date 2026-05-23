import { render, screen } from '@testing-library/react'

import { TaskBoard } from '@/features/task/ui/TaskBoard'

vi.mock('@/features/task/ui/useTaskContextMenuBulkActions', () => ({
	useTaskContextMenuBulkActions: () => ({}),
}))

describe('TaskBoard', () => {
	it('加载中不显示空态文案', () => {
		render(
			<TaskBoard
				activeTaskId={null}
				emptyDescription='empty description'
				emptyTitle='暂无任务'
				onEmptyAction={() => undefined}
				onOpenTask={() => undefined}
				onToggleTaskSelection={() => undefined}
				onToggleTaskStatus={async () => undefined}
				onUpdateTaskPriority={async () => undefined}
				onUpdateTaskStatus={async () => undefined}
				pendingTaskId={null}
				selectedTaskIdSet={new Set()}
				status='loading'
				tasks={[]}
			/>,
		)

		expect(screen.queryByText('暂无任务')).not.toBeInTheDocument()
		expect(screen.queryByText('empty description')).not.toBeInTheDocument()
	})
})

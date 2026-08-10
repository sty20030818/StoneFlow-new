import { fireEvent, render, screen } from '@testing-library/react'

import { TooltipProvider } from '@/shared/components/base/tooltip'
import type { TaskListItem } from '@/shared/types'

import { TaskPreview } from './TaskPreview'

vi.mock('@/features/task/hooks/useTaskData', () => ({
	useTaskDetailData: () => ({
		item: { note: '这是任务预览中的一段较长备注' },
		status: 'ready',
	}),
}))

describe('TaskPreview', () => {
	it('为面包屑、标题、备注、链接和更新时间提供按溢出触发的完整文本', async () => {
		render(
			<TooltipProvider delayDuration={0}>
				<TaskPreview
					linkSummary={{
						items: [{ id: 'link-1', title: '一份很长的技术方案文档' }],
						remainingCount: 0,
					}}
					onPointerEnter={vi.fn()}
					onPointerLeave={vi.fn()}
					task={createTask()}
				/>
			</TooltipProvider>,
		)

		const titleTrigger = screen
			.getByText('这是一个很长的任务标题')
			.closest('[data-slot="overflow-tooltip-trigger"]') as HTMLElement
		setElementSize(titleTrigger, { clientHeight: 40, scrollHeight: 80 })
		fireEvent.focus(titleTrigger)

		expect(await screen.findByRole('tooltip')).toHaveTextContent('这是一个很长的任务标题')
		expect(
			document.querySelectorAll('[data-slot="overflow-tooltip-trigger"]').length,
		).toBeGreaterThan(5)
	})
})

function createTask(): TaskListItem {
	return {
		id: 'task-1',
		spaceId: 'space-1',
		spaceName: '工作空间',
		spaceSlug: 'work',
		projectId: 'project-1',
		projectName: '一个较长的项目名称',
		title: '这是一个很长的任务标题',
		status: 'todo',
		statusChangedAt: '2026-05-15T00:00:00Z',
		priority: 2,
		dueAt: '2026-05-20T00:00:00Z',
		plannedAt: null,
		remindAt: null,
		completedAt: null,
		canceledAt: null,
		archivedAt: null,
		createdAt: '2026-05-15T00:00:00Z',
		updatedAt: '2026-05-15T00:00:00Z',
	}
}

function setElementSize(
	element: HTMLElement,
	{ clientHeight, scrollHeight }: { clientHeight: number; scrollHeight: number },
) {
	Object.defineProperty(element, 'clientHeight', { configurable: true, value: clientHeight })
	Object.defineProperty(element, 'scrollHeight', { configurable: true, value: scrollHeight })
}

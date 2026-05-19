import { render, screen } from '@testing-library/react'

import type { SearchTaskItem } from '@/shared/types'

import { GlobalSearchResults } from './GlobalSearchResults'

describe('GlobalSearchResults', () => {
	beforeEach(() => {
		HTMLElement.prototype.scrollIntoView = vi.fn()
	})

	it('高亮项变化时仍会把目标滚动进可视区', () => {
		const { rerender } = render(
			<GlobalSearchResults
				errorMessage={null}
				highlightedIndex={0}
				onHighlightIndex={vi.fn()}
				onSelectProject={vi.fn()}
				onSelectTask={vi.fn()}
				projectItems={[]}
				taskItems={[
					{ index: 0, item: createTaskResult({ id: 'task-a', title: '任务 A' }) },
					{ index: 1, item: createTaskResult({ id: 'task-b', title: '任务 B' }) },
				]}
			/>,
		)

		rerender(
			<GlobalSearchResults
				errorMessage={null}
				highlightedIndex={1}
				onHighlightIndex={vi.fn()}
				onSelectProject={vi.fn()}
				onSelectTask={vi.fn()}
				projectItems={[]}
				taskItems={[
					{ index: 0, item: createTaskResult({ id: 'task-a', title: '任务 A' }) },
					{ index: 1, item: createTaskResult({ id: 'task-b', title: '任务 B' }) },
				]}
			/>,
		)

		expect(screen.getByRole('button', { name: '打开任务 任务 B' })).toBeInTheDocument()
		expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalled()
	})
})

function createTaskResult(overrides: Partial<SearchTaskItem> = {}): SearchTaskItem {
	return {
		id: 'task-1',
		spaceId: 'space-1',
		spaceName: '工作',
		spaceSlug: 'work',
		projectId: 'project-1',
		projectName: '项目 A',
		title: '任务 A',
		note: '补充说明',
		priority: 2 as const,
		status: 'todo' as const,
		inboxAt: null,
		updatedAt: '2026-05-09T10:00:00Z',
		completedAt: null,
		...overrides,
	}
}

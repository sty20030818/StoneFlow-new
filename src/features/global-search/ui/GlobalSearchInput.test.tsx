import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'

import { searchEntities } from '@/features/global-search/api/searchEntities'
import { useSearchFocusIntentStore } from '@/features/global-search/model/useSearchFocusIntentStore'
import { GlobalSearchInput } from '@/features/global-search/ui/GlobalSearchInput'
import type { SearchEntitiesResult, SearchProjectItem, SearchTaskItem } from '@/shared/types'

vi.mock('@/features/global-search/api/searchEntities', () => ({
	searchEntities: vi.fn<typeof searchEntities>(),
}))

const mockedSearchEntities = vi.mocked(searchEntities)

describe('GlobalSearchInput', () => {
	beforeEach(() => {
		mockedSearchEntities.mockReset()
		HTMLElement.prototype.scrollIntoView = vi.fn()
		useSearchFocusIntentStore.setState({ focusRequestVersion: 0 })
	})

	it('收到统一聚焦意图时会聚焦搜索框', () => {
		renderSearch()

		act(() => {
			useSearchFocusIntentStore.getState().requestFocus()
		})

		expect(screen.getByLabelText('全局搜索')).toHaveFocus()
	})

	it('按任务和项目分区展示结果，并标出 Inbox / 独立事项上下文', async () => {
		mockedSearchEntities.mockResolvedValue({
			tasks: [
				createTaskResult({
					id: 'task-inbox',
					title: 'Inbox 任务',
					projectId: null,
					projectName: null,
					inboxAt: '2026-05-09T10:00:00Z',
				}),
				createTaskResult({
					id: 'task-no-project',
					title: '独立事项任务',
					projectId: null,
					projectName: null,
					inboxAt: null,
				}),
			],
			projects: [createProjectResult({ id: 'project-active', name: '项目 A' })],
			completedTasks: [
				createTaskResult({
					id: 'task-done',
					title: '已完成任务',
					completedAt: '2026-05-09T10:00:00Z',
				}),
			],
			completedProjects: [
				createProjectResult({
					id: 'project-done',
					name: '已完成项目',
					completedAt: '2026-05-09T10:00:00Z',
				}),
			],
		})

		renderSearch()
		fireEvent.change(screen.getByLabelText('全局搜索'), { target: { value: '任务' } })
		await flushSearch(1)

		expect((await screen.findAllByText('任务')).length).toBeGreaterThan(0)
		expect(screen.getAllByText('项目').length).toBeGreaterThan(0)
		expect(screen.getByText('Inbox')).toBeInTheDocument()
		expect(screen.getByText('独立事项')).toBeInTheDocument()
		expect(screen.getAllByText('工作').length).toBeGreaterThan(0)
	})

	it('刷新查询时保留旧结果并静默刷新', async () => {
		const secondSearch = createDeferred<SearchEntitiesResult>()
		mockedSearchEntities
			.mockResolvedValueOnce({
				tasks: [createTaskResult({ id: 'task-1', title: '旧结果' })],
				projects: [],
				completedTasks: [],
				completedProjects: [],
			})
			.mockImplementationOnce(() => secondSearch.promise)

		renderSearch()
		const input = screen.getByLabelText('全局搜索')

		fireEvent.change(input, { target: { value: '旧' } })
		await flushSearch(1)
		expect(await screen.findByText('旧结果')).toBeInTheDocument()

		fireEvent.change(input, { target: { value: '新' } })
		await flushSearch(2)

		expect(screen.getByText('旧结果')).toBeInTheDocument()
		expect(screen.queryByText('正在刷新搜索结果...')).not.toBeInTheDocument()

		secondSearch.resolve({
			tasks: [createTaskResult({ id: 'task-2', title: '新结果' })],
			projects: [],
			completedTasks: [],
			completedProjects: [],
		})

		await waitFor(() => {
			expect(screen.getByText('新结果')).toBeInTheDocument()
		})
	})

	it('首次查询等待结果时不显示闪烁的加载面板', async () => {
		const pendingSearch = createDeferred<SearchEntitiesResult>()
		mockedSearchEntities.mockImplementationOnce(() => pendingSearch.promise)

		renderSearch()
		fireEvent.change(screen.getByLabelText('全局搜索'), { target: { value: '任务' } })
		await flushSearch(1)

		expect(screen.queryByText('正在搜索任务与项目...')).not.toBeInTheDocument()
		expect(screen.queryByText('没有匹配的任务或项目')).not.toBeInTheDocument()

		pendingSearch.resolve({
			tasks: [],
			projects: [],
			completedTasks: [],
			completedProjects: [],
		})

		await waitFor(() => {
			expect(screen.getByText('没有匹配的任务或项目')).toBeInTheDocument()
		})
	})

	it('支持键盘选择任务与鼠标点击项目', async () => {
		const onOpenTask = vi.fn()
		const onOpenProject = vi.fn()
		mockedSearchEntities.mockResolvedValue({
			tasks: [createTaskResult({ id: 'task-1', title: '任务 A' })],
			projects: [createProjectResult({ id: 'project-1', name: '项目 A' })],
			completedTasks: [],
			completedProjects: [],
		})

		renderSearch({ onOpenProject, onOpenTask })
		const input = screen.getByLabelText('全局搜索')
		fireEvent.change(input, { target: { value: 'A' } })
		await flushSearch(1)

		fireEvent.keyDown(input, { key: 'Enter' })
		expect(onOpenTask).toHaveBeenCalledWith(expect.objectContaining({ id: 'task-1' }))

		fireEvent.change(input, { target: { value: '项' } })
		await flushSearch(2)
		fireEvent.click(screen.getByRole('button', { name: '打开项目 项目 A' }))

		expect(onOpenProject).toHaveBeenCalledWith(expect.objectContaining({ id: 'project-1' }))
	})

	it('方向键切换时会把高亮结果滚动到可视区域', async () => {
		mockedSearchEntities.mockResolvedValue({
			tasks: [
				createTaskResult({ id: 'task-1', title: '任务 A' }),
				createTaskResult({ id: 'task-2', title: '任务 B' }),
			],
			projects: [],
			completedTasks: [],
			completedProjects: [],
		})

		renderSearch()
		const input = screen.getByLabelText('全局搜索')
		fireEvent.change(input, { target: { value: '任务' } })
		await flushSearch(1)

		fireEvent.keyDown(input, { key: 'ArrowDown' })

		expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalled()
	})
})

function renderSearch({
	onOpenTask = vi.fn(),
	onOpenProject = vi.fn(),
}: {
	onOpenTask?: (task: unknown) => void
	onOpenProject?: (project: unknown) => void
} = {}) {
	return render(<GlobalSearchInput onOpenProject={onOpenProject} onOpenTask={onOpenTask} />)
}

async function flushSearch(expectedCallCount: number) {
	await waitFor(() => {
		expect(mockedSearchEntities).toHaveBeenCalledTimes(expectedCallCount)
	})
}

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

function createProjectResult(overrides: Partial<SearchProjectItem> = {}): SearchProjectItem {
	return {
		id: 'project-1',
		spaceId: 'space-1',
		spaceName: '工作',
		spaceSlug: 'work',
		name: '项目 A',
		note: '项目补充',
		updatedAt: '2026-05-09T10:00:00Z',
		completedAt: null,
		...overrides,
	}
}

function createDeferred<T>() {
	let resolve: ((value: T) => void) | undefined
	const promise = new Promise<T>((nextResolve) => {
		resolve = nextResolve
	})

	return {
		promise,
		resolve(value: T) {
			resolve?.(value)
		},
	}
}

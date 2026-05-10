import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'

import {
	create,
	createAndOpen,
	getInitialState,
	listProjectsBySpace,
	openTarget,
	search,
} from '@/features/quick-create/api/quickCreate'
import { QuickCreatePage } from '@/features/quick-create/ui/QuickCreatePage'
import type {
	QuickCreateInitialState,
	QuickCreateProjectItem,
	QuickCreateProjectOption,
	QuickCreateTaskItem,
} from '@/features/quick-create/model/types'
import { formatDateLabel } from '@/features/quick-create/model/QuickCreateProvider'

const hideMock = vi.fn()
const listenMock = vi.fn()

vi.mock('@/features/quick-create/api/quickCreate', () => ({
	create: vi.fn<typeof create>(),
	createAndOpen: vi.fn<typeof createAndOpen>(),
	getInitialState: vi.fn<typeof getInitialState>(),
	listProjectsBySpace: vi.fn<typeof listProjectsBySpace>(),
	openTarget: vi.fn<typeof openTarget>(),
	search: vi.fn<typeof search>(),
}))

vi.mock('@tauri-apps/api/event', () => ({
	listen: (...args: unknown[]) => listenMock(...args),
}))

vi.mock('@tauri-apps/api/window', () => ({
	getCurrentWindow: () => ({
		hide: hideMock,
	}),
}))

const mockedCreate = vi.mocked(create)
const mockedCreateAndOpen = vi.mocked(createAndOpen)
const mockedGetInitialState = vi.mocked(getInitialState)
const mockedListProjectsBySpace = vi.mocked(listProjectsBySpace)
const mockedOpenTarget = vi.mocked(openTarget)
const mockedSearch = vi.mocked(search)

describe('QuickCreatePage', () => {
	beforeEach(() => {
		vi.useFakeTimers()
		hideMock.mockReset()
		listenMock.mockReset()
		listenMock.mockResolvedValue(() => undefined)
		mockedCreate.mockReset()
		mockedCreate.mockResolvedValue(undefined)
		mockedCreateAndOpen.mockReset()
		mockedCreateAndOpen.mockResolvedValue(undefined)
		mockedGetInitialState.mockReset()
		mockedGetInitialState.mockResolvedValue(createInitialState())
		mockedListProjectsBySpace.mockReset()
		mockedListProjectsBySpace.mockResolvedValue(createProjectsBySpace('space-2'))
		mockedOpenTarget.mockReset()
		mockedOpenTarget.mockResolvedValue(undefined)
		mockedSearch.mockReset()
		mockedSearch.mockResolvedValue({
			tasks: [createTaskResult({ id: 'task-search', title: 'Stone 搜索任务' })],
			projects: [createProjectResult({ id: 'project-search', name: 'Stone 搜索项目' })],
		})
	})

	afterEach(async () => {
		await vi.runOnlyPendingTimersAsync()
		vi.useRealTimers()
	})

	it('初始打开显示 recent 区并聚焦输入框', async () => {
		render(<QuickCreatePage />)

		expect(await screen.findByText('最近任务')).toBeInTheDocument()
		expect(screen.getByText('最近项目')).toBeInTheDocument()
		expect(screen.queryByText('创建任务')).not.toBeInTheDocument()

		const input = screen.getByLabelText('Quick Create 输入')
		await waitFor(() => {
			expect(input).toHaveFocus()
		})
	})

	it('有搜索结果时 Enter 仍默认创建，ArrowDown 后 Enter 才打开结果', async () => {
		render(<QuickCreatePage />)
		await screen.findByText('最近任务')

		const input = screen.getByLabelText('Quick Create 输入')
		fireEvent.change(input, { target: { value: 'Stone' } })
		await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS)
		await waitFor(() => {
			expect(mockedSearch).toHaveBeenCalledWith('Stone', 3)
		})

		fireEvent.keyDown(input, { key: 'Enter' })

		await waitFor(() => {
			expect(mockedCreate).toHaveBeenCalledWith(expect.objectContaining({ title: 'Stone' }))
		})
		expect(mockedOpenTarget).not.toHaveBeenCalled()

		mockedCreate.mockClear()
		fireEvent.change(input, { target: { value: 'Again' } })
		await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS)
		await waitFor(() => {
			expect(mockedSearch).toHaveBeenCalledWith('Again', 3)
		})

		fireEvent.keyDown(input, { key: 'ArrowDown' })
		fireEvent.keyDown(input, { key: 'Enter' })

		await waitFor(() => {
			expect(mockedOpenTarget).toHaveBeenCalledWith({ kind: 'task', id: 'task-search' })
		})
		expect(mockedCreate).not.toHaveBeenCalled()
	})

	it('Shift+Enter 会连续创建并保留已选参数', async () => {
		render(<QuickCreatePage />)
		await screen.findByText('最近任务')

		fireEvent.click(screen.getByLabelText('优先级'))
		fireEvent.click(screen.getByText('紧急'))
		fireEvent.click(screen.getByLabelText('更多参数'))
		fireEvent.click(screen.getByRole('button', { name: /待执行/ }))
		fireEvent.click(screen.getByText('已完成'))
		fireEvent.click(screen.getByRole('button', { name: /截止时间/ }))
		fireEvent.click(screen.getByText('明天'))

		const input = screen.getByLabelText('Quick Create 输入')
		fireEvent.change(input, { target: { value: '连续创建任务' } })
		fireEvent.keyDown(input, { key: 'Enter', shiftKey: true })

		await waitFor(() => {
			expect(mockedCreate).toHaveBeenCalledWith(
				expect.objectContaining({
					title: '连续创建任务',
					priority: 4,
					status: 'done',
				}),
			)
		})

		await waitFor(() => {
			expect(screen.getByText('已连续创建 1 条')).toBeInTheDocument()
		})
		expect(input).toHaveValue('')
		expect(screen.getByLabelText('优先级')).toHaveTextContent('P0')
		expect(screen.getByRole('button', { name: /已完成/ })).toBeInTheDocument()
		expect(screen.getByRole('button', { name: /截止/ })).not.toHaveTextContent('截止时间')
	})

	it('Esc 按优先级先关弹层、再清空输入、最后关闭窗口', async () => {
		render(<QuickCreatePage />)
		await screen.findByText('最近任务')

		const input = screen.getByLabelText('Quick Create 输入')
		fireEvent.change(input, { target: { value: 'Stone' } })
		fireEvent.click(screen.getByLabelText('优先级'))
		expect(screen.getByText('无优先级')).toBeInTheDocument()

		fireEvent.keyDown(document, { key: 'Escape' })
		await waitFor(() => {
			expect(screen.queryByText('无优先级')).not.toBeInTheDocument()
		})
		expect(input).toHaveValue('Stone')

		fireEvent.keyDown(document, { key: 'Escape' })
		expect(input).toHaveValue('')

		fireEvent.keyDown(document, { key: 'Escape' })
		await waitFor(() => {
			expect(hideMock).toHaveBeenCalled()
		})
	})

	it('切换 Space 后会把项目重置为收件箱', async () => {
		render(<QuickCreatePage />)
		await screen.findByText('最近任务')

		fireEvent.click(screen.getByLabelText('项目选择'))
		fireEvent.click(screen.getByText('StoneFlow 开发'))
		expect(screen.getByLabelText('项目选择')).toHaveTextContent('StoneFlow 开发')

		fireEvent.click(screen.getByLabelText('更多参数'))
		fireEvent.click(screen.getByRole('button', { name: /产品研发/ }))
		fireEvent.click(screen.getByText('工程基础'))

		await waitFor(() => {
			expect(mockedListProjectsBySpace).toHaveBeenCalledWith('space-2')
		})
		await waitFor(() => {
			expect(screen.getByLabelText('项目选择')).toHaveTextContent('收件箱')
		})
	})

	it('搜索结果只显示有内容的分组标题', async () => {
		mockedSearch.mockResolvedValueOnce({
			tasks: [createTaskResult({ id: 'task-only', title: '只有任务结果' })],
			projects: [],
		})

		render(<QuickCreatePage />)
		await screen.findByText('最近任务')

		const input = screen.getByLabelText('Quick Create 输入')
		fireEvent.change(input, { target: { value: 'Only Task' } })
		await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS)

		await waitFor(() => {
			expect(screen.getByText('任务')).toBeInTheDocument()
		})
		expect(screen.queryByText('项目')).not.toBeInTheDocument()
	})
})

describe('formatDateLabel', () => {
	it('按本地日期解析 yyyy-MM-dd，避免 UTC 偏移', () => {
		expect(formatDateLabel('2026-05-01')).toBe('5/1')
	})
})

const SEARCH_DEBOUNCE_MS = 120

function createInitialState(): QuickCreateInitialState {
	return {
		currentScope: {
			type: 'space',
			spaceId: 'space-1',
		},
		defaultSpaceId: 'space-1',
		defaultPlacement: {
			kind: 'inbox',
			projectId: null,
		},
		spaces: [
			{ id: 'space-1', name: '产品研发', isDefault: true },
			{ id: 'space-2', name: '工程基础', isDefault: false },
		],
		projects: [
			createProjectOption({ kind: 'inbox', id: null, name: 'Inbox' }),
			createProjectOption({ kind: 'noProject', id: null, name: '独立事项' }),
			createProjectOption({ kind: 'project', id: 'project-1', name: 'StoneFlow 开发' }),
		],
		recentTasks: [createTaskResult({ id: 'task-recent', title: '最近任务 A' })],
		recentProjects: [createProjectResult({ id: 'project-recent', name: '最近项目 A' })],
	}
}

function createProjectsBySpace(spaceId: string) {
	return {
		spaceId,
		inboxProject: createProjectOption({ kind: 'inbox', id: null, name: 'Inbox', spaceId }),
		noProjectOption: createProjectOption({
			kind: 'noProject',
			id: null,
			name: '独立事项',
			spaceId,
		}),
		projects: [createProjectOption({ kind: 'project', id: 'project-2', name: '工程基座', spaceId })],
	}
}

function createProjectOption(
	overrides: Partial<QuickCreateProjectOption> & Pick<QuickCreateProjectOption, 'kind' | 'id' | 'name'>,
): QuickCreateProjectOption {
	if (overrides.kind === 'project') {
		return {
			kind: 'project',
			id: overrides.id ?? 'project-1',
			spaceId: overrides.spaceId ?? 'space-1',
			name: overrides.name,
		}
	}

	return {
		kind: overrides.kind,
		id: null,
		spaceId: overrides.spaceId ?? 'space-1',
		name: overrides.name,
	}
}

function createTaskResult(overrides: Partial<QuickCreateTaskItem> = {}): QuickCreateTaskItem {
	return {
		id: 'task-1',
		spaceId: 'space-1',
		spaceName: '产品研发',
		projectId: null,
		projectName: null,
		inboxAt: '2026-05-10T10:00:00Z',
		title: '任务 A',
		note: null,
		priority: 2,
		status: 'todo',
		updatedAt: '2026-05-10T10:00:00Z',
		completedAt: null,
		...overrides,
	}
}

function createProjectResult(overrides: Partial<QuickCreateProjectItem> = {}): QuickCreateProjectItem {
	return {
		id: 'project-1',
		spaceId: 'space-1',
		spaceName: '产品研发',
		name: '项目 A',
		note: null,
		updatedAt: '2026-05-10T10:00:00Z',
		completedAt: null,
		...overrides,
	}
}

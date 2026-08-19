import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { renderWithInteractionProviders as render } from '@/test/TestInteractionProviders'
import { TaskLinksSection } from './TaskLinksSection'

const mockTaskLinksController = vi.hoisted(() => ({
	value: {
		links: [] as Array<{
			id: string
			taskId: string
			title: string
			url: string
			position: number
			createdAt: string
			updatedAt: string
		}>,
		status: 'ready' as 'idle' | 'loading' | 'ready' | 'error',
		error: null as string | null,
		reloadLinks: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
		addLink: vi
			.fn<(input: { title: string; url: string }) => Promise<void>>()
			.mockResolvedValue(undefined),
		editLink: vi
			.fn<(linkId: string, input: { title: string; url: string }) => Promise<void>>()
			.mockResolvedValue(undefined),
		removeLink: vi.fn<(linkId: string) => Promise<void>>().mockResolvedValue(undefined),
		openLink: vi
			.fn<(link: { id: string; title: string; url: string }) => Promise<void>>()
			.mockResolvedValue(undefined),
	},
}))

vi.mock('@/features/task/detail/model/useTaskLinksController', () => ({
	useTaskLinksController: () => mockTaskLinksController.value,
}))

describe('TaskLinksSection', () => {
	it('空状态下仅展示标题和添加入口', () => {
		mockTaskLinksController.value = createTaskLinksControllerState()

		render(<TaskLinksSection taskId='task-1' />)

		expect(screen.getByRole('heading', { name: '链接' })).toBeInTheDocument()
		expect(
			screen.queryByText('还没有链接，添加一个外部 URL 方便回看当前任务的上下文。'),
		).not.toBeInTheDocument()
		expect(screen.getByRole('button', { name: '添加链接' })).toBeEnabled()
	})

	it('列表态支持打开链接', async () => {
		mockTaskLinksController.value = createTaskLinksControllerState({
			links: [createTaskLink()],
		})

		render(<TaskLinksSection taskId='task-1' />)

		fireEvent.click(screen.getByRole('button', { name: '打开链接：技术方案' }))

		await waitFor(() => {
			expect(mockTaskLinksController.value.openLink).toHaveBeenCalledWith(
				expect.objectContaining({ id: 'link-1' }),
			)
		})
	})

	it('可通过弹窗新增链接', async () => {
		mockTaskLinksController.value = createTaskLinksControllerState()

		render(<TaskLinksSection taskId='task-1' />)

		const addButton = screen.getByRole('button', { name: '添加链接' })
		act(() => addButton.focus())
		fireEvent.click(addButton)
		fireEvent.change(await screen.findByPlaceholderText('例如：技术方案文档'), {
			target: { value: '技术方案文档' },
		})
		fireEvent.change(screen.getByPlaceholderText('https://example.com/spec'), {
			target: { value: 'https://example.com/spec' },
		})
		fireEvent.click(screen.getByRole('button', { name: '创建链接' }))

		await waitFor(() => {
			expect(mockTaskLinksController.value.addLink).toHaveBeenCalledWith({
				title: '技术方案文档',
				url: 'https://example.com/spec',
			})
		})
		await waitFor(() => expect(addButton).toHaveFocus())
	})

	it('可编辑和删除链接，并在 Popover 关闭后恢复触发项焦点', async () => {
		mockTaskLinksController.value = createTaskLinksControllerState({
			links: [createTaskLink()],
		})

		render(<TaskLinksSection taskId='task-1' />)

		const editButton = screen.getByRole('button', { name: '编辑链接：技术方案' })
		act(() => editButton.focus())
		fireEvent.click(editButton)
		fireEvent.change(await screen.findByDisplayValue('技术方案'), {
			target: { value: '最终方案' },
		})
		fireEvent.change(screen.getByDisplayValue('https://example.com/spec'), {
			target: { value: 'https://example.com/spec-final' },
		})
		fireEvent.click(screen.getByRole('button', { name: '保存链接' }))

		await waitFor(() => {
			expect(mockTaskLinksController.value.editLink).toHaveBeenCalledWith('link-1', {
				title: '最终方案',
				url: 'https://example.com/spec-final',
			})
		})
		await waitFor(() => expect(editButton).toHaveFocus())

		fireEvent.click(screen.getByRole('button', { name: '删除链接：技术方案' }))

		await waitFor(() => {
			expect(mockTaskLinksController.value.removeLink).toHaveBeenCalledWith('link-1')
		})
	})
})

function createTaskLinksControllerState(
	overrides: Partial<ReturnType<typeof baseTaskLinksControllerState>> = {},
) {
	return {
		...baseTaskLinksControllerState(),
		...overrides,
	}
}

function baseTaskLinksControllerState() {
	return {
		links: [] as Array<{
			id: string
			taskId: string
			title: string
			url: string
			position: number
			createdAt: string
			updatedAt: string
		}>,
		status: 'ready' as const,
		error: null,
		reloadLinks: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
		addLink: vi
			.fn<(input: { title: string; url: string }) => Promise<void>>()
			.mockResolvedValue(undefined),
		editLink: vi
			.fn<(linkId: string, input: { title: string; url: string }) => Promise<void>>()
			.mockResolvedValue(undefined),
		removeLink: vi.fn<(linkId: string) => Promise<void>>().mockResolvedValue(undefined),
		openLink: vi
			.fn<(link: { id: string; title: string; url: string }) => Promise<void>>()
			.mockResolvedValue(undefined),
	}
}

function createTaskLink() {
	return {
		id: 'link-1',
		taskId: 'task-1',
		title: '技术方案',
		url: 'https://example.com/spec',
		position: 1000,
		createdAt: '2026-05-23T10:00:00Z',
		updatedAt: '2026-05-23T10:00:00Z',
	}
}

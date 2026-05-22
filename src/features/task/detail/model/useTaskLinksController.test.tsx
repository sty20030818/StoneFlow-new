import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
	createTaskLink,
	deleteTaskLink,
	listTaskLinks,
	updateTaskLink,
} from '@/features/task/api/taskLinks'
import { useTaskStore } from '@/features/task/model/useTaskStore'

import { useTaskLinksController } from './useTaskLinksController'

const openUrlMock = vi.fn<(url: string) => Promise<void>>()
const toastErrorMock = vi.fn<(message: string) => void>()
const windowOpenMock = vi.fn()

vi.mock('@/features/task/api/taskLinks', () => ({
	listTaskLinks: vi.fn<(input: { taskId: string }) => Promise<unknown[]>>(),
	createTaskLink: vi.fn<(input: Record<string, unknown>) => Promise<unknown>>(),
	updateTaskLink: vi.fn<(input: Record<string, unknown>) => Promise<unknown>>(),
	deleteTaskLink: vi.fn<(input: Record<string, unknown>) => Promise<unknown>>(),
}))

vi.mock('@tauri-apps/plugin-opener', () => ({
	openUrl: (url: string) => openUrlMock(url),
}))

vi.mock('sonner', () => ({
	toast: {
		error: (message: string) => toastErrorMock(message),
	},
}))

describe('useTaskLinksController', () => {
	const mockedListTaskLinks = vi.mocked(listTaskLinks)
	const mockedCreateTaskLink = vi.mocked(createTaskLink)
	const mockedUpdateTaskLink = vi.mocked(updateTaskLink)
	const mockedDeleteTaskLink = vi.mocked(deleteTaskLink)

	beforeEach(() => {
		mockedListTaskLinks.mockReset()
		mockedCreateTaskLink.mockReset()
		mockedUpdateTaskLink.mockReset()
		mockedDeleteTaskLink.mockReset()
		openUrlMock.mockReset()
		toastErrorMock.mockReset()
		windowOpenMock.mockReset()
		vi.stubGlobal('open', windowOpenMock)

		useTaskStore.setState((state) => ({
			...state,
			updateTask: vi.fn(state.updateTask),
		}))
	})

	it('挂载后读取当前 task 的 links', async () => {
		mockedListTaskLinks.mockResolvedValue([
			createTaskLinkItem({
				id: 'link-1',
				title: '技术方案',
			}),
		])

		const { result } = renderHook(() => useTaskLinksController('task-1'))

		await waitFor(() => {
			expect(result.current.status).toBe('ready')
		})

		expect(mockedListTaskLinks).toHaveBeenCalledWith({ taskId: 'task-1' })
		expect(result.current.links).toHaveLength(1)
		expect(result.current.links[0]?.title).toBe('技术方案')
	})

	it('新增、编辑、删除后都会刷新 links，且不会触发 task autosave', async () => {
		mockedListTaskLinks
			.mockResolvedValueOnce([])
			.mockResolvedValueOnce([createTaskLinkItem({ id: 'link-1', title: '技术方案' })])
			.mockResolvedValueOnce([createTaskLinkItem({ id: 'link-1', title: '最终方案' })])
			.mockResolvedValueOnce([])
		mockedCreateTaskLink.mockResolvedValue(createTaskLinkItem({ id: 'link-1' }))
		mockedUpdateTaskLink.mockResolvedValue(createTaskLinkItem({ id: 'link-1', title: '最终方案' }))
		mockedDeleteTaskLink.mockResolvedValue(createTaskLinkItem({ id: 'link-1', title: '最终方案' }))

		const { result } = renderHook(() => useTaskLinksController('task-1'))

		await waitFor(() => {
			expect(result.current.status).toBe('ready')
		})

		await act(async () => {
			await result.current.addLink({
				title: '技术方案',
				url: 'https://example.com/spec',
			})
		})
		expect(mockedCreateTaskLink).toHaveBeenCalledWith({
			taskId: 'task-1',
			title: '技术方案',
			url: 'https://example.com/spec',
		})
		expect(result.current.links[0]?.title).toBe('技术方案')

		await act(async () => {
			await result.current.editLink('link-1', {
				title: '最终方案',
				url: 'https://example.com/spec-final',
			})
		})
		expect(mockedUpdateTaskLink).toHaveBeenCalledWith({
			linkId: 'link-1',
			title: '最终方案',
			url: 'https://example.com/spec-final',
		})
		expect(result.current.links[0]?.title).toBe('最终方案')

		await act(async () => {
			await result.current.removeLink('link-1')
		})
		expect(mockedDeleteTaskLink).toHaveBeenCalledWith({
			linkId: 'link-1',
		})
		expect(result.current.links).toEqual([])
		expect(useTaskStore.getState().updateTask).not.toHaveBeenCalled()
	})

	it('新增、编辑和打开链接时会补全缺失的 https 协议头', async () => {
		mockedListTaskLinks.mockResolvedValue([])
		mockedCreateTaskLink.mockResolvedValue(
			createTaskLinkItem({ url: 'https://docs.example.com/spec' }),
		)
		mockedUpdateTaskLink.mockResolvedValue(
			createTaskLinkItem({ id: 'link-1', url: 'https://docs.example.com/final' }),
		)
		openUrlMock.mockResolvedValue(undefined)

		const { result } = renderHook(() => useTaskLinksController('task-1'))

		await waitFor(() => {
			expect(result.current.status).toBe('ready')
		})

		await act(async () => {
			await result.current.addLink({
				title: '技术方案',
				url: 'docs.example.com/spec',
			})
		})

		expect(mockedCreateTaskLink).toHaveBeenCalledWith({
			taskId: 'task-1',
			title: '技术方案',
			url: 'https://docs.example.com/spec',
		})

		await act(async () => {
			await result.current.editLink('link-1', {
				title: '最终方案',
				url: 'docs.example.com/final',
			})
		})

		expect(mockedUpdateTaskLink).toHaveBeenCalledWith({
			linkId: 'link-1',
			title: '最终方案',
			url: 'https://docs.example.com/final',
		})

		await act(async () => {
			await result.current.openLink(createTaskLinkItem({ url: 'docs.example.com/spec' }))
		})

		expect(openUrlMock).toHaveBeenCalledWith('https://docs.example.com/spec')
	})

	it('打开链接失败时提示错误', async () => {
		mockedListTaskLinks.mockResolvedValue([])
		openUrlMock.mockRejectedValue(new Error('浏览器打开失败'))

		const { result } = renderHook(() => useTaskLinksController('task-1'))

		await waitFor(() => {
			expect(result.current.status).toBe('ready')
		})

		await act(async () => {
			await result.current.openLink(createTaskLinkItem())
		})

		expect(openUrlMock).toHaveBeenCalledWith('https://example.com/spec')
		expect(windowOpenMock).toHaveBeenCalledWith(
			'https://example.com/spec',
			'_blank',
			'noopener,noreferrer',
		)
		expect(toastErrorMock).toHaveBeenCalledWith('浏览器打开失败')
	})
})

function createTaskLinkItem(overrides: Partial<ReturnType<typeof baseTaskLink>> = {}) {
	return {
		...baseTaskLink(),
		...overrides,
	}
}

function baseTaskLink() {
	return {
		id: 'link-1',
		taskId: 'task-1',
		title: '技术方案',
		url: 'https://example.com/spec',
		sortOrder: 1000,
		createdAt: '2026-05-23T10:00:00Z',
		updatedAt: '2026-05-23T10:00:00Z',
	}
}

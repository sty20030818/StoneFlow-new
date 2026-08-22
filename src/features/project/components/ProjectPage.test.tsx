import { fireEvent, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { EMPTY_FILTER_QUERY } from '@/features/filter'
import { renderWithInteractionProviders } from '@/test/TestInteractionProviders'

import { ProjectPage } from './ProjectPage'

const archive = vi.fn()
const remove = vi.fn()
const completeOrReopen = vi.fn()

vi.mock('../hooks/useProjectDetailScene', () => ({
	useProjectDetailScene: () => ({
		project: { id: 'project-1', name: '项目 A', completedAt: null },
		busyAction: null,
		breadcrumbItems: [],
		taskCollection: { boardProps: { tasks: [], status: 'ready' } },
		displayPageKey: 'task:project-detail',
		toolbarPills: [{ key: 'incomplete', label: '未完成' }],
		selectedToolbarKey: 'incomplete',
		selectToolbar: vi.fn(),
		filterUiValue: {
			session: {
				base: EMPTY_FILTER_QUERY,
				temp: EMPTY_FILTER_QUERY,
				effective: EMPTY_FILTER_QUERY,
				dirty: false,
				isEmpty: true,
				setTemp: vi.fn(),
				clearTemp: vi.fn(),
				replaceEffective: vi.fn(),
			},
		},
		goToProjectsOverview: vi.fn(),
		completeOrReopen,
		archive,
		remove,
	}),
}))

vi.mock('@/features/task', () => ({
	TaskBoard: () => <div data-testid='task-board'>状态分组任务 Board</div>,
}))

vi.mock('@/features/display-options', () => ({
	DisplayOptionsButton: () => <button type='button'>显示设置</button>,
}))

vi.mock('@/shared/components/AppBreadcrumb', () => ({
	AppBreadcrumb: () => <span>面包屑</span>,
}))

describe('ProjectPage', () => {
	beforeEach(() => {
		archive.mockClear()
		remove.mockClear()
		completeOrReopen.mockClear()
	})

	it('组合项目 Header、Task Board 与收敛后的项目操作', async () => {
		renderWithInteractionProviders(<ProjectPage />)

		expect(screen.getByText('状态分组任务 Board')).toBeInTheDocument()
		expect(screen.getByText('显示设置')).toBeInTheDocument()
		fireEvent.click(screen.getByRole('button', { name: '完成项目' }))
		const projectActions = screen.getByRole('button', { name: '项目操作' })
		fireEvent.click(projectActions)
		fireEvent.click(await screen.findByRole('menuitem', { name: '归档项目' }))
		fireEvent.click(projectActions)
		fireEvent.click(await screen.findByRole('menuitem', { name: '删除项目' }))
		expect(completeOrReopen).toHaveBeenCalled()
		expect(archive).toHaveBeenCalled()
		expect(remove).toHaveBeenCalled()
	})
})

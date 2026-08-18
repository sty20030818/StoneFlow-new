import type { ReactNode } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { EMPTY_FILTER_QUERY } from '@/features/filter'

import { ProjectPage } from './ProjectPage'

const archive = vi.fn()
const remove = vi.fn()
const completeOrReopen = vi.fn()

vi.mock('@/shared/components/main-card/MainCardLayout', () => ({
	MainCard: {
		Root: ({ children }: { children: ReactNode }) => <div>{children}</div>,
		Header: ({ breadcrumb, action }: { breadcrumb: ReactNode; action?: ReactNode }) => (
			<div>
				{breadcrumb}
				{action}
			</div>
		),
		Toolbar: ({
			pills,
			displayAction,
		}: {
			pills?: Array<{ label: string }>
			displayAction?: ReactNode
		}) => (
			<div>
				{pills?.map((pill) => (
					<span key={pill.label}>{pill.label}</span>
				))}
				{displayAction}
			</div>
		),
		Body: ({ children }: { children: ReactNode }) => <div>{children}</div>,
		GhostAction: ({ children }: { children: ReactNode }) => (
			<button type='button'>{children}</button>
		),
	},
}))

vi.mock('../hooks/useProjectDetailScene', () => ({
	useProjectDetailScene: () => ({
		project: { id: 'project-1', name: '项目 A', completedAt: null },
		busyAction: null,
		breadcrumbItems: [],
		taskCollection: { boardProps: { tasks: [], status: 'ready' } },
		displayPageKey: 'task:project-detail',
		toolbarPills: [{ label: '所有任务' }],
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

	it('组合项目 Header、Task Board 与展示设置', () => {
		render(<ProjectPage />)

		expect(screen.getByText('状态分组任务 Board')).toBeInTheDocument()
		expect(screen.getByText('显示设置')).toBeInTheDocument()
		fireEvent.click(screen.getByRole('button', { name: '完成' }))
		fireEvent.click(screen.getByRole('button', { name: '归档' }))
		fireEvent.click(screen.getByRole('button', { name: '删除' }))
		expect(completeOrReopen).toHaveBeenCalled()
		expect(archive).toHaveBeenCalled()
		expect(remove).toHaveBeenCalled()
	})
})

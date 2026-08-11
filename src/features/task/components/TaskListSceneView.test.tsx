import type { ReactNode } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { EMPTY_FILTER_QUERY } from '@/features/filter'

import { TaskListSceneView } from './TaskListSceneView'

const openCreate = vi.fn()

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
		Footer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
		GhostAction: ({
			children,
			tooltipShortcut: _tooltipShortcut,
			...props
		}: {
			children: ReactNode
			onClick?: () => void
			tooltipShortcut?: ReactNode
		}) => (
			<button aria-label='创建任务' type='button' {...props}>
				{children}
			</button>
		),
	},
}))

vi.mock('@/features/task/hooks/useTaskListScene', () => ({
	useTaskListScene: (variant: 'all' | 'standalone') => ({
		displayPageKey: variant === 'all' ? 'task:all' : 'task:standalone',
		breadcrumbItems: [],
		taskCollection: { boardProps: { tasks: [], status: 'ready' } },
		toolbarPills: [{ label: '所有任务' }],
		bulk: { selectedCount: 0, clearTaskSelection: vi.fn() },
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
		openCreate,
		showStandaloneHint: variant === 'standalone',
	}),
}))

vi.mock('./TaskBoard', () => ({
	TaskBoard: () => <div data-testid='task-board'>状态分组任务 Board</div>,
}))

vi.mock('@/features/display-options', () => ({
	DisplayOptionsButton: () => <button type='button'>显示设置</button>,
}))

vi.mock('@/features/bulk-action', async (importOriginal) => ({
	...(await importOriginal<typeof import('@/features/bulk-action')>()),
	BulkActionBar: () => <div data-testid='bulk-bar'>批量操作</div>,
	BulkCommandMenuAction: () => null,
}))

vi.mock('@/shared/components/AppBreadcrumb', () => ({
	AppBreadcrumb: () => <span>面包屑</span>,
}))

describe('TaskListSceneView', () => {
	beforeEach(() => {
		openCreate.mockClear()
	})

	it('所有任务页组合完整 Task Collection 框架', () => {
		render(<TaskListSceneView variant='all' />)

		expect(screen.getByText('状态分组任务 Board')).toBeInTheDocument()
		expect(screen.getByText('显示设置')).toBeInTheDocument()
		expect(screen.getByTestId('bulk-bar')).toBeInTheDocument()
	})

	it('独立事项保留完整 Board 与专属归属提示', () => {
		render(<TaskListSceneView variant='standalone' />)

		expect(screen.getByText('状态分组任务 Board')).toBeInTheDocument()
		expect(
			screen.getByText('这些是当前 Space 下尚未归属到任何 Project 的独立事项。'),
		).toBeInTheDocument()
		fireEvent.click(screen.getByRole('button', { name: '创建任务' }))
		expect(openCreate).toHaveBeenCalled()
	})
})

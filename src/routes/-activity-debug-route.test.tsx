import { act, fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { expect, it, vi } from 'vitest'

import { getEntityActivities } from '@/features/activity'

import { ActivityDebugRoute } from './-activity-debug-route'

const route = vi.hoisted(() => ({
	search: { entityType: 'task', entityId: '', limit: 50 },
	navigate: vi.fn(),
}))

vi.mock('@tanstack/react-router', () => ({
	getRouteApi: () => ({ useSearch: () => route.search, useNavigate: () => route.navigate }),
	Link: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}))

vi.mock('@/features/activity', async (importOriginal) => ({
	...(await importOriginal<typeof import('@/features/activity')>()),
	getEntityActivities: vi.fn(),
}))

it('查询身份切换同步重置表单和加载状态，旧请求失败不污染新结果', async () => {
	let rejectFirst!: (error: Error) => void
	let resolveSecond!: (entries: Awaited<ReturnType<typeof getEntityActivities>>) => void
	vi.mocked(getEntityActivities)
		.mockImplementationOnce(
			() =>
				new Promise((_, reject) => {
					rejectFirst = reject
				}),
		)
		.mockImplementationOnce(
			() =>
				new Promise((resolve) => {
					resolveSecond = resolve
				}),
		)
	const { rerender } = render(<ActivityDebugRoute />)
	expect(screen.getByText('等待查询')).toBeVisible()
	fireEvent.click(screen.getByRole('button', { name: '查询 Activity' }))
	expect(screen.getByRole('alert')).toHaveTextContent('请先输入 entity id')
	expect(getEntityActivities).not.toHaveBeenCalled()

	route.search = { entityType: 'task', entityId: 'task-a', limit: 50 }
	rerender(<ActivityDebugRoute />)
	expect(screen.getByLabelText('Entity ID')).toHaveValue('task-a')
	expect(screen.getByRole('status')).toHaveTextContent('读取中')

	fireEvent.change(screen.getByLabelText('Entity ID'), { target: { value: '未提交草稿' } })
	route.search = { entityType: 'project', entityId: 'project-b', limit: 20 }
	rerender(<ActivityDebugRoute />)
	expect(screen.getByLabelText('Entity ID')).toHaveValue('project-b')
	expect(screen.getByLabelText('Limit')).toHaveValue('20')
	await act(async () => resolveSecond([]))
	expect(screen.getByText('暂无记录')).toBeVisible()
	await act(async () => rejectFirst(new Error('旧请求失败')))
	expect(screen.getByText('暂无记录')).toBeVisible()
	expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { FormEvent } from 'react'
import { vi } from 'vitest'

import type { ActivityEntityType } from '../api/getEntityActivities'
import { ActivityDebugPage } from './ActivityDebugPage'
import type { ActivityDebugLoadState } from './ActivityDebugPage'

describe('ActivityDebugPage', () => {
	it('在空查询参数下渲染等待态', async () => {
		await renderActivityDebugPage({
			loadState: { kind: 'idle' },
		})

		expect(screen.getByText('等待查询')).toBeInTheDocument()
		expect(
			screen.getByText('输入 entity type 和 entity id 后即可读取该实体的 Activity timeline。'),
		).toBeInTheDocument()
	})

	it('使用可访问表单控件并转发输入与提交', () => {
		const onEntityIdChange = vi.fn()
		const onLimitChange = vi.fn()
		const onSubmit = vi.fn((event: FormEvent<HTMLFormElement>) => event.preventDefault())

		renderWithComponent(
			<ActivityDebugPage
				entityId='task-1'
				entityType='task'
				limit='50'
				loadState={{ kind: 'idle' }}
				onEntityIdChange={onEntityIdChange}
				onEntityTypeChange={() => {}}
				onLimitChange={onLimitChange}
				onSubmit={onSubmit}
			/>,
		)

		expect(screen.getByLabelText('Entity Type')).toHaveTextContent('Task')
		fireEvent.change(screen.getByLabelText('Entity ID'), { target: { value: 'task-2' } })
		fireEvent.change(screen.getByLabelText('Limit'), { target: { value: '20' } })
		fireEvent.click(screen.getByRole('button', { name: '查询 Activity' }))

		expect(onEntityIdChange).toHaveBeenCalledWith('task-2')
		expect(onLimitChange).toHaveBeenCalledWith('20')
		expect(onSubmit).toHaveBeenCalledOnce()
	})

	it('读取期间提供可访问的加载反馈', () => {
		renderActivityDebugPageView({
			entityType: 'task',
			entityId: 'task-1',
			limit: '50',
			loadState: { kind: 'loading' },
		})

		expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true')
		expect(screen.getByText('正在向 Rust 宿主请求 Activity timeline。')).toBeInTheDocument()
	})

	it('查询成功但无记录时渲染空态', () => {
		renderActivityDebugPageView({
			entityType: 'task',
			entityId: 'task-1',
			limit: '50',
			loadState: { kind: 'ready', entries: [] },
		})

		expect(screen.getByRole('heading', { name: '暂无记录' })).toBeInTheDocument()
	})

	it('查询成功后展示事件列表与字段变化', async () => {
		await renderActivityDebugPage({
			entityType: 'task',
			entityId: 'task-1',
			limit: '20',
			loadState: {
				kind: 'ready',
				entries: [
					{
						id: 'event-1',
						entityType: 'task',
						entityId: 'task-1',
						action: 'task.status.changed',
						actorType: 'user',
						source: 'app',
						summary: '状态已经推进到进行中',
						metadata: { panel: 'drawer' },
						createdAt: '2026-04-29T01:00:00Z',
						changes: [
							{
								id: 'change-1',
								field: 'status',
								oldValue: 'todo',
								newValue: 'doing',
								createdAt: '2026-04-29T01:00:00Z',
							},
						],
					},
				],
			},
		})

		await waitFor(() => {
			expect(screen.getByText('task.status.changed')).toBeInTheDocument()
		})

		expect(screen.getByText('状态已经推进到进行中')).toBeInTheDocument()
		expect(screen.getByText('字段变化 (1)')).toBeInTheDocument()
		expect(screen.getByText('status')).toBeInTheDocument()
	})

	it('在读取失败时展示兜底错误态', async () => {
		await renderActivityDebugPage({
			entityType: 'task',
			entityId: 'task-1',
			loadState: {
				kind: 'error',
				message: '无法读取 Rust 宿主 Activity 数据，请确认当前运行在 Tauri 环境且数据库已就绪。',
			},
		})

		await waitFor(() => {
			expect(screen.getByRole('alert')).toBeInTheDocument()
		})

		expect(
			screen.getByText(
				'无法读取 Rust 宿主 Activity 数据，请确认当前运行在 Tauri 环境且数据库已就绪。',
			),
		).toBeInTheDocument()
	})
})

type RenderActivityDebugPageOptions = {
	entityType?: ActivityEntityType
	entityId?: string
	limit?: string
	loadState: ActivityDebugLoadState
}

function renderActivityDebugPage({
	entityType = 'task',
	entityId = '',
	limit = '50',
	loadState,
}: RenderActivityDebugPageOptions) {
	return Promise.resolve(
		renderActivityDebugPageView({
			entityType,
			entityId,
			limit,
			loadState,
		}),
	)
}

function renderActivityDebugPageView({
	entityType,
	entityId,
	limit,
	loadState,
}: {
	entityType: ActivityEntityType
	entityId: string
	limit: string
	loadState: ActivityDebugLoadState
}) {
	const noop = () => {}
	const preventDefault = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault()
	}

	return renderWithComponent(
		<ActivityDebugPage
			entityId={entityId}
			entityType={entityType}
			limit={limit}
			loadState={loadState}
			onEntityIdChange={noop}
			onEntityTypeChange={noop}
			onLimitChange={noop}
			onSubmit={preventDefault}
		/>,
	)
}

function renderWithComponent(component: React.ReactNode) {
	return render(component)
}

import { fireEvent, render, screen } from '@testing-library/react'
import type { FormEvent } from 'react'
import { vi } from 'vitest'

import type { ActivityEntityType } from '../api/getEntityActivities'
import { ActivityDebugPage, type ActivityDebugLoadState } from './ActivityDebugPage'

describe('ActivityDebugPage', () => {
	it('为空闲、加载、空结果和失败状态提供可访问反馈', () => {
		const idle = renderActivityDebugPage({ loadState: { kind: 'idle' } })
		expect(screen.getByText('等待查询')).toBeInTheDocument()
		idle.unmount()

		const loading = renderActivityDebugPage({
			entityId: 'task-1',
			loadState: { kind: 'loading' },
		})
		expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true')
		loading.unmount()

		const empty = renderActivityDebugPage({
			entityId: 'task-1',
			loadState: { kind: 'ready', entries: [] },
		})
		expect(screen.getByRole('heading', { name: '暂无记录' })).toBeInTheDocument()
		empty.unmount()

		renderActivityDebugPage({
			entityId: 'task-1',
			loadState: { kind: 'error', message: '宿主读取失败' },
		})
		expect(screen.getByRole('alert')).toHaveTextContent('宿主读取失败')
	})

	it('使用可访问表单控件并转发输入与提交', () => {
		const onEntityIdChange = vi.fn()
		const onLimitChange = vi.fn()
		const onSubmit = vi.fn((event: FormEvent<HTMLFormElement>) => event.preventDefault())

		render(
			<ActivityDebugPage
				entityId='task-1'
				entityType='task'
				limit='50'
				loadState={{ kind: 'idle' }}
				onEntityIdChange={onEntityIdChange}
				onEntityTypeChange={() => undefined}
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

	it('查询成功后展示事件与字段变化', () => {
		renderActivityDebugPage({
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

		expect(screen.getByText('task.status.changed')).toBeInTheDocument()
		expect(screen.getByText('状态已经推进到进行中')).toBeInTheDocument()
		expect(screen.getByText('字段变化 (1)')).toBeInTheDocument()
		expect(screen.getByText('status')).toBeInTheDocument()
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
	const preventDefault = (event: FormEvent<HTMLFormElement>) => event.preventDefault()

	return render(
		<ActivityDebugPage
			entityId={entityId}
			entityType={entityType}
			limit={limit}
			loadState={loadState}
			onEntityIdChange={() => undefined}
			onEntityTypeChange={() => undefined}
			onLimitChange={() => undefined}
			onSubmit={preventDefault}
		/>,
	)
}

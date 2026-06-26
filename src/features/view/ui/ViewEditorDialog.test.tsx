/** @vitest-environment jsdom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { SubmitRegistryProvider, useSubmitRegistryContext } from '@/features/submit/model'
import type { View } from '@/shared/types'

import { ViewEditorDialog } from './ViewEditorDialog'

describe('ViewEditorDialog', () => {
	it('create 模式可以稳定渲染并注册 submit target', async () => {
		render(
			<SubmitRegistryProvider>
				<ViewEditorDialog
					isSubmitting={false}
					onClose={vi.fn()}
					onCreate={vi.fn(async () => undefined)}
					onUpdate={vi.fn(async () => undefined)}
					open
					projects={buildProjects()}
					view={null}
				/>
				<SubmitStateProbe />
			</SubmitRegistryProvider>,
		)

		expect(screen.getByRole('dialog', { name: '新建自定义视图' })).toBeInTheDocument()
		expect(screen.getByTestId('active-target')).toHaveTextContent('none')

		fireEvent.change(screen.getByLabelText('名称'), { target: { value: '我的视图' } })

		await waitFor(() => {
			expect(screen.getByTestId('active-target')).toHaveTextContent('view-editor:create')
		})
	})

	it('edit 模式会回填现有筛选并提交更新 payload', async () => {
		const onUpdate = vi.fn(async () => undefined)

		render(
			<SubmitRegistryProvider>
				<ViewEditorDialog
					isSubmitting={false}
					onClose={vi.fn()}
					onCreate={vi.fn(async () => undefined)}
					onUpdate={onUpdate}
					open
					projects={buildProjects()}
					view={buildView()}
				/>
			</SubmitRegistryProvider>,
		)

		expect(screen.getByDisplayValue('重点事项')).toBeInTheDocument()
		expect(screen.getByDisplayValue('只看高优先级')).toBeInTheDocument()

		fireEvent.click(screen.getByRole('button', { name: '待办' }))
		fireEvent.click(screen.getByRole('button', { name: '保存视图' }))

		await waitFor(() => expect(onUpdate).toHaveBeenCalledTimes(1))
		expect(onUpdate).toHaveBeenCalledWith(
			expect.objectContaining({
				viewId: 'view-1',
				name: '重点事项',
				sort: [{ field: 'priority', direction: 'asc' }],
			}),
		)
	})
})

function SubmitStateProbe() {
	const submitState = useSubmitRegistryContext()

	return <div data-testid='active-target'>{submitState.activeTarget?.id ?? 'none'}</div>
}

function buildProjects() {
	return [
		{ id: 'project-a', spaceId: 'space-a', name: '项目 A' },
		{ id: 'project-b', spaceId: 'space-a', name: '项目 B' },
	]
}

function buildView(): View {
	return {
		id: 'view-1',
		name: '重点事项',
		description: '只看高优先级',
		type: 'custom',
		entityType: 'task',
		key: null,
		filters: {
			status: ['todo', 'doing'],
			priority: { gte: 3 },
			inbox: false,
			project: { mode: 'specific', ids: ['project-a'] },
			due: { mode: 'today' },
			scheduled: { mode: 'future' },
			archived: false,
			deleted: false,
		},
		sort: [{ field: 'priority', direction: 'asc' }],
		groupBy: 'project',
		isVisible: true,
		sortOrder: 0,
		createdAt: '2026-06-18T00:00:00.000Z',
		updatedAt: '2026-06-18T00:00:00.000Z',
	}
}

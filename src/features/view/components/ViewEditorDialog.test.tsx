import { fireEvent, screen, waitFor } from '@testing-library/react'

import { SubmitRegistryProvider, useSubmitRegistryContext } from '@/features/submit'
import type { View } from '@/shared/types'
import { renderWithInteractionProviders as render } from '@/test/TestInteractionProviders'

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
		fireEvent.click(screen.getByRole('button', { name: '待办' }))
		fireEvent.click(screen.getByRole('button', { name: '保存视图' }))

		await waitFor(() => expect(onUpdate).toHaveBeenCalledTimes(1))
		expect(onUpdate).toHaveBeenCalledWith(
			expect.objectContaining({
				viewId: 'view-1',
				name: '重点事项',
				filters: expect.objectContaining({
					clauses: expect.any(Array),
				}),
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
		kind: 'custom',
		systemKey: null,
		scope: { type: 'all' },
		filters: {
			clauses: [
				{ id: '1', field: 'status', op: 'is', values: ['todo', 'doing'] },
				{ id: '2', field: 'priority', op: 'is', values: ['4', '3'] },
				{ id: '3', field: 'project', op: 'is', values: ['project-a'] },
				{ id: '4', field: 'due', op: 'is', values: ['today'] },
				{ id: '5', field: 'planned', op: 'is', values: ['tomorrow'] },
			],
		},
		position: 0,
		createdAt: '2026-06-18T00:00:00.000Z',
		updatedAt: '2026-06-18T00:00:00.000Z',
	}
}

import { act, fireEvent, render as renderComponent, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'

import { SubmitRegistryProvider, useSubmitRegistryContext } from '@/features/submit'
import type { View } from '@/shared/types'
import { TestInteractionProviders } from '@/test/TestInteractionProviders'

import type { ViewSaveFlow } from '../hooks/useViewSaveFlow'
import { ViewEditorDialog } from './ViewEditorDialog'
import { buildViewEditorDefaultValues, toCreateViewDraft } from './ViewEditorDialog.form'

describe('ViewEditorDialog', () => {
	it.each(['保存按钮', '名称输入'] as const)(
		'等待和失败保留%s焦点，使用 flow 错误与重试',
		async (entry) => {
			const flow = makeFlow()
			const onUpdate = vi.fn(async () => undefined)
			const view = buildView()
			const props = {
				view,
				projects: buildProjects(),
				onCreate: vi.fn(async () => undefined),
				onUpdate,
			}
			const { rerender } = render(<ViewEditorDialog {...props} flow={flow} />)
			const input = screen.getByRole('textbox', { name: '名称' })
			fireEvent.change(input, { target: { value: '需要保留的输入' } })
			const save = screen.getByRole('button', { name: '保存视图' })
			const focused = entry === '保存按钮' ? save : input
			await act(async () => focused.focus())
			rerender(<ViewEditorDialog {...props} flow={{ ...flow, pending: 'rename' }} />)
			expect(input).not.toBeDisabled()
			expect(input).toHaveAttribute('readonly')
			expect(save).not.toBeDisabled()
			expect(save).toHaveAttribute('aria-disabled', 'true')
			expect(focused).toHaveFocus()
			fireEvent.click(save)
			fireEvent.submit(input.closest('form')!)
			expect(onUpdate).not.toHaveBeenCalled()
			expect(screen.getByRole('button', { name: '取消' })).toBeEnabled()
			rerender(
				<ViewEditorDialog
					{...props}
					flow={{ ...flow, error: { kind: 'write', message: '请稍后重试' } }}
				/>,
			)
			expect(screen.getByRole('alert')).toHaveTextContent('请稍后重试')
			expect(focused).toHaveFocus()
			expect(input).toHaveValue('需要保留的输入')
			fireEvent.click(screen.getByRole('button', { name: '重试保存' }))
			await waitFor(() =>
				expect(onUpdate).toHaveBeenCalledExactlyOnceWith({
					viewId: view.id,
					name: '需要保留的输入',
				}),
			)
			expect(flow.close).not.toHaveBeenCalled()
		},
	)

	it('编辑与新建共用受控关闭，开启新 session 时重置草稿', async () => {
		const flow = makeFlow()
		const props = {
			view: buildView(),
			projects: buildProjects(),
			onCreate: vi.fn(async () => undefined),
			onUpdate: vi.fn(async () => undefined),
		}
		const { rerender } = render(<ViewEditorDialog {...props} flow={flow} />)
		await act(async () => {
			fireEvent.change(screen.getByRole('textbox', { name: '名称' }), {
				target: { value: '未提交的旧输入' },
			})
		})
		fireEvent.click(screen.getByRole('button', { name: '关闭保存视图编辑窗口' }))
		expect(flow.close).toHaveBeenCalledOnce()
		await act(async () =>
			rerender(<ViewEditorDialog {...props} flow={{ ...flow, sessionKey: 2 }} />),
		)
		expect(screen.getByRole('textbox', { name: '名称' })).toHaveValue('重点事项')
		fireEvent.click(screen.getByRole('button', { name: '取消' }))
		expect(flow.close).toHaveBeenCalledTimes(2)
		expect(props.onUpdate).not.toHaveBeenCalled()
	})

	it('创建失败保留草稿；已保存但打开失败时只有打开恢复，不再创建', async () => {
		const flow = makeFlow()
		const onCreate = vi.fn(async () => undefined)
		const props = {
			view: null,
			projects: buildProjects(),
			onCreate,
			onUpdate: vi.fn(async () => undefined),
		}
		const { rerender } = render(<ViewEditorDialog {...props} flow={flow} />)
		const name = screen.getByRole('textbox', { name: '名称' })
		fireEvent.change(name, { target: { value: '创建的视图' } })
		fireEvent.submit(name.closest('form')!)
		await waitFor(() => expect(onCreate).toHaveBeenCalledOnce())
		expect(onCreate).toHaveBeenCalledWith(
			expect.objectContaining({ name: '创建的视图', context: { kind: 'all' }, baseViewKey: 'all' }),
		)
		rerender(
			<ViewEditorDialog
				{...props}
				flow={{ ...flow, error: { kind: 'write', message: '创建暂时失败' } }}
			/>,
		)
		expect(name).toHaveValue('创建的视图')
		expect(screen.getByRole('alert')).toHaveTextContent('创建暂时失败')
		rerender(
			<ViewEditorDialog
				{...props}
				flow={{ ...flow, savedView: buildView(), error: { kind: 'open', message: '路由不可用' } }}
			/>,
		)
		expect(screen.getByRole('alert')).toHaveTextContent('已保存，但未能打开')
		expect(name).toHaveAttribute('readonly')
		fireEvent.click(screen.getByRole('button', { name: '打开已保存视图' }))
		await waitFor(() => expect(flow.retryOpen).toHaveBeenCalledOnce())
		expect(onCreate).toHaveBeenCalledOnce()
	})

	it('Tab 和 Shift+Tab 在弹窗首尾回绕，不触发提交或关闭', async () => {
		const flow = makeFlow()
		const onCreate = vi.fn(async () => undefined)
		render(
			<ViewEditorDialog
				flow={flow}
				onCreate={onCreate}
				onUpdate={vi.fn(async () => undefined)}
				projects={buildProjects()}
				view={null}
			/>,
		)
		const first = screen.getByRole('button', { name: '关闭保存视图编辑窗口' })
		const last = screen.getByRole('button', { name: '取消' })
		await act(async () => last.focus())
		fireEvent.keyDown(last, { key: 'Tab' })
		expect(first).toHaveFocus()
		fireEvent.keyDown(first, { key: 'Tab', shiftKey: true })
		expect(last).toHaveFocus()
		expect(flow.close).not.toHaveBeenCalled()
		expect(onCreate).not.toHaveBeenCalled()
	})

	it('create 模式注册 submit target；edit 只提交名称，不重写现有筛选', async () => {
		const flow = makeFlow()
		const onUpdate = vi.fn(async () => undefined)
		const props = {
			flow,
			onCreate: vi.fn(async () => undefined),
			onUpdate,
			projects: buildProjects(),
		}
		const { rerender } = render(
			<SubmitRegistryProvider>
				<ViewEditorDialog {...props} view={null} />
				<SubmitStateProbe />
			</SubmitRegistryProvider>,
		)
		expect(screen.getByTestId('active-target')).toHaveTextContent('none')
		fireEvent.change(screen.getByLabelText('名称'), { target: { value: '我的视图' } })
		await waitFor(() =>
			expect(screen.getByTestId('active-target')).toHaveTextContent('view-editor:create'),
		)
		rerender(
			<SubmitRegistryProvider>
				<ViewEditorDialog {...props} view={buildView()} />
				<SubmitStateProbe />
			</SubmitRegistryProvider>,
		)
		expect(screen.queryByRole('group', { name: '状态筛选' })).not.toBeInTheDocument()
		fireEvent.click(screen.getByRole('button', { name: '保存视图' }))
		await waitFor(() =>
			expect(onUpdate).toHaveBeenCalledExactlyOnceWith({ viewId: 'view-1', name: '重点事项' }),
		)
	})

	it('创建时把独立事项或项目写入不可移除 context', () => {
		const values = buildViewEditorDefaultValues(null)
		const standalone = toCreateViewDraft({ ...values, name: '独立事项', projectMode: 'none' })
		const project = toCreateViewDraft({
			...values,
			name: '项目事项',
			projectMode: 'specific',
			specificProjectId: 'project-a',
		})

		expect(standalone.context).toEqual({ kind: 'standalone' })
		expect(project.context).toEqual({ kind: 'project', projectId: 'project-a' })
		expect(standalone.filters.clauses).not.toEqual(
			expect.arrayContaining([expect.objectContaining({ field: 'project' })]),
		)
		expect(project.filters.clauses).not.toEqual(
			expect.arrayContaining([expect.objectContaining({ field: 'project' })]),
		)
	})

	it('创建时把未来日期无损映射为 future', () => {
		const draft = toCreateViewDraft({
			...buildViewEditorDefaultValues(null),
			name: '未来事项',
			dueMode: 'future',
			plannedMode: 'future',
		})

		expect(draft.filters.clauses).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ field: 'due', values: ['future'] }),
				expect.objectContaining({ field: 'planned', values: ['future'] }),
			]),
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
		scope: { type: 'all' },
		context: { kind: 'all' },
		baseViewKey: 'active',
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

function makeFlow(): ViewSaveFlow {
	return {
		open: true,
		sessionKey: 1,
		pending: null,
		error: null,
		savedView: null,
		begin: vi.fn(),
		close: vi.fn(),
		submit: vi.fn(async () => undefined),
		retryOpen: vi.fn(async () => undefined),
	}
}

function render(node: ReactNode) {
	return renderComponent(node, { wrapper: TestInteractionProviders })
}

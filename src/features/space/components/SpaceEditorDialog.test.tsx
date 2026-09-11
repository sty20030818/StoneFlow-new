import { act, fireEvent, render as renderBase, screen, waitFor } from '@testing-library/react'
import { useMemo, useState } from 'react'

import {
	SubmitRegistryProvider,
	useRegisterSubmitTarget,
	useSubmitRegistryContext,
} from '@/features/submit'
import type { Space } from '@/shared/types'
import {
	renderWithInteractionProviders as render,
	TestInteractionProviders,
} from '@/test/TestInteractionProviders'
import { SpaceEditorDialog } from './SpaceEditorDialog'

const SPACE_FIXTURE = {
	id: 'space-1',
	name: '个人',
	iconKey: 'user',
	colorKey: 'blue',
	isDefault: true,
	position: 100,
	archivedAt: null,
	deletedAt: null,
	createdAt: '2026-04-30T00:00:00.000Z',
	updatedAt: '2026-04-30T00:00:00.000Z',
} satisfies Space

describe('SpaceEditorDialog', () => {
	it('Tab 和 Shift+Tab 在弹窗首尾回绕，不触发提交或关闭', async () => {
		const onClose = vi.fn()
		const onSubmit = vi.fn(async () => undefined)
		render(<SpaceEditorDialog mode='create' open onClose={onClose} onSubmit={onSubmit} />)
		const first = screen.getByRole('button', { name: '关闭 Space 编辑窗口' })
		const last = screen.getByRole('button', { name: '取消' })
		await act(async () => last.focus())
		fireEvent.keyDown(last, { key: 'Tab' })
		expect(first).toHaveFocus()
		fireEvent.keyDown(first, { key: 'Tab', shiftKey: true })
		expect(last).toHaveFocus()
		expect(onClose).not.toHaveBeenCalled()
		expect(onSubmit).not.toHaveBeenCalled()
	})

	it('新建弹窗可以稳定渲染', () => {
		render(
			<SpaceEditorDialog
				mode='create'
				open
				onClose={() => undefined}
				onSubmit={async () => undefined}
			/>,
		)

		expect(screen.getByRole('dialog', { name: '新建 Space' })).toBeInTheDocument()
		expect(screen.getByRole('button', { name: /图标/ })).toBeInTheDocument()
		expect(screen.getByRole('listbox', { name: '颜色' })).toBeInTheDocument()
		expect(
			screen.getAllByRole('option').map((option) => option.getAttribute('aria-label')),
		).toEqual(['蓝色', '绿色', '琥珀', '玫红', '石板灰'])
		expect(screen.getByRole('option', { name: '蓝色' })).toHaveAttribute('aria-selected', 'true')
		const body = screen.getByRole('dialog').querySelector('.modal__body')
		expect(body?.children[1]).toHaveClass('mt-4')
		expect(body?.children[2]).toHaveClass('mt-4')
	})

	it('编辑弹窗可以稳定渲染', async () => {
		render(
			<SpaceEditorDialog
				mode='edit'
				open
				space={{ ...SPACE_FIXTURE, colorKey: 'rose' }}
				onClose={() => undefined}
				onSubmit={async () => undefined}
			/>,
		)

		expect(screen.getByRole('dialog', { name: '编辑 Space' })).toBeInTheDocument()
		expect(await screen.findByRole('textbox', { name: '名称' })).toHaveValue('个人')
		expect(screen.getByRole('option', { name: '玫红' })).toHaveAttribute('aria-selected', 'true')
	})

	it.each(['create', 'edit'] as const)('%s 模式的右上关闭入口只关闭，不提交草稿', async (mode) => {
		const onClose = vi.fn()
		const onSubmit = vi.fn(async () => undefined)
		render(
			<SpaceEditorDialog
				mode={mode}
				onClose={onClose}
				onSubmit={onSubmit}
				open
				space={mode === 'edit' ? SPACE_FIXTURE : null}
			/>,
		)
		await act(async () => {
			fireEvent.change(screen.getByRole('textbox', { name: '名称' }), {
				target: { value: '未提交的空间' },
			})
		})

		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: '关闭 Space 编辑窗口' }))
		})

		expect(onClose).toHaveBeenCalledTimes(1)
		expect(onSubmit).not.toHaveBeenCalled()
	})

	it('保存中关闭入口与取消一起禁用，失败后保留错误并恢复关闭', async () => {
		const pendingSubmit = Promise.withResolvers<void>()
		const onClose = vi.fn()
		render(
			<SpaceEditorDialog
				mode='edit'
				onClose={onClose}
				onSubmit={() => pendingSubmit.promise}
				open
				space={SPACE_FIXTURE}
			/>,
		)
		fireEvent.click(screen.getByRole('button', { name: '保存变更' }))

		await waitFor(() =>
			expect(screen.getByRole('button', { name: '关闭 Space 编辑窗口' })).toBeDisabled(),
		)
		expect(screen.getByRole('button', { name: '取消' })).toBeDisabled()
		fireEvent.click(screen.getByRole('button', { name: '关闭 Space 编辑窗口' }))
		expect(onClose).not.toHaveBeenCalled()
		act(() => screen.getByRole('group', { name: '关闭' }).focus())
		expect(await screen.findByRole('tooltip')).toHaveTextContent('正在保存，请稍后关闭')

		await act(async () => pendingSubmit.reject(new Error('保存连接失败')))
		expect(screen.getByRole('alert')).toHaveTextContent('保存连接失败')
		const closeButton = screen.getByRole('button', { name: '关闭 Space 编辑窗口' })
		expect(closeButton).toBeEnabled()
		fireEvent.click(closeButton)
		expect(onClose).toHaveBeenCalledTimes(1)
	})

	it('键盘选择颜色后只提交对应 colorKey', async () => {
		const onSubmit = vi.fn(async () => undefined)
		render(<SpaceEditorDialog mode='create' open onClose={() => undefined} onSubmit={onSubmit} />)

		fireEvent.change(screen.getByRole('textbox', { name: '名称' }), {
			target: { value: '工作' },
		})
		const slateOption = screen.getByRole('option', { name: '石板灰' })
		act(() => slateOption.focus())
		expect(slateOption).toHaveFocus()
		fireEvent.keyDown(slateOption, { key: 'Enter' })
		fireEvent.keyUp(slateOption, { key: 'Enter' })

		await waitFor(() => expect(slateOption).toHaveAttribute('aria-selected', 'true'))
		fireEvent.click(screen.getByRole('button', { name: '创建 Space' }))

		await waitFor(() =>
			expect(onSubmit).toHaveBeenCalledWith({
				name: '工作',
				iconKey: 'user',
				colorKey: 'slate',
			}),
		)
	})

	it('同一编辑会话保留草稿，重开或切换 Space 时重置字段但不重建外层 Backdrop', async () => {
		const props = {
			mode: 'edit' as const,
			onClose: vi.fn(),
			onSubmit: vi.fn(async () => undefined),
		}
		const view = renderBase(<SpaceEditorDialog {...props} open space={SPACE_FIXTURE} />, {
			wrapper: TestInteractionProviders,
		})
		const backdrop = screen.getByRole('dialog').closest('.modal__backdrop')
		expect(backdrop).not.toBeNull()
		fireEvent.change(screen.getByRole('textbox', { name: '名称' }), {
			target: { value: '未保存草稿' },
		})
		view.rerender(<SpaceEditorDialog {...props} open space={SPACE_FIXTURE} />)
		expect(screen.getByRole('textbox', { name: '名称' })).toHaveValue('未保存草稿')

		const nextSpace = { ...SPACE_FIXTURE, id: 'space-2', name: '工作', colorKey: 'green' }
		view.rerender(<SpaceEditorDialog {...props} open space={nextSpace} />)
		expect(screen.getByRole('textbox', { name: '名称' })).toHaveValue('工作')
		expect(screen.getByRole('option', { name: '绿色' })).toHaveAttribute('aria-selected', 'true')
		expect(screen.getByRole('dialog').closest('.modal__backdrop')).toBe(backdrop)

		fireEvent.change(screen.getByRole('textbox', { name: '名称' }), {
			target: { value: '另一份草稿' },
		})
		view.rerender(<SpaceEditorDialog {...props} open={false} space={nextSpace} />)
		view.rerender(<SpaceEditorDialog {...props} open space={nextSpace} />)
		await waitFor(() => expect(screen.getByRole('textbox', { name: '名称' })).toHaveValue('工作'))
	})

	it('未知持久化颜色使用蓝色回退且不会提交非法 key', async () => {
		const onSubmit = vi.fn(async () => undefined)
		render(
			<SpaceEditorDialog
				mode='edit'
				open
				space={{ ...SPACE_FIXTURE, colorKey: 'legacy-color' }}
				onClose={() => undefined}
				onSubmit={onSubmit}
			/>,
		)

		expect(screen.getByRole('option', { name: '蓝色' })).toHaveAttribute('aria-selected', 'true')
		fireEvent.click(screen.getByRole('button', { name: '保存变更' }))

		await waitFor(() =>
			expect(onSubmit).toHaveBeenCalledWith({
				name: '个人',
				iconKey: 'user',
				colorKey: 'blue',
			}),
		)
	})

	it('在提交注册上下文中输入名称时不会触发无限更新', async () => {
		render(
			<SubmitRegistryProvider>
				<SpaceEditorDialog
					mode='create'
					open
					onClose={() => undefined}
					onSubmit={async () => undefined}
				/>
			</SubmitRegistryProvider>,
		)

		const input = screen.getByLabelText('名称')
		fireEvent.change(input, { target: { value: '工作' } })

		await waitFor(() => {
			expect(input).toHaveValue('工作')
			expect(screen.getByText('工作', { selector: 'p' })).toBeInTheDocument()
		})
	})

	it('提交注册目标更新时不会反复抖动 active target', () => {
		render(
			<SubmitRegistryProvider>
				<SubmitTargetProbe />
			</SubmitRegistryProvider>,
		)

		fireEvent.change(screen.getByLabelText('probe-input'), { target: { value: 'A' } })
		fireEvent.change(screen.getByLabelText('probe-input'), { target: { value: 'AB' } })

		expect(screen.getByTestId('active-target')).toHaveTextContent('probe-target')
		expect(screen.getByLabelText('probe-input')).toHaveValue('AB')
	})
})

function SubmitTargetProbe() {
	const [value, setValue] = useState('')
	const submitState = useSubmitRegistryContext()
	const target = useMemo(
		() => ({
			id: 'probe-target',
			title: 'Probe',
			priority: 100,
			canSubmit: value.trim().length > 0,
			submit: async () => undefined,
			context: { source: 'space-editor' as const },
		}),
		[value],
	)

	useRegisterSubmitTarget(target)

	return (
		<div>
			<input
				aria-label='probe-input'
				onChange={(event) => setValue(event.currentTarget.value)}
				value={value}
			/>
			<div data-testid='active-target'>{submitState.activeTarget?.id ?? 'none'}</div>
		</div>
	)
}

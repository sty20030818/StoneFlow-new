import { act, fireEvent, render as renderComponent, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'

import { SubmitRegistryProvider, useSubmitRegistryActions } from '@/features/submit'
import type { View } from '@/shared/types'
import { TestInteractionProviders } from '@/test/TestInteractionProviders'

import type { ViewSaveFlow } from '../hooks/useViewSaveFlow'
import { ViewSaveDialog } from './ViewSaveDialog'

it('保存提交名称快照，覆盖不需要名称；关闭委托 flow', async () => {
	const flow = makeFlow()
	const onSave = vi.fn(async () => undefined)
	const { rerender } = render(<ViewSaveDialog canOverwrite flow={flow} onSave={onSave} />)
	const name = screen.getByRole('textbox', { name: '视图名称' })
	fireEvent.change(name, { target: { value: '  高优先级任务  ' } })
	fireEvent.submit(name.closest('form')!)
	await waitFor(() => expect(onSave).toHaveBeenCalledWith({ mode: 'create', name: '高优先级任务' }))
	fireEvent.click(screen.getByRole('button', { name: '覆盖当前' }))
	expect(onSave).toHaveBeenLastCalledWith({ mode: 'overwrite' })
	fireEvent.click(screen.getByRole('button', { name: '关闭保存视图' }))
	expect(flow.close).toHaveBeenCalledOnce()
	rerender(<ViewSaveDialog canOverwrite flow={{ ...flow, open: false }} onSave={onSave} />)
	await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
})

it.each(['名称输入', '保存按钮'] as const)(
	'等待与失败保留%s焦点、名称和重试入口',
	async (entry) => {
		const flow = makeFlow()
		const onSave = vi.fn(async () => undefined)
		const { rerender } = render(<ViewSaveDialog canOverwrite flow={flow} onSave={onSave} />)
		const name = screen.getByRole('textbox', { name: '视图名称' })
		fireEvent.change(name, { target: { value: '需要保留的长名称' } })
		const save = screen.getByRole('button', { name: '另存为' })
		const focused = entry === '名称输入' ? name : save
		await act(async () => focused.focus())
		rerender(<ViewSaveDialog canOverwrite flow={{ ...flow, pending: 'create' }} onSave={onSave} />)
		expect(focused).toHaveFocus()
		expect(name).toHaveAttribute('readonly')
		expect(name).not.toBeDisabled()
		expect(save).not.toBeDisabled()
		expect(save).toHaveAttribute('aria-disabled', 'true')
		fireEvent.submit(name.closest('form')!)
		fireEvent.click(save)
		expect(onSave).not.toHaveBeenCalled()
		expect(screen.getByRole('button', { name: '取消' })).toBeEnabled()
		rerender(
			<ViewSaveDialog
				canOverwrite
				flow={{ ...flow, error: { kind: 'write', message: '写入失败，请重试' } }}
				onSave={onSave}
			/>,
		)
		expect(focused).toHaveFocus()
		expect(screen.getByRole('alert')).toHaveTextContent('写入失败，请重试')
		expect(name).toHaveValue('需要保留的长名称')
		fireEvent.click(screen.getByRole('button', { name: '重试保存' }))
		expect(onSave).toHaveBeenCalledExactlyOnceWith({ mode: 'create', name: '需要保留的长名称' })
	},
)

it('已保存但打开失败时只重试打开，不重新写入；新会话清空旧名称和错误', async () => {
	const onSave = vi.fn(async () => undefined)
	const flow = makeFlow()
	const { rerender } = render(<ViewSaveDialog canOverwrite flow={flow} onSave={onSave} />)
	const name = screen.getByRole('textbox', { name: '视图名称' })
	fireEvent.change(name, { target: { value: '已经提交的名称' } })
	rerender(
		<ViewSaveDialog
			canOverwrite
			flow={{ ...flow, savedView: savedView(), error: { kind: 'open', message: '导航暂时不可用' } }}
			onSave={onSave}
		/>,
	)
	expect(screen.getByRole('alert')).toHaveTextContent('已保存，但未能打开')
	expect(name).toHaveAttribute('readonly')
	expect(screen.queryByRole('button', { name: /覆盖/ })).not.toBeInTheDocument()
	fireEvent.submit(name.closest('form')!)
	await waitFor(() => expect(flow.retryOpen).toHaveBeenCalledOnce())
	expect(onSave).not.toHaveBeenCalled()
	rerender(<ViewSaveDialog canOverwrite flow={{ ...flow, sessionKey: 2 }} onSave={onSave} />)
	expect(screen.getByRole('textbox', { name: '视图名称' })).toHaveValue('')
	expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})

it('覆盖写入转为打开恢复时保留原按钮焦点，重试只打开', async () => {
	const flow = makeFlow()
	const onSave = vi.fn(async () => undefined)
	const { rerender } = render(<ViewSaveDialog canOverwrite flow={flow} onSave={onSave} />)
	const overwrite = screen.getByRole('button', { name: '覆盖当前' })
	await act(async () => overwrite.focus())
	fireEvent.click(overwrite)
	expect(onSave).toHaveBeenCalledExactlyOnceWith({ mode: 'overwrite' })
	rerender(<ViewSaveDialog canOverwrite flow={{ ...flow, pending: 'overwrite' }} onSave={onSave} />)
	expect(overwrite).toHaveFocus()
	const saved = savedView()
	rerender(
		<ViewSaveDialog
			canOverwrite
			flow={{ ...flow, pending: 'open', savedView: saved }}
			onSave={onSave}
		/>,
	)
	expect(overwrite).toHaveFocus()
	expect(overwrite).toHaveAccessibleName('打开已保存视图')
	expect(overwrite).not.toBeDisabled()
	expect(overwrite).toHaveAttribute('aria-disabled', 'true')
	rerender(
		<ViewSaveDialog
			canOverwrite
			flow={{ ...flow, savedView: saved, error: { kind: 'open', message: '导航失败' } }}
			onSave={onSave}
		/>,
	)
	expect(overwrite).toHaveFocus()
	fireEvent.click(overwrite)
	await waitFor(() => expect(flow.retryOpen).toHaveBeenCalledOnce())
	expect(onSave).toHaveBeenCalledOnce()
})

it('保存与打开恢复均接入现有 SubmitRegistry 快捷提交', async () => {
	const flow = makeFlow()
	const onSave = vi.fn(async () => undefined)
	const { rerender } = render(
		<SubmitRegistryProvider>
			<ViewSaveDialog canOverwrite={false} flow={flow} onSave={onSave} />
			<SubmitProbe />
		</SubmitRegistryProvider>,
	)
	fireEvent.change(screen.getByRole('textbox', { name: '视图名称' }), {
		target: { value: '快捷提交' },
	})
	fireEvent.click(screen.getByRole('button', { name: '调用提交命令', hidden: true }))
	await waitFor(() =>
		expect(onSave).toHaveBeenCalledExactlyOnceWith({ mode: 'create', name: '快捷提交' }),
	)
	rerender(
		<SubmitRegistryProvider>
			<ViewSaveDialog
				canOverwrite={false}
				flow={{ ...flow, savedView: savedView() }}
				onSave={onSave}
			/>
			<SubmitProbe />
		</SubmitRegistryProvider>,
	)
	fireEvent.click(screen.getByRole('button', { name: '调用提交命令', hidden: true }))
	await waitFor(() => expect(flow.retryOpen).toHaveBeenCalledOnce())
	expect(onSave).toHaveBeenCalledOnce()
})

function SubmitProbe() {
	const { submitActiveTarget } = useSubmitRegistryActions()
	return (
		<button type='button' onClick={() => void submitActiveTarget()}>
			调用提交命令
		</button>
	)
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

function savedView(): View {
	return {
		id: 'saved-1',
		name: '已保存',
		scope: { type: 'all' },
		context: { kind: 'all' },
		baseViewKey: 'active',
		filters: { clauses: [] },
		position: 0,
		createdAt: '',
		updatedAt: '',
	}
}

function render(node: ReactNode) {
	return renderComponent(node, { wrapper: TestInteractionProviders })
}
